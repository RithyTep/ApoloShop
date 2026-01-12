/**
 * Account Lockout Service
 * Protects against brute force attacks by locking accounts after failed attempts
 */

import { prisma } from "@/lib/prisma"
import { sendEmailNotification } from "@/lib/notification-service"

// Configuration
export const LOCKOUT_CONFIG = {
  maxFailedAttempts: 5,           // Lock after 5 failed attempts
  lockoutDurationMinutes: 15,     // Lock for 15 minutes
  attemptWindowMinutes: 15,       // Count attempts within 15-minute window
  cleanupOldRecordsHours: 24,     // Clean up attempts older than 24 hours
}

// Types
export interface LockoutStatus {
  isLocked: boolean
  lockedUntil?: Date
  remainingMinutes?: number
  failedAttempts: number
  attemptsRemaining: number
}

export interface LoginAttemptData {
  email: string
  userId?: string
  ipAddress: string
  userAgent?: string
  success: boolean
}

/**
 * Extract client IP from request headers
 */
export function extractIpAddress(headers: Headers): string {
  // Check various headers for the client IP
  const forwardedFor = headers.get("x-forwarded-for")
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim()
  }

  const realIp = headers.get("x-real-ip")
  if (realIp) {
    return realIp
  }

  const cfConnectingIp = headers.get("cf-connecting-ip")
  if (cfConnectingIp) {
    return cfConnectingIp
  }

  return "unknown"
}

/**
 * Record a login attempt
 */
export async function recordLoginAttempt(data: LoginAttemptData): Promise<void> {
  try {
    await prisma.loginAttempt.create({
      data: {
        email: data.email,
        userId: data.userId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        success: data.success,
      },
    })
  } catch (error) {
    console.error("[AccountLockout] Failed to record login attempt:", error)
  }
}

/**
 * Get the count of recent failed login attempts for an email
 */
export async function getRecentFailedAttempts(email: string): Promise<number> {
  const windowStart = new Date(
    Date.now() - LOCKOUT_CONFIG.attemptWindowMinutes * 60 * 1000
  )

  const count = await prisma.loginAttempt.count({
    where: {
      email: email.toLowerCase(),
      success: false,
      createdAt: { gte: windowStart },
    },
  })

  return count
}

/**
 * Check if an account is currently locked
 */
export async function checkAccountLockout(userId: string): Promise<LockoutStatus> {
  const lockout = await prisma.accountLockout.findUnique({
    where: { userId },
  })

  const now = new Date()

  // No lockout record exists
  if (!lockout) {
    return {
      isLocked: false,
      failedAttempts: 0,
      attemptsRemaining: LOCKOUT_CONFIG.maxFailedAttempts,
    }
  }

  // Check if lockout has expired
  if (lockout.lockedUntil <= now || lockout.unlockedAt) {
    return {
      isLocked: false,
      failedAttempts: 0,
      attemptsRemaining: LOCKOUT_CONFIG.maxFailedAttempts,
    }
  }

  // Account is still locked
  const remainingMs = lockout.lockedUntil.getTime() - now.getTime()
  const remainingMinutes = Math.ceil(remainingMs / 60000)

  return {
    isLocked: true,
    lockedUntil: lockout.lockedUntil,
    remainingMinutes,
    failedAttempts: lockout.failedAttempts,
    attemptsRemaining: 0,
  }
}

/**
 * Check lockout status by email (before user lookup)
 */
export async function checkLockoutByEmail(email: string): Promise<{
  isLocked: boolean
  remainingMinutes?: number
  userId?: string
}> {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true },
  })

  if (!user) {
    // No user found - can't check lockout, but also not locked
    return { isLocked: false }
  }

  const status = await checkAccountLockout(user.id)

  return {
    isLocked: status.isLocked,
    remainingMinutes: status.remainingMinutes,
    userId: user.id,
  }
}

/**
 * Lock an account
 */
export async function lockAccount(
  userId: string,
  ipAddress?: string,
  failedAttempts: number = LOCKOUT_CONFIG.maxFailedAttempts
): Promise<void> {
  const lockedUntil = new Date(
    Date.now() + LOCKOUT_CONFIG.lockoutDurationMinutes * 60 * 1000
  )

  await prisma.accountLockout.upsert({
    where: { userId },
    create: {
      userId,
      lockedUntil,
      failedAttempts,
      ipAddress,
    },
    update: {
      lockedAt: new Date(),
      lockedUntil,
      failedAttempts,
      ipAddress,
      unlockedAt: null,
      unlockedBy: null,
    },
  })
}

/**
 * Unlock an account manually (admin action)
 */
export async function unlockAccount(
  userId: string,
  unlockedByUserId: string
): Promise<boolean> {
  const lockout = await prisma.accountLockout.findUnique({
    where: { userId },
  })

  if (!lockout) {
    return false
  }

  await prisma.accountLockout.update({
    where: { userId },
    data: {
      unlockedAt: new Date(),
      unlockedBy: unlockedByUserId,
    },
  })

  return true
}

/**
 * Clear failed attempts after successful login
 */
export async function clearFailedAttempts(email: string, userId: string): Promise<void> {
  // Remove any existing lockout for this user
  await prisma.accountLockout.deleteMany({
    where: { userId },
  })

  // We don't delete the login attempts as they're useful for audit/analytics
  // They'll be cleaned up by the cleanup job
}

