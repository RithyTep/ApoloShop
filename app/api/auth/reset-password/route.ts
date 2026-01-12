/**
 * POST /api/auth/reset-password
 * Reset password using a valid token
 *
 * GET /api/auth/reset-password?token=xxx
 * Validate a reset token (check if still valid)
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import {
  resetPassword,
  validateResetToken,
} from "@/lib/password-reset"
import { extractIpAddress } from "@/lib/account-lockout"
import { PASSWORD_CONFIG, formatPasswordRequirementsError } from "@/lib/password-security"

// Request validation schema
const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z
    .string()
    .min(PASSWORD_CONFIG.minLength, `Password must be at least ${PASSWORD_CONFIG.minLength} characters`)
    .max(PASSWORD_CONFIG.maxLength, `Password must not exceed ${PASSWORD_CONFIG.maxLength} characters`),
})

// GET: Validate token
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json(
        {
          valid: false,
          error: "Reset token is required",
          errorCode: "TOKEN_MISSING",
        },
        { status: 400 }
      )
    }

    const validation = await validateResetToken(token)

    if (!validation.valid) {
      return NextResponse.json(
        {
          valid: false,
          error: validation.error,
          errorCode: validation.errorCode,
        },
        { status: 400 }
      )
    }

    // Don't expose userId in response
    return NextResponse.json({
      valid: true,
      email: validation.email,
    })
  } catch (error) {
    console.error("[ResetPassword] Validation error:", error)
    return NextResponse.json(
      {
        valid: false,
        error: "An unexpected error occurred.",
        errorCode: "INTERNAL_ERROR",
      },
      { status: 500 }
    )
  }
}

// POST: Reset password
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request
    const validation = resetPasswordSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: validation.error.errors[0].message,
          requirements: formatPasswordRequirementsError(),
        },
        { status: 400 }
      )
    }

    const { token, password } = validation.data
    const ipAddress = extractIpAddress(request.headers)

    // Reset password
    const result = await resetPassword(token, password, ipAddress)

    if (!result.success) {
      // Map error codes to appropriate HTTP status
      let status = 400
      if (result.error === "TOKEN_EXPIRED" || result.error === "TOKEN_NOT_FOUND") {
        status = 410 // Gone - token no longer valid
      } else if (result.error === "TOKEN_USED") {
        status = 409 // Conflict - already used
      }

      return NextResponse.json(
        {
          success: false,
          message: result.message,
          errorCode: result.error,
          requirements:
            result.error === "INVALID_PASSWORD"
              ? formatPasswordRequirementsError()
              : undefined,
        },
        { status }
      )
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    })
  } catch (error) {
    console.error("[ResetPassword] Error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "An unexpected error occurred. Please try again later.",
      },
      { status: 500 }
    )
  }
}
