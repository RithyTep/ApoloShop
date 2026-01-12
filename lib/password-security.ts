/**
 * Password Security Module
 *
 * Implements OWASP recommended password practices:
 * - Strong password requirements (8+ chars, uppercase, lowercase, number, special char)
 * - bcrypt with cost factor 12
 * - Password history check (prevent reuse of last 5 passwords)
 * - Password expiry detection (90-day reminder)
 * - Real-time password strength calculation
 */

import bcrypt from "bcryptjs"

// Configuration
export const PASSWORD_CONFIG = {
  minLength: 8,
  maxLength: 128,
  bcryptCostFactor: 12,
  historyCount: 5,
  expiryDays: 90,
  expiryWarningDays: 14, // Warn 14 days before expiry
} as const

// Password requirements
export interface PasswordRequirement {
  id: string
  label: string
  labelKh: string
  test: (password: string) => boolean
}

export const passwordRequirements: PasswordRequirement[] = [
  {
    id: "length",
    label: "At least 8 characters",
    labelKh: "យ៉ាងហោចណាស់ 8 តួអក្សរ",
    test: (password) => password.length >= PASSWORD_CONFIG.minLength,
  },
  {
    id: "uppercase",
    label: "One uppercase letter (A-Z)",
    labelKh: "អក្សរធំមួយ (A-Z)",
    test: (password) => /[A-Z]/.test(password),
  },
  {
    id: "lowercase",
    label: "One lowercase letter (a-z)",
    labelKh: "អក្សរតូចមួយ (a-z)",
    test: (password) => /[a-z]/.test(password),
  },
  {
    id: "number",
    label: "One number (0-9)",
    labelKh: "លេខមួយ (0-9)",
    test: (password) => /[0-9]/.test(password),
  },
  {
    id: "special",
    label: "One special character (!@#$%^&*)",
    labelKh: "តួអក្សរពិសេសមួយ (!@#$%^&*)",
    test: (password) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password),
  },
]

// Validation result
export interface PasswordValidationResult {
  isValid: boolean
  errors: string[]
  requirements: {
    id: string
    met: boolean
    label: string
  }[]
  strength: PasswordStrength
}

// Password strength levels
export type PasswordStrengthLevel = "weak" | "fair" | "good" | "strong"

export interface PasswordStrength {
  level: PasswordStrengthLevel
  score: number // 0-100
  label: string
  labelKh: string
}

/**
 * Calculate password strength based on requirements met and additional factors
 */
export function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { level: "weak", score: 0, label: "Too weak", labelKh: "ខ្សោយពេក" }
  }

  let score = 0

  // Base score from requirements
  const requirementsMet = passwordRequirements.filter((req) => req.test(password))
  score += requirementsMet.length * 15 // 0-75 points

  // Bonus for extra length
  if (password.length >= 12) score += 10
  if (password.length >= 16) score += 10

  // Bonus for variety of special characters
  const specialChars = password.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/g)
  if (specialChars && specialChars.length >= 2) score += 5

  // Penalty for common patterns
  const commonPatterns = [
    /^123/,
    /password/i,
    /qwerty/i,
    /abc123/i,
    /(.)\1{2,}/, // Repeated characters (aaa, 111)
    /^[a-z]+\d+$/i, // Simple word + numbers
  ]
  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      score -= 10
    }
  }

  // Ensure score is within bounds
  score = Math.max(0, Math.min(100, score))

  // Determine level
  let level: PasswordStrengthLevel
  let label: string
  let labelKh: string

  if (score < 30) {
    level = "weak"
    label = "Weak"
    labelKh = "ខ្សោយ"
  } else if (score < 50) {
    level = "fair"
    label = "Fair"
    labelKh = "មធ្យម"
  } else if (score < 75) {
    level = "good"
    label = "Good"
    labelKh = "ល្អ"
  } else {
    level = "strong"
    label = "Strong"
    labelKh = "រឹងមាំ"
  }

  return { level, score, label, labelKh }
}

/**
 * Validate password against all requirements
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = []
  const requirements = passwordRequirements.map((req) => ({
    id: req.id,
    met: req.test(password),
    label: req.label,
  }))

  // Check minimum length
  if (password.length < PASSWORD_CONFIG.minLength) {
    errors.push(`Password must be at least ${PASSWORD_CONFIG.minLength} characters`)
  }

  // Check maximum length
  if (password.length > PASSWORD_CONFIG.maxLength) {
    errors.push(`Password must not exceed ${PASSWORD_CONFIG.maxLength} characters`)
  }

  // Check each requirement
  for (const req of passwordRequirements) {
    if (!req.test(password)) {
      errors.push(req.label)
    }
  }

  const strength = calculatePasswordStrength(password)
  const isValid = errors.length === 0

  return {
    isValid,
    errors,
    requirements,
    strength,
  }
}

/**
 * Hash password using bcrypt with cost factor 12
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, PASSWORD_CONFIG.bcryptCostFactor)
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Check if password matches any hash in history
 */
export async function isPasswordInHistory(
  password: string,
  passwordHashes: string[]
): Promise<boolean> {
  for (const hash of passwordHashes) {
    const matches = await bcrypt.compare(password, hash)
    if (matches) {
      return true
    }
  }
  return false
}

/**
 * Check if password is expired (older than 90 days)
 */
export function isPasswordExpired(passwordChangedAt: Date | null): boolean {
  if (!passwordChangedAt) {
    return false // No expiry for accounts without password change date
  }
  const expiryDate = new Date(passwordChangedAt)
  expiryDate.setDate(expiryDate.getDate() + PASSWORD_CONFIG.expiryDays)
  return new Date() > expiryDate
}

/**
 * Check if password expiry warning should be shown
 */
export function shouldShowExpiryWarning(
  passwordChangedAt: Date | null
): { show: boolean; daysRemaining: number } {
  if (!passwordChangedAt) {
    return { show: false, daysRemaining: PASSWORD_CONFIG.expiryDays }
  }

  const expiryDate = new Date(passwordChangedAt)
  expiryDate.setDate(expiryDate.getDate() + PASSWORD_CONFIG.expiryDays)

  const now = new Date()
  const daysRemaining = Math.ceil(
    (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  )

  const show = daysRemaining <= PASSWORD_CONFIG.expiryWarningDays && daysRemaining > 0

  return { show, daysRemaining: Math.max(0, daysRemaining) }
}

/**
 * Get password age in days
 */
export function getPasswordAge(passwordChangedAt: Date | null): number {
  if (!passwordChangedAt) {
    return 0
  }
  const now = new Date()
  return Math.floor(
    (now.getTime() - new Date(passwordChangedAt).getTime()) / (1000 * 60 * 60 * 24)
  )
}

/**
 * Format password requirements for API error response
 */
export function formatPasswordRequirementsError(): string {
  return (
    "Password must contain: " +
    passwordRequirements.map((r) => r.label.toLowerCase()).join(", ")
  )
}

// Zod schema helpers for consistent validation
export const passwordSchema = {
  minLength: PASSWORD_CONFIG.minLength,
  maxLength: PASSWORD_CONFIG.maxLength,
  regex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~])/,
  message: formatPasswordRequirementsError(),
}
