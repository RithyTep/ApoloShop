import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import {
  generateTokenPair,
  signToken,
  ACCESS_TOKEN_EXPIRY_MS,
} from "@/lib/jwt"
import { decryptSecret, verifyTOTP, verifyRecoveryCode } from "@/lib/totp"
import { createSession, extractIpAddress } from "@/lib/session-service"
import { processLoginActivity } from "@/lib/login-activity"

const verifySchema = z.object({
  // Pending auth token from initial login (before 2FA)
  pendingToken: z.string().min(1, "Pending token is required"),
  // 2FA code from authenticator app (6 digits) OR recovery code (format: XXXX-XXXX)
  code: z.string().min(1, "Code is required"),
  // Whether this is a recovery code
  isRecoveryCode: z.boolean().optional().default(false),
})

/**
 * POST /api/auth/2fa/verify
 * Verify 2FA code during login
 * Called after initial password verification when user has 2FA enabled
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = verifySchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { pendingToken, code, isRecoveryCode } = result.data

    // Verify pending token to get user ID
    // The pending token contains the user ID and is short-lived (5 minutes)
    const { verifyPendingToken } = await import("@/lib/jwt")
    let pendingPayload
    try {
      pendingPayload = verifyPendingToken(pendingToken)
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired pending token. Please login again." },
        { status: 401 }
      )
    }

    // Get user with 2FA data
    const user = await prisma.user.findUnique({
      where: { id: pendingPayload.userId },
      include: { role: true },
    })

    if (!user || !user.isActive) {
      return NextResponse.json({ error: "User not found or inactive" }, { status: 401 })
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return NextResponse.json(
        { error: "Two-factor authentication is not enabled for this account" },
        { status: 400 }
      )
    }

    // Decrypt the stored secret
    const secret = decryptSecret(user.twoFactorSecret)

    let isValidCode = false
    let usedRecoveryCodeIndex = -1

    if (isRecoveryCode) {
      // Verify recovery code
      const hashedCodes = (user.recoveryCodes as string[]) || []
      const recoveryResult = verifyRecoveryCode(code, hashedCodes)
      isValidCode = recoveryResult.valid
      usedRecoveryCodeIndex = recoveryResult.index
    } else {
      // Verify TOTP code (6 digits)
      if (!/^\d{6}$/.test(code)) {
        return NextResponse.json(
          { error: "Invalid code format. Enter 6 digits from your authenticator app." },
          { status: 400 }
        )
      }
      isValidCode = await verifyTOTP(code, secret)
    }

    if (!isValidCode) {
      return NextResponse.json(
        { error: isRecoveryCode ? "Invalid recovery code" : "Invalid verification code" },
        { status: 401 }
      )
    }

    // If recovery code was used, remove it from the list
    if (isRecoveryCode && usedRecoveryCodeIndex !== -1) {
      const hashedCodes = [...((user.recoveryCodes as string[]) || [])]
      hashedCodes.splice(usedRecoveryCodeIndex, 1)

      await prisma.user.update({
        where: { id: user.id },
        data: { recoveryCodes: hashedCodes },
      })
    }

    // Parse permissions from role
    const permissions = (user.role.permissions as Record<string, string[]>) || {}

    // Generate full token pair (2FA verified)
    const tokenPair = generateTokenPair({
      userId: user.id,
      roleId: user.roleId,
      email: user.email,
      role: user.role.name,
      permissions,
    })

    // Store session with device info
    const legacyToken = signToken({
      userId: user.id,
      roleId: user.roleId,
      email: user.email,
    })

    const ipAddress = extractIpAddress(request.headers)
    const userAgent = request.headers.get("user-agent") || undefined

    const session = await createSession({
      userId: user.id,
      token: legacyToken,
      ipAddress,
      userAgent,
    })

    // Track login activity and send notification if new device/location
    // Fire and forget - don't block the response
    processLoginActivity({
      userId: user.id,
      sessionId: session.id,
      ipAddress: ipAddress || "unknown",
      userAgent,
      userName: user.name,
      userEmail: user.email,
      loginNotificationsEnabled: user.loginNotificationsEnabled ?? true,
    }).catch((err) => {
      console.error("[2FA Verify] Failed to process login activity:", err)
    })

    // Build response
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.name,
        permissions,
        twoFactorEnabled: true,
      },
      accessToken: tokenPair.accessToken,
      expiresIn: Math.floor(ACCESS_TOKEN_EXPIRY_MS / 1000),
      ...(isRecoveryCode ? {
        warning: "You used a recovery code. You have " +
          ((user.recoveryCodes as string[])?.length - 1) +
          " recovery codes remaining.",
      } : {}),
    })

    // Set cookies
    response.cookies.set("refresh-token", tokenPair.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      expires: tokenPair.refreshTokenExpiresAt,
      path: "/",
    })

    response.cookies.set("auth-token", legacyToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: tokenPair.refreshTokenExpiresAt,
      path: "/",
    })

    return response
  } catch (error) {
    console.error("2FA verification error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
