import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth-middleware"
import { generateRecoveryCodes, decryptSecret, verifyTOTP } from "@/lib/totp"

const regenerateSchema = z.object({
  // Password confirmation required for security
  password: z.string().min(1, "Password is required"),
  // Current 2FA code to verify identity
  code: z.string().length(6, "Code must be 6 digits").regex(/^\d+$/, "Code must be numeric"),
})

/**
 * GET /api/auth/2fa/recovery-codes
 * Get the count of remaining recovery codes
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (user) => {
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.userId },
        select: {
          twoFactorEnabled: true,
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

      const remainingCodes = (dbUser.recoveryCodes as string[])?.length || 0

      return NextResponse.json({
        remainingCodes,
        warning: remainingCodes <= 3
          ? "Warning: You have few recovery codes remaining. Consider regenerating them."
          : null,
      })
    } catch (error) {
      console.error("Get recovery codes error:", error)
      return NextResponse.json({ error: "Failed to get recovery codes" }, { status: 500 })
    }
  })
}

/**
 * POST /api/auth/2fa/recovery-codes
 * Regenerate recovery codes (invalidates all existing codes)
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (user) => {
    try {
      const body = await request.json()
      const result = regenerateSchema.safeParse(body)

      if (!result.success) {
        return NextResponse.json(
          { error: "Validation failed", details: result.error.flatten() },
          { status: 400 }
        )
      }

      const { password, code } = result.data

      // Get user with password and 2FA data
      const dbUser = await prisma.user.findUnique({
        where: { id: user.userId },
        select: {
          passwordHash: true,
          twoFactorEnabled: true,
          twoFactorSecret: true,
        },
      })

      if (!dbUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      if (!dbUser.twoFactorEnabled || !dbUser.twoFactorSecret) {
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

      // Verify current 2FA code
      const secret = decryptSecret(dbUser.twoFactorSecret)
      const isValidCode = await verifyTOTP(code, secret)
      if (!isValidCode) {
        return NextResponse.json({ error: "Invalid 2FA code" }, { status: 401 })
      }

      // Generate new recovery codes
      const { codes: recoveryCodes, hashedCodes } = generateRecoveryCodes(10)

      // Update recovery codes in database
      await prisma.user.update({
        where: { id: user.userId },
        data: { recoveryCodes: hashedCodes },
      })

      return NextResponse.json({
        recoveryCodes, // Only shown once - user must save them!
        message: "New recovery codes generated. Please save them in a secure location.",
        warning: "Your previous recovery codes have been invalidated.",
      })
    } catch (error) {
      console.error("Regenerate recovery codes error:", error)
      return NextResponse.json({ error: "Failed to regenerate recovery codes" }, { status: 500 })
    }
  })
}
