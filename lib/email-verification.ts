/**
 * Email Verification Service
 *
 * Implements secure email verification flow:
 * - Time-limited verification tokens (24 hours expiry)
 * - Rate limiting for resend requests
 * - Token invalidation after use
 * - Support for both User and Customer accounts
 */

import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { sendEmailNotification } from "@/lib/notification-service"

// Configuration
export const VERIFICATION_CONFIG = {
  tokenExpiryHours: 24, // 24 hours
  maxResendPerHour: 3, // Rate limit for resend
  tokenLength: 32, // Bytes of randomness
  minTimeBetweenResends: 60, // 1 minute cooldown
} as const

// Types
export type AccountType = "user" | "customer"

export interface VerificationResult {
  success: boolean
  message: string
  error?: string
  errorCode?: string
}

export interface VerificationTokenValidation {
  valid: boolean
  accountType?: AccountType
  accountId?: string
  email?: string
  error?: string
  errorCode?: "TOKEN_EXPIRED" | "TOKEN_INVALID" | "TOKEN_USED" | "TOKEN_NOT_FOUND" | "ALREADY_VERIFIED"
}

export interface VerificationStatus {
  emailVerified: boolean
  email: string | null
  verifiedAt: Date | null
  canResend: boolean
  remainingResends: number
}

/**
 * Generate a secure random token
 */
function generateVerificationToken(): string {
  return crypto.randomBytes(VERIFICATION_CONFIG.tokenLength).toString("hex")
}

/**
 * Hash a token for storage
 */
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex")
}

/**
 * Check rate limit for verification email resend
 */
export async function checkResendRateLimit(
  accountType: AccountType,
  accountId: string
): Promise<{
  allowed: boolean
  remainingResends: number
  retryAfterMinutes?: number
}> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

  // Build where clause based on account type
  const whereClause = accountType === "user"
    ? { userId: accountId }
    : { customerId: accountId }

  // Count recent verification requests
  const recentRequests = await prisma.emailVerifyToken.count({
    where: {
      ...whereClause,
      createdAt: { gte: oneHourAgo },
    },
  })

  const remainingResends = VERIFICATION_CONFIG.maxResendPerHour - recentRequests

  if (remainingResends <= 0) {
    // Find the oldest recent request to calculate retry time
    const oldestRequest = await prisma.emailVerifyToken.findFirst({
      where: {
        ...whereClause,
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
      remainingResends: 0,
      retryAfterMinutes,
    }
  }

  // Check minimum time between requests (cooldown)
  const minTimeBetweenMs = VERIFICATION_CONFIG.minTimeBetweenResends * 1000
  const mostRecentRequest = await prisma.emailVerifyToken.findFirst({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  })

  if (mostRecentRequest) {
    const timeSinceLast = Date.now() - mostRecentRequest.createdAt.getTime()
    if (timeSinceLast < minTimeBetweenMs) {
      const retryAfterSeconds = Math.ceil((minTimeBetweenMs - timeSinceLast) / 1000)
      return {
        allowed: false,
        remainingResends,
        retryAfterMinutes: Math.ceil(retryAfterSeconds / 60),
      }
    }
  }

  return { allowed: true, remainingResends }
}

/**
 * Send verification email to a user
 */
export async function sendUserVerificationEmail(
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<VerificationResult> {
  // Find user
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, isActive: true, emailVerified: true },
  })

  if (!user) {
    return {
      success: false,
      message: "User not found.",
      error: "USER_NOT_FOUND",
    }
  }

  if (!user.isActive) {
    return {
      success: false,
      message: "This account is not active.",
      error: "ACCOUNT_INACTIVE",
    }
  }

  if (user.emailVerified) {
    return {
      success: false,
      message: "Email is already verified.",
      error: "ALREADY_VERIFIED",
    }
  }

  // Check rate limit
  const rateLimit = await checkResendRateLimit("user", userId)
  if (!rateLimit.allowed) {
    return {
      success: false,
      message: `Too many verification requests. Please try again in ${rateLimit.retryAfterMinutes} minutes.`,
      error: "RATE_LIMIT_EXCEEDED",
    }
  }

  // Invalidate any existing unused tokens
  await prisma.emailVerifyToken.updateMany({
    where: {
      userId: userId,
      usedAt: null,
    },
    data: {
      usedAt: new Date(), // Mark as "used" to invalidate
    },
  })

  // Generate new token
  const rawToken = generateVerificationToken()
  const hashedToken = hashToken(rawToken)
  const expiresAt = new Date(Date.now() + VERIFICATION_CONFIG.tokenExpiryHours * 60 * 60 * 1000)

  // Store token
  await prisma.emailVerifyToken.create({
    data: {
      userId: userId,
      email: user.email,
      token: hashedToken,
      expiresAt,
      ipAddress,
      userAgent,
    },
  })

  // Generate verification URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${rawToken}`

  // Send email
  const emailSubject = "Verify Your Email Address"
  const emailMessage = `Hello ${user.name},

Please verify your email address to complete your ApoloShop account setup.

Click the link below to verify your email:
${verifyUrl}

This link will expire in ${VERIFICATION_CONFIG.tokenExpiryHours} hours.

If you didn't create an account with ApoloShop, please ignore this email.

Best regards,
ApoloShop Team`

  // Send email (fire and forget)
  sendEmailNotification(user.email, emailSubject, emailMessage).catch((error) => {
    console.error("[EmailVerification] Failed to send verification email:", error)
  })

  console.log(`[EmailVerification] Verification token sent to user: ${userId}`)

  return {
    success: true,
    message: "Verification email sent. Please check your inbox.",
  }
}

