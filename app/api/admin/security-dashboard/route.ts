import { NextResponse } from "next/server"
import { withAuth, AuthenticatedRequest, requireRole } from "@/lib/auth-middleware"
import { prisma } from "@/lib/prisma"
import { getLockedAccounts, LOCKOUT_CONFIG } from "@/lib/account-lockout"
import { getSecurityLogStats, detectSuspiciousPatterns } from "@/lib/security-log"

/**
 * GET /api/admin/security-dashboard
 * Real-time security monitoring dashboard data
 */
async function getHandler(request: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get("timeframe") || "24h"

    // Calculate date range based on timeframe
    const now = new Date()
    let startDate: Date
    switch (timeframe) {
      case "1h":
        startDate = new Date(now.getTime() - 60 * 60 * 1000)
        break
      case "6h":
        startDate = new Date(now.getTime() - 6 * 60 * 60 * 1000)
        break
      case "24h":
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    }

    // Fetch all data in parallel
    const [
      // Login activity stats
      loginSuccessCount,
      loginFailedCount,
      recentLoginAttempts,
      // Active sessions
      activeSessions,
      sessionsByDevice,
      // Locked accounts
      lockedAccounts,
      // Security log stats
      securityLogStats,
      // Suspicious patterns
      suspiciousPatterns,
      // Failed login trends (hourly)
      failedLoginTrends,
      // Recent critical events
      criticalEvents,
      // Suspicious login activities
      suspiciousLogins,
    ] = await Promise.all([
      // Login success count
      prisma.loginAttempt.count({
        where: {
          success: true,
          createdAt: { gte: startDate },
        },
      }),
      // Login failed count
      prisma.loginAttempt.count({
        where: {
          success: false,
          createdAt: { gte: startDate },
        },
      }),
      // Recent login attempts (last 20)
      prisma.loginAttempt.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          email: true,
          userId: true,
          ipAddress: true,
          success: true,
          createdAt: true,
        },
      }),
      // Active sessions count
      prisma.session.count({
        where: {
          isRevoked: false,
          expiresAt: { gt: now },
        },
      }),
      // Sessions by device type
      prisma.session.groupBy({
        by: ["deviceType"],
        _count: true,
        where: {
          isRevoked: false,
          expiresAt: { gt: now },
        },
      }),
      // Locked accounts
      getLockedAccounts(),
      // Security log stats
      getSecurityLogStats(startDate, now),
      // Suspicious patterns
      detectSuspiciousPatterns(),
      // Failed login trends - get raw data and process
      prisma.loginAttempt.findMany({
        where: {
          success: false,
          createdAt: { gte: startDate },
        },
        select: {
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      // Recent critical security events
      prisma.securityLog.findMany({
        where: {
          severity: "CRITICAL",
          createdAt: { gte: startDate },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          event: true,
          userId: true,
          userName: true,
          userEmail: true,
          ipAddress: true,
          details: true,
          createdAt: true,
        },
      }),
      // Suspicious login activities
      prisma.loginActivity.findMany({
        where: {
          markedSuspicious: true,
          reviewedAt: null,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          userId: true,
          deviceName: true,
          ipAddress: true,
          country: true,
          city: true,
          isNewDevice: true,
          isNewLocation: true,
          createdAt: true,
        },
      }),
    ])

    // Process failed login trends into hourly buckets
    const hourlyTrends = processHourlyTrends(failedLoginTrends, startDate, now)

    // Get user info for suspicious logins
    const suspiciousUserIds = [...new Set(suspiciousLogins.map(l => l.userId))]
    const suspiciousUsers = await prisma.user.findMany({
      where: { id: { in: suspiciousUserIds } },
      select: { id: true, name: true, email: true },
    })
    const userMap = new Map(suspiciousUsers.map(u => [u.id, u]))

    const enrichedSuspiciousLogins = suspiciousLogins.map(login => ({
      ...login,
      user: userMap.get(login.userId) || { name: "Unknown", email: "Unknown" },
    }))

    // Calculate security score (0-100)
    const securityScore = calculateSecurityScore({
      loginFailedCount,
      loginSuccessCount,
      lockedAccountsCount: lockedAccounts.length,
      criticalEventsCount: criticalEvents.length,
      suspiciousLoginsCount: suspiciousLogins.length,
    })

    return NextResponse.json({
      timeframe,
      generatedAt: now.toISOString(),

      // Summary metrics
      summary: {
        securityScore,
        loginSuccessCount,
        loginFailedCount,
        failedLoginRate: loginSuccessCount + loginFailedCount > 0
          ? ((loginFailedCount / (loginSuccessCount + loginFailedCount)) * 100).toFixed(1)
          : "0",
        activeSessions,
        lockedAccountsCount: lockedAccounts.length,
        unreviewedSuspiciousLogins: suspiciousLogins.length,
        criticalEventsCount: criticalEvents.length,
      },

      // Active sessions breakdown
      sessions: {
        total: activeSessions,
        byDevice: sessionsByDevice.map(s => ({
          type: s.deviceType || "unknown",
          count: s._count,
        })),
      },

      // Locked accounts
      lockedAccounts,

      // Recent login activity
      recentLoginAttempts,

      // Failed login trends (hourly)
      failedLoginTrends: hourlyTrends,

      // Security log breakdown
      securityLogStats,

      // Suspicious patterns/alerts
      alerts: suspiciousPatterns,

      // Critical events
      criticalEvents,

      // Suspicious login activities
      suspiciousLogins: enrichedSuspiciousLogins,

      // Config info
      config: {
        lockoutMaxAttempts: LOCKOUT_CONFIG.maxFailedAttempts,
        lockoutDurationMinutes: LOCKOUT_CONFIG.lockoutDurationMinutes,
      },
    })
  } catch (error) {
    console.error("[SecurityDashboard] GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * Process login attempts into hourly trend data
 */
function processHourlyTrends(
  attempts: { createdAt: Date }[],
  startDate: Date,
  endDate: Date
): Array<{ hour: string; count: number }> {
  // Create hourly buckets
  const hourlyMap = new Map<string, number>()

  // Determine number of hours to show based on date range
  const hoursDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60))
  const hoursToShow = Math.min(hoursDiff, 24) // Cap at 24 hours for display

  // Initialize buckets
  for (let i = hoursToShow - 1; i >= 0; i--) {
    const bucketTime = new Date(endDate.getTime() - i * 60 * 60 * 1000)
    const hourKey = bucketTime.toISOString().substring(0, 13) // YYYY-MM-DDTHH
    hourlyMap.set(hourKey, 0)
  }

  // Fill in counts
  for (const attempt of attempts) {
    const hourKey = attempt.createdAt.toISOString().substring(0, 13)
    if (hourlyMap.has(hourKey)) {
      hourlyMap.set(hourKey, (hourlyMap.get(hourKey) || 0) + 1)
    }
  }

  // Convert to array
  return Array.from(hourlyMap.entries()).map(([hour, count]) => ({
    hour: hour.substring(11, 13) + ":00", // Just HH:00 format
    count,
  }))
}

/**
 * Calculate overall security score (0-100)
 * Higher is better
 */
function calculateSecurityScore(params: {
  loginFailedCount: number
  loginSuccessCount: number
  lockedAccountsCount: number
  criticalEventsCount: number
  suspiciousLoginsCount: number
}): number {
  let score = 100

  // Deduct for failed login ratio (max -30 points)
  const totalLogins = params.loginSuccessCount + params.loginFailedCount
  if (totalLogins > 0) {
    const failedRatio = params.loginFailedCount / totalLogins
    score -= Math.min(failedRatio * 60, 30)
  }

  // Deduct for locked accounts (max -20 points)
  score -= Math.min(params.lockedAccountsCount * 5, 20)

  // Deduct for critical events (max -30 points)
  score -= Math.min(params.criticalEventsCount * 6, 30)

  // Deduct for unreviewed suspicious logins (max -20 points)
  score -= Math.min(params.suspiciousLoginsCount * 4, 20)

  return Math.max(0, Math.round(score))
}

// Require at least admin role
const adminMiddleware = requireRole("admin")

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  const roleCheck = await adminMiddleware(req)
  if (roleCheck instanceof NextResponse) return roleCheck
  return getHandler(req)
})