/**
 * Handle a failed login attempt
 * Returns true if the account should be locked
 */
export async function handleFailedLogin(
  email: string,
  userId: string | null,
  ipAddress: string,
  userAgent?: string
): Promise<{
  shouldLock: boolean
  failedAttempts: number
  attemptsRemaining: number
}> {
  // Record the failed attempt
  await recordLoginAttempt({
    email,
    userId: userId || undefined,
    ipAddress,
    userAgent,
    success: false,
  })

  // Get recent failed attempts count
  const failedAttempts = await getRecentFailedAttempts(email)
  const attemptsRemaining = Math.max(0, LOCKOUT_CONFIG.maxFailedAttempts - failedAttempts)

  // Check if we should lock
  if (failedAttempts >= LOCKOUT_CONFIG.maxFailedAttempts && userId) {
    await lockAccount(userId, ipAddress, failedAttempts)
    return { shouldLock: true, failedAttempts, attemptsRemaining: 0 }
  }

  return { shouldLock: false, failedAttempts, attemptsRemaining }
}

/**
 * Handle a successful login attempt
 */
export async function handleSuccessfulLogin(
  email: string,
  userId: string,
  ipAddress: string,
  userAgent?: string
): Promise<void> {
  // Record the successful attempt
  await recordLoginAttempt({
    email,
    userId,
    ipAddress,
    userAgent,
    success: true,
  })

  // Clear any existing lockout
  await clearFailedAttempts(email, userId)
}

/**
 * Send lockout notification email
 */
export async function sendLockoutNotification(
  email: string,
  userName: string,
  ipAddress: string,
  lockoutDurationMinutes: number
): Promise<void> {
  const subject = "Security Alert: Your Account Has Been Locked"
  const message = `Hello ${userName},

Your account has been temporarily locked due to multiple failed login attempts.

Details:
- Account: ${email}
- IP Address: ${ipAddress}
- Lockout Duration: ${lockoutDurationMinutes} minutes

This security measure helps protect your account from unauthorized access.

If this wasn't you, please contact our support team immediately.

If this was you, please wait ${lockoutDurationMinutes} minutes before trying again, or contact an administrator to unlock your account.

Best regards,
ApoloShop Security Team`

  // Fire and forget - don't block on email sending
  sendEmailNotification(email, subject, message).catch((error) => {
    console.error("[AccountLockout] Failed to send lockout notification:", error)
  })
}

/**
 * Get all locked accounts (for admin view)
 */
export async function getLockedAccounts(): Promise<
  Array<{
    userId: string
    userName: string
    email: string
    lockedAt: Date
    lockedUntil: Date
    failedAttempts: number
    ipAddress: string | null
  }>
> {
  const lockouts = await prisma.accountLockout.findMany({
    where: {
      lockedUntil: { gt: new Date() },
      unlockedAt: null,
    },
  })

  // Get user details for locked accounts
  const userIds = lockouts.map((l) => l.userId)
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  })

  const userMap = new Map(users.map((u) => [u.id, u]))

  return lockouts.map((lockout) => {
    const user = userMap.get(lockout.userId)
    return {
      userId: lockout.userId,
      userName: user?.name || "Unknown",
      email: user?.email || "Unknown",
      lockedAt: lockout.lockedAt,
      lockedUntil: lockout.lockedUntil,
      failedAttempts: lockout.failedAttempts,
      ipAddress: lockout.ipAddress,
    }
  })
}

/**
 * Get login attempts for an email (for admin view)
 */
export async function getLoginAttempts(
  email: string,
  limit: number = 10
): Promise<
  Array<{
    id: string
    ipAddress: string
    userAgent: string | null
    success: boolean
    createdAt: Date
  }>
> {
  return prisma.loginAttempt.findMany({
    where: { email: email.toLowerCase() },
    orderBy: { createdAt: "desc" },
    take: limit,
  })
}

/**
 * Cleanup old login attempts (should be run periodically)
 */
export async function cleanupOldLoginAttempts(): Promise<number> {
  const cutoffDate = new Date(
    Date.now() - LOCKOUT_CONFIG.cleanupOldRecordsHours * 60 * 60 * 1000
  )

  const result = await prisma.loginAttempt.deleteMany({
    where: { createdAt: { lt: cutoffDate } },
  })

  return result.count
}

/**
 * Get lockout history for a user (for admin/audit view)
 */
export async function getLockoutHistory(
  userId: string
): Promise<{
  currentLockout: {
    isLocked: boolean
    lockedAt?: Date
    lockedUntil?: Date
    remainingMinutes?: number
  }
  recentAttempts: Array<{
    ipAddress: string
    success: boolean
    createdAt: Date
  }>
}> {
  const lockout = await prisma.accountLockout.findUnique({
    where: { userId },
  })

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  })

  const recentAttempts = user
    ? await prisma.loginAttempt.findMany({
        where: { email: user.email },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { ipAddress: true, success: true, createdAt: true },
      })
    : []

  const now = new Date()
  const isLocked = lockout && lockout.lockedUntil > now && !lockout.unlockedAt

  return {
    currentLockout: {
      isLocked: !!isLocked,
      lockedAt: lockout?.lockedAt,
      lockedUntil: lockout?.lockedUntil,
      remainingMinutes: isLocked
        ? Math.ceil((lockout.lockedUntil.getTime() - now.getTime()) / 60000)
        : undefined,
    },
    recentAttempts,
  }
}
