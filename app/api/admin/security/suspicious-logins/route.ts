import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAuth, AuthenticatedRequest, requireRole } from "@/lib/auth-middleware"
import {
  getSuspiciousLoginActivities,
  reviewSuspiciousLogin,
} from "@/lib/login-activity"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/admin/security/suspicious-logins
 * Get all suspicious login activities for admin review
 */
async function getHandler(request: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)
    const includeReviewed = searchParams.get("includeReviewed") === "true"

    const suspiciousLogins = await getSuspiciousLoginActivities({ limit, includeReviewed })

    // Get summary stats
    const stats = await prisma.loginActivity.aggregate({
      _count: { id: true },
      where: { markedSuspicious: true },
    })

    const unreviewedCount = await prisma.loginActivity.count({
      where: {
        markedSuspicious: true,
        reviewedAt: null,
      },
    })

    // Get user info for the suspicious logins
    const userIds = [...new Set(suspiciousLogins.map(l => l.userId))]
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    })

    const userMap = new Map(users.map(u => [u.id, u]))

    const enrichedLogins = suspiciousLogins.map(login => ({
      ...login,
      user: userMap.get(login.userId) || { name: "Unknown", email: "Unknown" },
    }))

    return NextResponse.json({
      suspiciousLogins: enrichedLogins,
      stats: {
        total: stats._count.id,
        unreviewed: unreviewedCount,
        reviewed: stats._count.id - unreviewedCount,
      },
    })
  } catch (error) {
    console.error("[SuspiciousLogins] GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

const reviewSchema = z.object({
  loginActivityId: z.string().min(1, "Login activity ID is required"),
  reviewNotes: z.string().optional(),
})

/**
 * POST /api/admin/security/suspicious-logins
 * Review a suspicious login activity
 */
async function postHandler(request: AuthenticatedRequest) {
  try {
    const body = await request.json()
    const result = reviewSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { loginActivityId, reviewNotes } = result.data

    const success = await reviewSuspiciousLogin(loginActivityId, reviewNotes)

    if (!success) {
      return NextResponse.json(
        { error: "Failed to review login activity" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Login activity reviewed successfully",
    })
  } catch (error) {
    console.error("[SuspiciousLogins] POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Require at least admin role for these endpoints
const adminMiddleware = requireRole("admin")

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  const roleCheck = await adminMiddleware(req)
  if (roleCheck instanceof NextResponse) return roleCheck
  return getHandler(req)
})

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  const roleCheck = await adminMiddleware(req)
  if (roleCheck instanceof NextResponse) return roleCheck
  return postHandler(req)
})