/**
 * Send verification email to a customer
 */
export async function sendCustomerVerificationEmail(
  customerId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<VerificationResult> {
  // Find customer
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, name: true, email: true, emailVerified: true },
  })

  if (!customer) {
    return {
      success: false,
      message: "Customer not found.",
      error: "CUSTOMER_NOT_FOUND",
    }
  }

  if (!customer.email) {
    return {
      success: false,
      message: "No email address on file. Please add an email to your profile.",
      error: "NO_EMAIL",
    }
  }

  if (customer.emailVerified) {
    return {
      success: false,
      message: "Email is already verified.",
      error: "ALREADY_VERIFIED",
    }
  }

  // Check rate limit
  const rateLimit = await checkResendRateLimit("customer", customerId)
  if (!rateLimit.allowed) {
    return {
      success: false,
      message: `Too many verification requests. Please try again in ${rateLimit.retryAfterMinutes} minutes.`,
      error: "RATE_LIMIT_EXCEEDED",
    }
  }

  // Invalidate any existing unused tokens
  await prisma.emailVerifyToken.updateMany({
    where: {
      customerId: customerId,
      usedAt: null,
    },
    data: {
      usedAt: new Date(), // Mark as "used" to invalidate
    },
  })

  // Generate new token
  const rawToken = generateVerificationToken()
  const hashedToken = hashToken(rawToken)
  const expiresAt = new Date(Date.now() + VERIFICATION_CONFIG.tokenExpiryHours * 60 * 60 * 1000)

  // Store token
  await prisma.emailVerifyToken.create({
    data: {
      customerId: customerId,
      email: customer.email,
      token: hashedToken,
      expiresAt,
      ipAddress,
      userAgent,
    },
  })

  // Generate verification URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${rawToken}`

  // Send email
  const emailSubject = "Verify Your Email Address"
  const emailMessage = `Hello ${customer.name},

Please verify your email address to complete your ApoloShop profile.

Click the link below to verify your email:
${verifyUrl}

This link will expire in ${VERIFICATION_CONFIG.tokenExpiryHours} hours.

If you didn't request this verification, please ignore this email.

Best regards,
ApoloShop Team`

  // Send email (fire and forget)
  sendEmailNotification(customer.email, emailSubject, emailMessage).catch((error) => {
    console.error("[EmailVerification] Failed to send verification email:", error)
  })

  console.log(`[EmailVerification] Verification token sent to customer: ${customerId}`)

  return {
    success: true,
    message: "Verification email sent. Please check your inbox.",
  }
}

/**
 * Validate an email verification token
 */
