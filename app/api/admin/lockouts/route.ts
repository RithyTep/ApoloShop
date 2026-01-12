/**
 * Admin Account Lockouts API
 * GET - List all locked accounts
 * POST - Manually unlock an account
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware"
import {
  getLockedAccounts,
  unlockAccount,
  getLockoutHistory,
  getLoginAttempts,
} from "@/lib/account-lockout"

/**
 * GET /api/admin/lockouts
 * List all currently locked accounts
 */
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    // Check admin permissions
    const userRole = request.auth.user.role
    if (userRole !== "super_admin" && userRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    // If userId provided, get detailed lockout history for that user
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true },
      })

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      const history = await getLockoutHistory(userId)
      const loginAttempts = await getLoginAttempts(user.email, 20)

      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        lockoutStatus: history.currentLockout,
        recentAttempts: loginAttempts,
      })
    }

    // Get all locked accounts
    const lockedAccounts = await getLockedAccounts()

    // Get summary statistics
    const totalLockedNow = lockedAccounts.length

    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [
      lockoutsLast24h,
      lockoutsLast7d,
      totalFailedAttemptsLast24h,
    ] = await Promise.all([
      prisma.accountLockout.count({
        where: { lockedAt: { gte: last24Hours } },
      }),
      prisma.accountLockout.count({
        where: { lockedAt: { gte: last7Days } },
      }),
      prisma.loginAttempt.count({
        where: { success: false, createdAt: { gte: last24Hours } },
      }),
    ])

    return NextResponse.json({
      lockedAccounts,
      summary: {
        totalLockedNow,
        lockoutsLast24h,
        lockoutsLast7d,
        totalFailedAttemptsLast24h,
      },
    })
  } catch (error) {
    console.error("[Admin Lockouts API] GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})

/**
 * POST /api/admin/lockouts
 * Manually unlock an account
 */
export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    // Check admin permissions
    const userRole = request.auth.user.role
    if (userRole !== "super_admin" && userRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { userId, action } = body

    if (!userId || !action) {
      return NextResponse.json(
        { error: "Missing required fields: userId, action" },
        { status: 400 }
      )
    }

    if (action !== "unlock") {
      return NextResponse.json(
        { error: "Invalid action. Supported actions: unlock" },
        { status: 400 }
      )
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Unlock the account
    const unlocked = await unlockAccount(userId, request.auth.user.id)

    if (!unlocked) {
      return NextResponse.json(
        { error: "No active lockout found for this user" },
        { status: 404 }
      )
    }

    // Log the audit action
    try {
      await prisma.auditLog.create({
        data: {
          userId: request.auth.user.id,
          userName: request.auth.user.email,
          action: "UPDATE",
          resource: "account_lockout",
          resourceId: userId,
          details: {
            action: "manual_unlock",
            unlockedUserId: userId,
            unlockedUserEmail: user.email,
            unlockedUserName: user.name,
          },
          ipAddress: request.headers.get("x-forwarded-for") || "unknown",
          userAgent: request.headers.get("user-agent"),
        },
      })
    } catch (auditError) {
      console.error("[Admin Lockouts API] Failed to log audit:", auditError)
    }

    return NextResponse.json({
      success: true,
      message: `Account for ${user.email} has been unlocked`,
      unlockedUser: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    })
  } catch (error) {
    console.error("[Admin Lockouts API] POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})
