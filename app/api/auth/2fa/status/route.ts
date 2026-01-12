import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth-middleware"

/**
 * GET /api/auth/2fa/status
 * Get the current 2FA status for the authenticated user
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (user) => {
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.userId },
        select: {
          twoFactorEnabled: true,
          twoFactorSecret: true,
          recoveryCodes: true,
        },
      })

      if (!dbUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      const recoveryCodesRemaining = (dbUser.recoveryCodes as string[])?.length || 0
      const hasPendingSetup = !dbUser.twoFactorEnabled && !!dbUser.twoFactorSecret

      return NextResponse.json({
        enabled: dbUser.twoFactorEnabled,
        hasPendingSetup,
        recoveryCodesRemaining: dbUser.twoFactorEnabled ? recoveryCodesRemaining : null,
        lowRecoveryCodes: dbUser.twoFactorEnabled && recoveryCodesRemaining <= 3,
      })
    } catch (error) {
      console.error("2FA status error:", error)
      return NextResponse.json({ error: "Failed to get 2FA status" }, { status: 500 })
    }
  })
}
