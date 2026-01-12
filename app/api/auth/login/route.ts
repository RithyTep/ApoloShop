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

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
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

    // Find user with 2FA fields
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    })

    if (!user || !user.isActive) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
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

    await prisma.session.create({
      data: {
        userId: user.id,
        token: legacyToken,
        expiresAt: tokenPair.refreshTokenExpiresAt,
      },
    })

    // Set cookies
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.name,
        permissions,
        twoFactorEnabled: false,
      },
      accessToken: tokenPair.accessToken,
      expiresIn: Math.floor(ACCESS_TOKEN_EXPIRY_MS / 1000), // seconds
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
