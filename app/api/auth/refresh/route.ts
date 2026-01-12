import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  verifyRefreshToken,
  signAccessToken,
  signRefreshToken,
  isTokenExpiredError,
  ACCESS_TOKEN_EXPIRY_MS,
  REFRESH_TOKEN_EXPIRY_MS,
} from "@/lib/jwt"

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token from httpOnly cookie
 *
 * Returns new access token and optionally rotates refresh token
 */
export async function POST(request: NextRequest) {
  try {
    // Get refresh token from httpOnly cookie
    const refreshToken = request.cookies.get("refresh-token")?.value

    if (!refreshToken) {
      return NextResponse.json(
        { error: "Refresh token not found" },
        { status: 401 }
      )
    }

    // Verify refresh token
    let payload
    try {
      payload = verifyRefreshToken(refreshToken)
    } catch (error) {
      // Handle expired refresh token
      if (isTokenExpiredError(error)) {
        const response = NextResponse.json(
          { error: "Refresh token expired", code: "REFRESH_TOKEN_EXPIRED" },
          { status: 401 }
        )
        // Clear the expired refresh token cookie
        response.cookies.delete("refresh-token")
        response.cookies.delete("auth-token")
        return response
      }
      // Handle invalid token
      return NextResponse.json(
        { error: "Invalid refresh token" },
        { status: 401 }
      )
    }

    // Get user with role from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { role: true },
    })

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "User not found or inactive" },
        { status: 401 }
      )
    }

    // Parse permissions from role
    const permissions = (user.role.permissions as Record<string, string[]>) || {}

    // Generate new access token
    const newAccessToken = signAccessToken({
      userId: user.id,
      roleId: user.roleId,
      email: user.email,
      role: user.role.name,
      permissions,
    })

    // Check if refresh token is close to expiry (less than 1 day left)
    // If so, rotate the refresh token for better security
    const refreshTokenExp = payload.exp ? payload.exp * 1000 : 0
    const oneDayMs = 24 * 60 * 60 * 1000
    const shouldRotateRefreshToken = refreshTokenExp - Date.now() < oneDayMs

    let newRefreshToken = refreshToken
    let refreshTokenExpiresAt = new Date(refreshTokenExp)

    if (shouldRotateRefreshToken) {
      newRefreshToken = signRefreshToken(user.id)
      refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS)
    }

    // Create response
    const response = NextResponse.json({
      accessToken: newAccessToken,
      expiresIn: Math.floor(ACCESS_TOKEN_EXPIRY_MS / 1000), // seconds
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.name,
        permissions,
      },
    })

    // Update refresh token cookie if rotated
    if (shouldRotateRefreshToken) {
      response.cookies.set("refresh-token", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        expires: refreshTokenExpiresAt,
        path: "/",
      })
    }

    return response
  } catch (error) {
    console.error("Token refresh error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
