/**
 * Google OAuth Initiation
 * GET /api/auth/oauth/google - Redirect to Google OAuth
 */

import { NextRequest, NextResponse } from "next/server"
import {
  OAUTH_CONFIG,
  generateOAuthState,
  getGoogleAuthUrl,
  getCallbackUrl,
} from "@/lib/oauth"

export async function GET(request: NextRequest) {
  try {
    // Check if Google OAuth is configured
    if (!OAUTH_CONFIG.google.isConfigured()) {
      return NextResponse.json(
        { error: "Google OAuth is not configured" },
        { status: 503 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const returnUrl = searchParams.get("returnUrl") || "/"
    const linkUserId = searchParams.get("linkUserId") || undefined
    const linkCustomerId = searchParams.get("linkCustomerId") || undefined

    // Generate state parameter with security nonce
    const state = generateOAuthState({
      provider: "google",
      returnUrl,
      linkUserId,
      linkCustomerId,
    })

    // Get base URL for callback
    const baseUrl = new URL(request.url).origin
    const callbackUrl = getCallbackUrl("google", baseUrl)

    // Generate authorization URL
    const authUrl = getGoogleAuthUrl(callbackUrl, state)

    // Redirect to Google OAuth
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error("Google OAuth initiation error:", error)
    return NextResponse.json(
      { error: "Failed to initiate Google OAuth" },
      { status: 500 }
    )
  }
}
