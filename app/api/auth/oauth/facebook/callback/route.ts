/**
 * Facebook OAuth Callback
 * GET /api/auth/oauth/facebook/callback - Handle Facebook OAuth callback
 */

import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import {
  OAUTH_CONFIG,
  verifyOAuthState,
  exchangeFacebookCode,
  fetchFacebookProfile,
  getCallbackUrl,
} from "@/lib/oauth"
import {
  processOAuthLogin,
  linkSocialAccountToUser,
  linkSocialAccountToCustomer,
} from "@/lib/oauth-service"
import { extractIpAddress } from "@/lib/account-lockout"
import { REFRESH_TOKEN_EXPIRY_MS } from "@/lib/jwt"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")
  const errorDescription = searchParams.get("error_description")

  // Handle OAuth errors from Facebook
  if (error) {
    console.error("Facebook OAuth error:", error, errorDescription)
    const errorUrl = new URL("/login", request.url)
    errorUrl.searchParams.set("error", "oauth_denied")
    errorUrl.searchParams.set("provider", "facebook")
    if (errorDescription) {
      errorUrl.searchParams.set("message", errorDescription)
    }
    return NextResponse.redirect(errorUrl)
  }

  // Validate required parameters
  if (!code || !state) {
    const errorUrl = new URL("/login", request.url)
    errorUrl.searchParams.set("error", "missing_params")
    return NextResponse.redirect(errorUrl)
  }

  try {
    // Verify state parameter
    const stateData = verifyOAuthState(state)
    if (!stateData || stateData.provider !== "facebook") {
      const errorUrl = new URL("/login", request.url)
      errorUrl.searchParams.set("error", "invalid_state")
      return NextResponse.redirect(errorUrl)
    }

    // Check if Facebook OAuth is configured
    if (!OAUTH_CONFIG.facebook.isConfigured()) {
      const errorUrl = new URL("/login", request.url)
      errorUrl.searchParams.set("error", "provider_not_configured")
      return NextResponse.redirect(errorUrl)
    }

    // Get callback URL
    const baseUrl = new URL(request.url).origin
    const callbackUrl = getCallbackUrl("facebook", baseUrl)

    // Exchange code for tokens
    const tokens = await exchangeFacebookCode(code, callbackUrl)

    // Fetch user profile
    const profile = await fetchFacebookProfile(tokens.accessToken)

    // Determine action based on state
    const returnUrl = stateData.returnUrl || "/"
    const cookieStore = await cookies()

    // If linking to existing account
    if (stateData.linkUserId) {
      const linkResult = await linkSocialAccountToUser(
        stateData.linkUserId,
        profile,
        tokens
      )

      if (!linkResult.success) {
        const errorUrl = new URL(returnUrl, request.url)
        errorUrl.searchParams.set("error", linkResult.errorCode || "link_failed")
        errorUrl.searchParams.set("message", linkResult.error || "Failed to link account")
        return NextResponse.redirect(errorUrl)
      }

      // Redirect with success
      const successUrl = new URL(returnUrl, request.url)
      successUrl.searchParams.set("linked", "facebook")
      return NextResponse.redirect(successUrl)
    }

    if (stateData.linkCustomerId) {
      const linkResult = await linkSocialAccountToCustomer(
        stateData.linkCustomerId,
        profile,
        tokens
      )

      if (!linkResult.success) {
        const errorUrl = new URL(returnUrl, request.url)
        errorUrl.searchParams.set("error", linkResult.errorCode || "link_failed")
        errorUrl.searchParams.set("message", linkResult.error || "Failed to link account")
        return NextResponse.redirect(errorUrl)
      }

      // Redirect with success
      const successUrl = new URL(returnUrl, request.url)
      successUrl.searchParams.set("linked", "facebook")
      return NextResponse.redirect(successUrl)
    }

    // Process OAuth login (create/link/login)
    const ipAddress = extractIpAddress(request.headers)
    const userAgent = request.headers.get("user-agent") || undefined

    const result = await processOAuthLogin(profile, tokens, {
      ipAddress,
      userAgent,
    })

    if (!result.success) {
      const errorUrl = new URL("/login", request.url)
      errorUrl.searchParams.set("error", result.errorCode || "oauth_failed")
      errorUrl.searchParams.set("message", result.error || "OAuth login failed")
      return NextResponse.redirect(errorUrl)
    }

    // Build success redirect URL
    const successUrl = new URL(returnUrl, request.url)

    if (result.isNewAccount) {
      successUrl.searchParams.set("newAccount", "true")
    }
    if (result.isLinked) {
      successUrl.searchParams.set("linked", "facebook")
    }

    // Create response with redirect
    const response = NextResponse.redirect(successUrl)

    // Set auth cookies if we got a user (admin login)
    if (result.accessToken && result.user) {
      const refreshTokenExpiry = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS)

      // Store OAuth login info in cookie for client
      cookieStore.set("oauth-login", JSON.stringify({
        provider: "facebook",
        isNew: result.isNewAccount,
        isLinked: result.isLinked,
        userType: "admin",
        userId: result.user.id,
      }), {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: new Date(Date.now() + 60 * 1000), // 1 minute
        path: "/",
      })

      response.cookies.set("auth-token", result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: refreshTokenExpiry,
        path: "/",
      })
    }

    // Set customer session if we got a customer
    if (result.customer) {
      cookieStore.set("oauth-login", JSON.stringify({
        provider: "facebook",
        isNew: result.isNewAccount,
        isLinked: result.isLinked,
        userType: "customer",
        customerId: result.customer.id,
        customerName: result.customer.name,
      }), {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: new Date(Date.now() + 60 * 1000), // 1 minute
        path: "/",
      })
    }

    return response
  } catch (error) {
    console.error("Facebook OAuth callback error:", error)
    const errorUrl = new URL("/login", request.url)
    errorUrl.searchParams.set("error", "oauth_failed")
    errorUrl.searchParams.set("message", error instanceof Error ? error.message : "OAuth login failed")
    return NextResponse.redirect(errorUrl)
  }
}
