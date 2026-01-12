/**
 * Password Reset Service
 *
 * Implements secure password reset flow:
 * - Time-limited reset tokens (1 hour expiry)
 * - Rate limiting (3 requests per hour per email)
 * - Token invalidation after use
 * - Email notifications
 */

import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { sendEmailNotification } from "@/lib/notification-service"
import {
  hashPassword,
  validatePassword,
  isPasswordInHistory,
  PASSWORD_CONFIG,
} from "@/lib/password-security"

// Configuration
export const RESET_CONFIG = {
  tokenExpiryMinutes: 60, // 1 hour
  maxRequestsPerHour: 3, // Rate limit
  tokenLength: 32, // Bytes of randomness
  minTimeBetweenRequests: 60, // 1 minute cooldown
} as const

// Types
export interface PasswordResetResult {
  success: boolean
  message: string
  error?: string
}

export interface ResetTokenValidation {
  valid: boolean
  userId?: string
  email?: string
  error?: string
  errorCode?: "TOKEN_EXPIRED" | "TOKEN_INVALID" | "TOKEN_USED" | "TOKEN_NOT_FOUND"
}

/**
 * Generate a secure random token
 */
function generateResetToken(): string {
  return crypto.randomBytes(RESET_CONFIG.tokenLength).toString("hex")
}

/**
 * Hash a reset token for storage
 */
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex")
}

/**
 * Check rate limit for password reset requests
 */
export async function checkResetRateLimit(email: string): Promise<{
  allowed: boolean
  remainingRequests: number
  retryAfterMinutes?: number
}> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

  // Get user by email
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true },
  })

  if (!user) {
    // User not found - don't reveal this, just pretend rate limit is fine
    return { allowed: true, remainingRequests: RESET_CONFIG.maxRequestsPerHour }
  }

  // Count recent reset requests
  const recentRequests = await prisma.passwordResetToken.count({
    where: {
      userId: user.id,
      createdAt: { gte: oneHourAgo },
    },
  })

  const remainingRequests = RESET_CONFIG.maxRequestsPerHour - recentRequests

  if (remainingRequests <= 0) {
    // Find the oldest recent request to calculate retry time
    const oldestRequest = await prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        createdAt: { gte: oneHourAgo },
      },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    })

    const retryAfterMinutes = oldestRequest
      ? Math.ceil((oldestRequest.createdAt.getTime() + 60 * 60 * 1000 - Date.now()) / 60000)
      : 60

    return {
      allowed: false,
      remainingRequests: 0,
      retryAfterMinutes,
    }
  }

  // Check minimum time between requests (cooldown)
  const minTimeBetweenMs = RESET_CONFIG.minTimeBetweenRequests * 1000
  const mostRecentRequest = await prisma.passwordResetToken.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  })

  if (mostRecentRequest) {
    const timeSinceLast = Date.now() - mostRecentRequest.createdAt.getTime()
    if (timeSinceLast < minTimeBetweenMs) {
      const retryAfterSeconds = Math.ceil((minTimeBetweenMs - timeSinceLast) / 1000)
      return {
        allowed: false,
        remainingRequests,
        retryAfterMinutes: Math.ceil(retryAfterSeconds / 60),
      }
    }
  }

  return { allowed: true, remainingRequests }
}

/**
 * Request a password reset
 * Generates a token and sends email
 */
export async function requestPasswordReset(
  email: string,
  ipAddress?: string,
  userAgent?: string
): Promise<PasswordResetResult> {
  const normalizedEmail = email.toLowerCase().trim()

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, name: true, email: true, isActive: true },
  })

  // Always return success to prevent email enumeration
  // But only actually send email if user exists
  if (!user) {
    console.log(`[PasswordReset] Reset requested for non-existent email: ${normalizedEmail}`)
    return {
      success: true,
      message: "If an account exists with this email, you will receive a password reset link.",
    }
  }

  if (!user.isActive) {
    console.log(`[PasswordReset] Reset requested for inactive account: ${normalizedEmail}`)
    return {
      success: true,
      message: "If an account exists with this email, you will receive a password reset link.",
    }
  }

  // Check rate limit
  const rateLimit = await checkResetRateLimit(normalizedEmail)
  if (!rateLimit.allowed) {
    console.log(`[PasswordReset] Rate limit exceeded for: ${normalizedEmail}`)
    return {
      success: false,
      message: `Too many reset requests. Please try again in ${rateLimit.retryAfterMinutes} minutes.`,
      error: "RATE_LIMIT_EXCEEDED",
    }
  }

  // Invalidate any existing unused tokens
  await prisma.passwordResetToken.updateMany({
    where: {
      userId: user.id,
      usedAt: null,
    },
    data: {
      usedAt: new Date(), // Mark as "used" to invalidate
    },
  })

  // Generate new token
  const rawToken = generateResetToken()
  const hashedToken = hashToken(rawToken)
  const expiresAt = new Date(Date.now() + RESET_CONFIG.tokenExpiryMinutes * 60 * 1000)

  // Store token
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token: hashedToken,
      expiresAt,
      ipAddress,
      userAgent,
    },
  })

  // Generate reset URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`

  // Send email
  const emailSubject = "Password Reset Request"
  const emailMessage = `Hello ${user.name},

You requested to reset your password for your ApoloShop account.

Click the link below to reset your password:
${resetUrl}

This link will expire in ${RESET_CONFIG.tokenExpiryMinutes} minutes.

If you didn't request this password reset, please ignore this email or contact our support team if you have concerns about your account security.

Best regards,
ApoloShop Security Team`

  // Send email (fire and forget)
  sendEmailNotification(user.email, emailSubject, emailMessage).catch((error) => {
    console.error("[PasswordReset] Failed to send reset email:", error)
  })

  console.log(`[PasswordReset] Reset token generated for: ${normalizedEmail}`)

  return {
    success: true,
    message: "If an account exists with this email, you will receive a password reset link.",
  }
}

