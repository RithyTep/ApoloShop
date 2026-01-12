/**
 * GET /api/auth/verify-email
 *
 * Verify email using token from verification link
 * Redirects to appropriate page based on result
 */

import { NextRequest, NextResponse } from "next/server"
import {
  verifyEmail,
  validateVerificationToken,
} from "@/lib/email-verification"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    // If no token, redirect to error page
    if (!token) {
      const errorUrl = new URL("/verification-error", request.url)
      errorUrl.searchParams.set("error", "MISSING_TOKEN")
      errorUrl.searchParams.set("message", "Missing verification token")
      return NextResponse.redirect(errorUrl)
    }

    // Verify the email
    const result = await verifyEmail(token)

    // Redirect to appropriate page
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin

    if (result.success) {
      // Redirect to success page
      const successUrl = new URL("/verification-success", baseUrl)
      successUrl.searchParams.set("message", result.message)
      return NextResponse.redirect(successUrl)
    } else {
      // Redirect to error page
      const errorUrl = new URL("/verification-error", baseUrl)
      errorUrl.searchParams.set("error", result.error || "UNKNOWN_ERROR")
      errorUrl.searchParams.set("message", result.message)
      return NextResponse.redirect(errorUrl)
    }
  } catch (error) {
    console.error("[VerifyEmail] Error:", error)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
    const errorUrl = new URL("/verification-error", baseUrl)
    errorUrl.searchParams.set("error", "SERVER_ERROR")
    errorUrl.searchParams.set("message", "An error occurred during verification")
    return NextResponse.redirect(errorUrl)
  }
}

/**
 * POST /api/auth/verify-email
 *
 * Verify email using token (API version that returns JSON)
 * Use this for AJAX verification from frontend
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body as { token?: string }

    // Validate token
    if (!token) {
      return NextResponse.json(
        { error: "Missing verification token" },
        { status: 400 }
      )
    }

    // First validate without verifying (for checking before confirm)
    const validation = await validateVerificationToken(token)

    if (!validation.valid) {
      let statusCode = 400
      if (validation.errorCode === "TOKEN_NOT_FOUND") {
        statusCode = 404
      } else if (validation.errorCode === "TOKEN_EXPIRED") {
        statusCode = 410 // Gone
      } else if (validation.errorCode === "ALREADY_VERIFIED" || validation.errorCode === "TOKEN_USED") {
        statusCode = 409 // Conflict
      }

      return NextResponse.json(
        {
          error: validation.error,
          code: validation.errorCode,
        },
        { status: statusCode }
      )
    }

    // Verify the email
    const result = await verifyEmail(token)

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.message,
          code: result.error,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      accountType: validation.accountType,
      email: validation.email,
    })
  } catch (error) {
    console.error("[VerifyEmail] POST Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