export async function validateVerificationToken(token: string): Promise<VerificationTokenValidation> {
  const hashedToken = hashToken(token)

  const verifyToken = await prisma.emailVerifyToken.findUnique({
    where: { token: hashedToken },
    include: {
      user: {
        select: { id: true, email: true, isActive: true, emailVerified: true },
      },
      customer: {
        select: { id: true, email: true, emailVerified: true },
      },
    },
  })

  if (!verifyToken) {
    return {
      valid: false,
      error: "Invalid or expired verification link.",
      errorCode: "TOKEN_NOT_FOUND",
    }
  }

  if (verifyToken.usedAt) {
    return {
      valid: false,
      error: "This verification link has already been used.",
      errorCode: "TOKEN_USED",
    }
  }

  if (verifyToken.expiresAt < new Date()) {
    return {
      valid: false,
      error: "This verification link has expired. Please request a new one.",
      errorCode: "TOKEN_EXPIRED",
    }
  }

  // Check if it's a user or customer token
  if (verifyToken.user) {
    if (!verifyToken.user.isActive) {
      return {
        valid: false,
        error: "This account is no longer active.",
        errorCode: "TOKEN_INVALID",
      }
    }

    if (verifyToken.user.emailVerified) {
      return {
        valid: false,
        error: "This email is already verified.",
        errorCode: "ALREADY_VERIFIED",
      }
    }

    return {
      valid: true,
      accountType: "user",
      accountId: verifyToken.userId!,
      email: verifyToken.email,
    }
  }

  if (verifyToken.customer) {
    if (verifyToken.customer.emailVerified) {
      return {
        valid: false,
        error: "This email is already verified.",
        errorCode: "ALREADY_VERIFIED",
      }
    }

    return {
      valid: true,
      accountType: "customer",
      accountId: verifyToken.customerId!,
      email: verifyToken.email,
    }
  }

  return {
    valid: false,
    error: "Invalid verification token.",
    errorCode: "TOKEN_INVALID",
  }
}

/**
 * Verify email using a valid token
 */
export async function verifyEmail(token: string): Promise<VerificationResult> {
  // Validate the token
  const validation = await validateVerificationToken(token)
  if (!validation.valid || !validation.accountId || !validation.accountType) {
    return {
      success: false,
      message: validation.error || "Invalid verification token.",
      error: validation.errorCode,
    }
  }

  const hashedToken = hashToken(token)
  const now = new Date()

  // Update the account and mark token as used in a transaction
  await prisma.$transaction(async (tx) => {
    // Mark token as used
    await tx.emailVerifyToken.update({
      where: { token: hashedToken },
      data: { usedAt: now },
    })

    // Update the account
    if (validation.accountType === "user") {
      await tx.user.update({
        where: { id: validation.accountId },
        data: {
          emailVerified: true,
          emailVerifiedAt: now,
        },
      })
    } else {
      await tx.customer.update({
        where: { id: validation.accountId },
        data: {
          emailVerified: true,
          emailVerifiedAt: now,
        },
      })
    }
  })

  console.log(`[EmailVerification] Email verified for ${validation.accountType}: ${validation.accountId}`)

  // Send confirmation email
  if (validation.email) {
    const subject = "Email Verified Successfully"
    const message = `Hello,

Your email address has been successfully verified for your ApoloShop account.

You now have access to all features that require a verified email.

Thank you for verifying your email!

Best regards,
ApoloShop Team`

    sendEmailNotification(validation.email, subject, message).catch((error) => {
      console.error("[EmailVerification] Failed to send confirmation email:", error)
    })
  }

  return {
    success: true,
    message: "Your email has been verified successfully!",
  }
}

/**
 * Get verification status for an account
 */
export async function getVerificationStatus(
  accountType: AccountType,
  accountId: string
): Promise<VerificationStatus | null> {
  if (accountType === "user") {
    const user = await prisma.user.findUnique({
      where: { id: accountId },
      select: { email: true, emailVerified: true, emailVerifiedAt: true },
    })

    if (!user) return null

    const rateLimit = await checkResendRateLimit("user", accountId)

    return {
      email: user.email,
      emailVerified: user.emailVerified,
      verifiedAt: user.emailVerifiedAt,
      canResend: !user.emailVerified && rateLimit.allowed,
      remainingResends: rateLimit.remainingResends,
    }
  } else {
    const customer = await prisma.customer.findUnique({
      where: { id: accountId },
      select: { email: true, emailVerified: true, emailVerifiedAt: true },
    })

    if (!customer) return null

    const rateLimit = await checkResendRateLimit("customer", accountId)

    return {
      email: customer.email,
      emailVerified: customer.emailVerified,
      verifiedAt: customer.emailVerifiedAt,
      canResend: !customer.emailVerified && !!customer.email && rateLimit.allowed,
      remainingResends: rateLimit.remainingResends,
    }
  }
}

/**
 * Check if email verification is required for an action
 */
export function isEmailVerificationRequired(action: string): boolean {
  const restrictedActions = [
    "create_review",
    "change_email",
    "subscribe_newsletter",
    "redeem_loyalty_points",
    "access_premium_features",
  ]
  return restrictedActions.includes(action)
}

/**
 * Clean up expired tokens (should be run periodically)
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const result = await prisma.emailVerifyToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { usedAt: { not: null } },
      ],
    },
  })

  return result.count
}
