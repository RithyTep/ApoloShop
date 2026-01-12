import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth-middleware"
import { decryptSecret, verifyTOTP, verifyRecoveryCode } from "@/lib/totp"
import { log2FADisabled } from "@/lib/security-log"

const disableSchema = z.object({
  // Password confirmation required for security
  password: z.string().min(1, "Password is required"),
  // Optional 2FA code for additional verification
  code: z.string().optional(),
})

/**
 * POST /api/auth/2fa/disable
 * Disable 2FA for the authenticated user
 * Requires password confirmation and optionally 2FA code
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (user) => {
    try {
      const body = await request.json()
      const result = disableSchema.safeParse(body)

      if (!result.success) {
        return NextResponse.json(
          { error: "Validation failed", details: result.error.flatten() },
          { status: 400 }
        )
      }

      const { password, code } = result.data

      // Get user with password hash and 2FA data
      const dbUser = await prisma.user.findUnique({
        where: { id: user.userId },
        select: {
          id: true,
          passwordHash: true,
          twoFactorEnabled: true,
          twoFactorSecret: true,
          recoveryCodes: true,
        },
      })

      if (!dbUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      if (!dbUser.twoFactorEnabled) {
        return NextResponse.json(
          { error: "Two-factor authentication is not enabled" },
          { status: 400 }
        )
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, dbUser.passwordHash)
      if (!isPasswordValid) {
        return NextResponse.json({ error: "Invalid password" }, { status: 401 })
      }

      // If a 2FA code is provided, verify it as well (extra security)
      if (code && dbUser.twoFactorSecret) {
        const secret = decryptSecret(dbUser.twoFactorSecret)

        // Check if it's a recovery code (format: XXXX-XXXX) or TOTP (6 digits)
        const isRecoveryCode = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(code)

        let isValidCode = false
        if (isRecoveryCode) {
          const hashedCodes = (dbUser.recoveryCodes as string[]) || []
          const recoveryResult = verifyRecoveryCode(code, hashedCodes)
          isValidCode = recoveryResult.valid
        } else if (/^\d{6}$/.test(code)) {
          isValidCode = await verifyTOTP(code, secret)
        }

        if (!isValidCode) {
          return NextResponse.json(
            { error: "Invalid 2FA code" },
            { status: 401 }
          )
        }
      }

      // Disable 2FA
      await prisma.user.update({
        where: { id: user.userId },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
          recoveryCodes: null,
        },
      })

      // Log 2FA disabled event
      log2FADisabled(user.userId, user.email, request)

      return NextResponse.json({
        message: "Two-factor authentication has been disabled",
        enabled: false,
      })
    } catch (error) {
      console.error("2FA disable error:", error)
      return NextResponse.json({ error: "Failed to disable 2FA" }, { status: 500 })
    }
  })
}
