import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth-middleware"
import {
  generateSecret,
  generateKeyUri,
  generateQRCode,
  generateRecoveryCodes,
  encryptSecret,
  verifyTOTP,
} from "@/lib/totp"
import { log2FAEnabled, extractSecurityRequestInfo } from "@/lib/security-log"

/**
 * POST /api/auth/2fa/setup
 * Initiates 2FA setup for the authenticated user
 * Returns QR code, secret, and recovery codes
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (user) => {
    try {
      // Check if 2FA is already enabled
      const dbUser = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { twoFactorEnabled: true, twoFactorSecret: true },
      })

      if (!dbUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      if (dbUser.twoFactorEnabled) {
        return NextResponse.json(
          { error: "Two-factor authentication is already enabled" },
          { status: 400 }
        )
      }

      // Generate a new secret
      const secret = generateSecret()
      const keyUri = generateKeyUri(user.email, secret, "ApoloShop")
      const qrCode = await generateQRCode(keyUri)

      // Generate recovery codes
      const { codes: recoveryCodes, hashedCodes } = generateRecoveryCodes(10)

      // Store encrypted secret and hashed recovery codes temporarily
      // User must verify before 2FA is fully enabled
      const encryptedSecret = encryptSecret(secret)

      await prisma.user.update({
        where: { id: user.userId },
        data: {
          twoFactorSecret: encryptedSecret,
          recoveryCodes: hashedCodes,
          // twoFactorEnabled stays false until verified
        },
      })

      return NextResponse.json({
        secret, // Show user the plain secret (for manual entry)
        qrCode, // QR code data URL
        recoveryCodes, // Show user the recovery codes (only shown once!)
        message: "Scan the QR code with your authenticator app, then verify with a code",
      })
    } catch (error) {
      console.error("2FA setup error:", error)
      return NextResponse.json({ error: "Failed to setup 2FA" }, { status: 500 })
    }
  })
}

/**
 * DELETE /api/auth/2fa/setup
 * Cancel 2FA setup (clear pending secret without enabling)
 */
export async function DELETE(request: NextRequest) {
  return withAuth(request, async (user) => {
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { twoFactorEnabled: true },
      })

      if (!dbUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      // Only allow cancelling if 2FA is not yet enabled
      if (dbUser.twoFactorEnabled) {
        return NextResponse.json(
          { error: "2FA is already enabled. Use the disable endpoint instead." },
          { status: 400 }
        )
      }

      // Clear the pending setup
      await prisma.user.update({
        where: { id: user.userId },
        data: {
          twoFactorSecret: null,
          recoveryCodes: null,
        },
      })

      return NextResponse.json({ message: "2FA setup cancelled" })
    } catch (error) {
      console.error("2FA setup cancel error:", error)
      return NextResponse.json({ error: "Failed to cancel 2FA setup" }, { status: 500 })
    }
  })
}

const verifySetupSchema = z.object({
  code: z.string().length(6, "Code must be 6 digits").regex(/^\d+$/, "Code must be numeric"),
})

/**
 * PUT /api/auth/2fa/setup
 * Verify 2FA setup by confirming user can generate valid codes
 * This enables 2FA for the account
 */
export async function PUT(request: NextRequest) {
  return withAuth(request, async (user) => {
    try {
      const body = await request.json()
      const result = verifySetupSchema.safeParse(body)

      if (!result.success) {
        return NextResponse.json(
          { error: "Invalid code format", details: result.error.flatten() },
          { status: 400 }
        )
      }

      const { code } = result.data

      // Get user's pending secret
      const dbUser = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { twoFactorEnabled: true, twoFactorSecret: true },
      })

      if (!dbUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      if (dbUser.twoFactorEnabled) {
        return NextResponse.json(
          { error: "Two-factor authentication is already enabled" },
          { status: 400 }
        )
      }

      if (!dbUser.twoFactorSecret) {
        return NextResponse.json(
          { error: "No pending 2FA setup found. Please start setup first." },
          { status: 400 }
        )
      }

      // Import decryptSecret at runtime to avoid circular dependency issues
      const { decryptSecret } = await import("@/lib/totp")
      const secret = decryptSecret(dbUser.twoFactorSecret)

      // Verify the code (async)
      const isValid = await verifyTOTP(code, secret)
      if (!isValid) {
        return NextResponse.json({ error: "Invalid verification code" }, { status: 400 })
      }

      // Enable 2FA
      await prisma.user.update({
        where: { id: user.userId },
        data: { twoFactorEnabled: true },
      })

      // Log 2FA enabled event
      log2FAEnabled(user.userId, user.email, request)

      return NextResponse.json({
        message: "Two-factor authentication has been enabled successfully",
        enabled: true,
      })
    } catch (error) {
      console.error("2FA verify setup error:", error)
      return NextResponse.json({ error: "Failed to verify 2FA setup" }, { status: 500 })
    }
  })
}
