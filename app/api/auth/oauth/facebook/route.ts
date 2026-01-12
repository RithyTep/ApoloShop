/**
 * Facebook OAuth Initiation
 * GET /api/auth/oauth/facebook - Redirect to Facebook OAuth
 */

import { NextRequest, NextResponse } from "next/server"
import {
  OAUTH_CONFIG,
  generateOAuthState,
  getFacebookAuthUrl,
  getCallbackUrl,
} from "@/lib/oauth"

export async function GET(request: NextRequest) {
  try {
    // Check if Facebook OAuth is configured
    if (!OAUTH_CONFIG.facebook.isConfigured()) {
      return NextResponse.json(
        { error: "Facebook OAuth is not configured" },
        { status: 503 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const returnUrl = searchParams.get("returnUrl") || "/"
    const linkUserId = searchParams.get("linkUserId") || undefined
    const linkCustomerId = searchParams.get("linkCustomerId") || undefined

    // Generate state parameter with security nonce
    const state = generateOAuthState({
      provider: "facebook",
      returnUrl,
      linkUserId,
      linkCustomerId,
    })

    // Get base URL for callback
    const baseUrl = new URL(request.url).origin
    const callbackUrl = getCallbackUrl("facebook", baseUrl)

    // Generate authorization URL
    const authUrl = getFacebookAuthUrl(callbackUrl, state)

    // Redirect to Facebook OAuth
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error("Facebook OAuth initiation error:", error)
    return NextResponse.json(
      { error: "Failed to initiate Facebook OAuth" },
      { status: 500 }
    )
  }
}