/**
 * Validate a password reset token
 */
export async function validateResetToken(token: string): Promise<ResetTokenValidation> {
  const hashedToken = hashToken(token)

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token: hashedToken },
    include: {
      user: {
        select: { id: true, email: true, isActive: true },
      },
    },
  })

  if (!resetToken) {
    return {
      valid: false,
      error: "Invalid or expired reset link.",
      errorCode: "TOKEN_NOT_FOUND",
    }
  }

  if (resetToken.usedAt) {
    return {
      valid: false,
      error: "This reset link has already been used.",
      errorCode: "TOKEN_USED",
    }
  }

  if (resetToken.expiresAt < new Date()) {
    return {
      valid: false,
      error: "This reset link has expired. Please request a new one.",
      errorCode: "TOKEN_EXPIRED",
    }
  }

  if (!resetToken.user.isActive) {
    return {
      valid: false,
      error: "This account is no longer active.",
      errorCode: "TOKEN_INVALID",
    }
  }

  return {
    valid: true,
    userId: resetToken.userId,
    email: resetToken.user.email,
  }
}

/**
 * Reset password using a valid token
 */
export async function resetPassword(
  token: string,
  newPassword: string,
  ipAddress?: string
): Promise<PasswordResetResult> {
  // Validate the token
  const validation = await validateResetToken(token)
  if (!validation.valid || !validation.userId) {
    return {
      success: false,
      message: validation.error || "Invalid reset token.",
      error: validation.errorCode,
    }
  }

  // Validate new password strength
  const passwordValidation = validatePassword(newPassword)
  if (!passwordValidation.isValid) {
    return {
      success: false,
      message: "Password does not meet requirements: " + passwordValidation.errors.join(", "),
      error: "INVALID_PASSWORD",
    }
  }

  // Get user's password history
  const passwordHistory = await prisma.passwordHistory.findMany({
    where: { userId: validation.userId },
    orderBy: { createdAt: "desc" },
    take: PASSWORD_CONFIG.historyCount,
    select: { passwordHash: true },
  })

  // Check if password was used before
  const passwordHashes = passwordHistory.map((h) => h.passwordHash)
  if (passwordHashes.length > 0) {
    const isReused = await isPasswordInHistory(newPassword, passwordHashes)
    if (isReused) {
      return {
        success: false,
        message: `You cannot reuse your last ${PASSWORD_CONFIG.historyCount} passwords.`,
        error: "PASSWORD_REUSED",
      }
    }
  }

  // Hash the new password
  const newPasswordHash = await hashPassword(newPassword)
  const hashedToken = hashToken(token)

  // Update password and mark token as used in a transaction
  await prisma.$transaction(async (tx) => {
    // Get current password hash for history
    const currentUser = await tx.user.findUnique({
      where: { id: validation.userId },
      select: { passwordHash: true },
    })

    // Update user password
    await tx.user.update({
      where: { id: validation.userId },
      data: {
        passwordHash: newPasswordHash,
        passwordChangedAt: new Date(),
      },
    })

    // Add old password to history
    if (currentUser?.passwordHash) {
      await tx.passwordHistory.create({
        data: {
          userId: validation.userId!,
          passwordHash: currentUser.passwordHash,
        },
      })

      // Clean up old password history (keep only last N)
      const allHistory = await tx.passwordHistory.findMany({
        where: { userId: validation.userId },
        orderBy: { createdAt: "desc" },
        skip: PASSWORD_CONFIG.historyCount,
        select: { id: true },
      })

      if (allHistory.length > 0) {
        await tx.passwordHistory.deleteMany({
          where: { id: { in: allHistory.map((h) => h.id) } },
        })
      }
    }

    // Mark token as used
    await tx.passwordResetToken.update({
      where: { token: hashedToken },
      data: { usedAt: new Date() },
    })

    // Revoke all existing sessions (force re-login)
    await tx.session.updateMany({
      where: {
        userId: validation.userId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    })
  })

  console.log(`[PasswordReset] Password reset successful for user: ${validation.userId}`)

  // Send confirmation email
  if (validation.email) {
    const subject = "Your Password Has Been Reset"
    const message = `Hello,

Your password for your ApoloShop account has been successfully reset.

If you did not make this change, please contact our support team immediately.

IP Address: ${ipAddress || "Unknown"}
Time: ${new Date().toISOString()}

Best regards,
ApoloShop Security Team`

    sendEmailNotification(validation.email, subject, message).catch((error) => {
      console.error("[PasswordReset] Failed to send confirmation email:", error)
    })
  }

  return {
    success: true,
    message: "Your password has been reset successfully. Please log in with your new password.",
  }
}

/**
 * Clean up expired tokens (should be run periodically)
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const result = await prisma.passwordResetToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { usedAt: { not: null } },
      ],
    },
  })

  return result.count
}

/**
 * Get reset request stats for a user (admin view)
 */
export async function getResetRequestStats(
  userId: string
): Promise<{
  totalRequests: number
  recentRequests: number
  lastRequestAt: Date | null
}> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

  const [totalRequests, recentRequests, lastRequest] = await Promise.all([
    prisma.passwordResetToken.count({ where: { userId } }),
    prisma.passwordResetToken.count({
      where: {
        userId,
        createdAt: { gte: oneHourAgo },
      },
    }),
    prisma.passwordResetToken.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ])

  return {
    totalRequests,
    recentRequests,
    lastRequestAt: lastRequest?.createdAt || null,
  }
}
