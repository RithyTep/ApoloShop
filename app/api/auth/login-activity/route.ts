import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware"
import {
  getUserLoginActivities,
  markLoginAsSuspicious,
  updateLoginNotificationPreference,
} from "@/lib/login-activity"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/auth/login-activity
 * Get current user's login activity history
 */
async function getHandler(request: AuthenticatedRequest) {
  try {
    const userId = request.user.userId
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50)
    const includeReviewed = searchParams.get("includeReviewed") === "true"

    const activities = await getUserLoginActivities(userId, { limit, includeReviewed })

    // Get user's notification preference
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { loginNotificationsEnabled: true },
    })

    return NextResponse.json({
      activities,
      preferences: {
        loginNotificationsEnabled: user?.loginNotificationsEnabled ?? true,
      },
    })
  } catch (error) {
    console.error("[LoginActivity] GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

const notMeSchema = z.object({
  loginActivityId: z.string().min(1, "Login activity ID is required"),
})

/**
 * POST /api/auth/login-activity
 * Mark a login as suspicious ("not me") or update preferences
 */
async function postHandler(request: AuthenticatedRequest) {
  try {
    const userId = request.user.userId
    const body = await request.json()

    // Check if this is a preference update
    if (typeof body.loginNotificationsEnabled === "boolean") {
      const success = await updateLoginNotificationPreference(
        userId,
        body.loginNotificationsEnabled
      )

      if (!success) {
        return NextResponse.json(
          { error: "Failed to update notification preference" },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: body.loginNotificationsEnabled
          ? "Login notifications enabled"
          : "Login notifications disabled",
      })
    }

    // Otherwise, this is a "not me" report
    const result = notMeSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { loginActivityId } = result.data

    const markResult = await markLoginAsSuspicious(loginActivityId, userId)

    if (!markResult.success) {
      return NextResponse.json(
        { error: "Login activity not found or you don't have permission to mark it" },
        { status: 404 }
      )
    }

    // Return security recommendation
    return NextResponse.json({
      success: true,
      message: "Login marked as suspicious. We recommend changing your password immediately.",
      activity: markResult.activity,
      recommendations: [
        "Change your password immediately",
        "Enable two-factor authentication if not already enabled",
        "Review all active sessions and revoke any you don't recognize",
        "Check for any unauthorized changes to your account",
      ],
    })
  } catch (error) {
    console.error("[LoginActivity] POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export const GET = withAuth(getHandler)
export const POST = withAuth(postHandler)
