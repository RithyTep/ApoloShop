/**
 * POST /api/auth/forgot-password
 * Request a password reset email
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import {
  requestPasswordReset,
  checkResetRateLimit,
  RESET_CONFIG,
} from "@/lib/password-reset"
import { extractIpAddress } from "@/lib/account-lockout"

// Request validation schema
const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request
    const validation = forgotPasswordSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: validation.error.errors[0].message,
        },
        { status: 400 }
      )
    }

    const { email } = validation.data
    const ipAddress = extractIpAddress(request.headers)
    const userAgent = request.headers.get("user-agent") || undefined

    // Check rate limit first (returns generic message to prevent enumeration)
    const rateLimit = await checkResetRateLimit(email)

    // Request password reset
    const result = await requestPasswordReset(email, ipAddress, userAgent)

    // Build response headers
    const headers: Record<string, string> = {
      "X-RateLimit-Limit": String(RESET_CONFIG.maxRequestsPerHour),
      "X-RateLimit-Remaining": String(rateLimit.remainingRequests),
    }

    if (!rateLimit.allowed && rateLimit.retryAfterMinutes) {
      headers["Retry-After"] = String(rateLimit.retryAfterMinutes * 60)
    }

    // Return appropriate status
    const status = result.success ? 200 : result.error === "RATE_LIMIT_EXCEEDED" ? 429 : 400

    return NextResponse.json(
      {
        success: result.success,
        message: result.message,
      },
      { status, headers }
    )
  } catch (error) {
    console.error("[ForgotPassword] Error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "An unexpected error occurred. Please try again later.",
      },
      { status: 500 }
    )
  }
}
