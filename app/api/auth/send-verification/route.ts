/**
 * POST /api/auth/send-verification
 *
 * Send verification email to user or customer
 * Supports both authenticated users and customers
 */

import { NextRequest, NextResponse } from "next/server"
import {
  sendUserVerificationEmail,
  sendCustomerVerificationEmail,
  getVerificationStatus,
  type AccountType,
} from "@/lib/email-verification"

// Extract IP from request headers
function getIpAddress(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accountType, accountId } = body as {
      accountType?: AccountType
      accountId?: string
    }

    // Validate required fields
    if (!accountType || !accountId) {
      return NextResponse.json(
        { error: "Missing required fields: accountType and accountId" },
        { status: 400 }
      )
    }

    // Validate account type
    if (accountType !== "user" && accountType !== "customer") {
      return NextResponse.json(
        { error: "Invalid accountType. Must be 'user' or 'customer'" },
        { status: 400 }
      )
    }

    const ipAddress = getIpAddress(request)
    const userAgent = request.headers.get("user-agent") || undefined

    // Send verification email based on account type
    const result = accountType === "user"
      ? await sendUserVerificationEmail(accountId, ipAddress, userAgent)
      : await sendCustomerVerificationEmail(accountId, ipAddress, userAgent)

    if (!result.success) {
      // Determine appropriate status code
      let statusCode = 400
      if (result.error === "RATE_LIMIT_EXCEEDED") {
        statusCode = 429
      } else if (result.error === "USER_NOT_FOUND" || result.error === "CUSTOMER_NOT_FOUND") {
        statusCode = 404
      } else if (result.error === "ALREADY_VERIFIED") {
        statusCode = 409 // Conflict - already verified
      }

      return NextResponse.json(
        {
          error: result.message,
          code: result.error,
        },
        { status: statusCode }
      )
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    })
  } catch (error) {
    console.error("[SendVerification] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/auth/send-verification
 *
 * Get verification status for an account
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountType = searchParams.get("accountType") as AccountType | null
    const accountId = searchParams.get("accountId")

    // Validate required params
    if (!accountType || !accountId) {
      return NextResponse.json(
        { error: "Missing required params: accountType and accountId" },
        { status: 400 }
      )
    }

    // Validate account type
    if (accountType !== "user" && accountType !== "customer") {
      return NextResponse.json(
        { error: "Invalid accountType. Must be 'user' or 'customer'" },
        { status: 400 }
      )
    }

    const status = await getVerificationStatus(accountType, accountId)

    if (!status) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      status: {
        email: status.email,
        emailVerified: status.emailVerified,
        verifiedAt: status.verifiedAt?.toISOString() || null,
        canResend: status.canResend,
        remainingResends: status.remainingResends,
      },
    })
  } catch (error) {
    console.error("[SendVerification] GET Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
