import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import {
  generateTokenPair,
  signToken,
  signPendingToken,
  ACCESS_TOKEN_EXPIRY_MS,
  PENDING_2FA_TOKEN_EXPIRY_MS,
} from "@/lib/jwt"
import { shouldShowExpiryWarning, PASSWORD_CONFIG } from "@/lib/password-security"
import {
  checkLockoutByEmail,
  handleFailedLogin,
  handleSuccessfulLogin,
  sendLockoutNotification,
  extractIpAddress,
  LOCKOUT_CONFIG,
} from "@/lib/account-lockout"
import {
  createSession,
  parseUserAgent,
  extractIpAddress as extractSessionIpAddress,
} from "@/lib/session-service"
import { processLoginActivity } from "@/lib/login-activity"

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const result = loginSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { email, password } = result.data
    const ipAddress = extractIpAddress(request.headers)
    const userAgent = request.headers.get("user-agent") || undefined

    // Check if account is locked before attempting authentication
    const lockoutCheck = await checkLockoutByEmail(email)
    if (lockoutCheck.isLocked) {
      return NextResponse.json(
        {
          error: "Account is temporarily locked due to multiple failed login attempts",
          code: "ACCOUNT_LOCKED",
          lockedUntilMinutes: lockoutCheck.remainingMinutes,
        },
        { status: 423 } // 423 Locked status code
      )
    }

    // Find user with 2FA fields
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    })

    if (!user || !user.isActive) {
      // Record failed attempt even for non-existent users (to prevent enumeration)
      await handleFailedLogin(email, null, ipAddress, userAgent)
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) {
      // Record failed attempt
      const failedResult = await handleFailedLogin(email, user.id, ipAddress, userAgent)

      // Check if account should be locked now
      if (failedResult.shouldLock) {
        // Send lockout notification email (fire and forget)
        sendLockoutNotification(
          email,
          user.name,
          ipAddress,
          LOCKOUT_CONFIG.lockoutDurationMinutes
        )

        return NextResponse.json(
          {
            error: "Account has been locked due to multiple failed login attempts",
            code: "ACCOUNT_LOCKED",
            lockedUntilMinutes: LOCKOUT_CONFIG.lockoutDurationMinutes,
          },
          { status: 423 }
        )
      }

      return NextResponse.json(
        {
          error: "Invalid credentials",
          attemptsRemaining: failedResult.attemptsRemaining,
        },
        { status: 401 }
      )
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      // Generate a pending token for 2FA verification
      const pendingToken = signPendingToken(user.id, user.email)

      return NextResponse.json({
        requires2FA: true,
        pendingToken,
        expiresIn: Math.floor(PENDING_2FA_TOKEN_EXPIRY_MS / 1000), // seconds
        message: "Two-factor authentication required. Enter the code from your authenticator app.",
      })
    }

    // No 2FA - proceed with normal login
    const permissions = (user.role.permissions as Record<string, string[]>) || {}

    // Generate JWT token pair (access + refresh)
    const tokenPair = generateTokenPair({
      userId: user.id,
      roleId: user.roleId,
      email: user.email,
      role: user.role.name,
      permissions,
    })

    // Store refresh token in session for tracking/revocation
    const legacyToken = signToken({
      userId: user.id,
      roleId: user.roleId,
      email: user.email,
    })

    // Create session with device info for session management
    const session = await createSession({
      userId: user.id,
      token: legacyToken,
      ipAddress,
      userAgent,
    })

    // Record successful login and clear any lockout
    await handleSuccessfulLogin(email, user.id, ipAddress, userAgent)

    // Track login activity and send notification if new device/location
    // Fire and forget - don't block the login response
    processLoginActivity({
      userId: user.id,
      sessionId: session.id,
      ipAddress: ipAddress || "unknown",
      userAgent,
      userName: user.name,
      userEmail: user.email,
      loginNotificationsEnabled: user.loginNotificationsEnabled ?? true,
    }).catch((err) => {
      console.error("[Login] Failed to process login activity:", err)
    })

    // Check password expiry warning
    const expiryWarning = shouldShowExpiryWarning(user.passwordChangedAt)

    // Set cookies
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.name,
        permissions,
        twoFactorEnabled: false,
        passwordChangedAt: user.passwordChangedAt,
      },
      accessToken: tokenPair.accessToken,
      expiresIn: Math.floor(ACCESS_TOKEN_EXPIRY_MS / 1000), // seconds
      // Password expiry warning info
      passwordExpiry: expiryWarning.show
        ? {
            showWarning: true,
            daysRemaining: expiryWarning.daysRemaining,
            expiryDays: PASSWORD_CONFIG.expiryDays,
          }
        : null,
    })

    // Set refresh token as httpOnly cookie
    response.cookies.set("refresh-token", tokenPair.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      expires: tokenPair.refreshTokenExpiresAt,
      path: "/",
    })

    // Keep legacy auth-token cookie for backwards compatibility
    response.cookies.set("auth-token", legacyToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: tokenPair.refreshTokenExpiresAt,
      path: "/",
    })

    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
