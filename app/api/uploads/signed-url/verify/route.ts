/**
 * Signed URL Verification Endpoint
 * US-049: Secure file serving through signed URLs
 *
 * This endpoint verifies the signature and redirects to the actual file
 * if valid, or returns an error if invalid/expired.
 */

import { NextRequest, NextResponse } from "next/server"
import { getPublicUrl } from "@/lib/r2"
import { verifySignedUrl } from "@/lib/secure-upload"

/**
 * GET /api/uploads/signed-url/verify
 * Verify signed URL and redirect to file or return error
 *
 * Query params:
 * - key: File key (required)
 * - expires: Expiry timestamp (required)
 * - signature: HMAC signature (required)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get("key")
    const expires = searchParams.get("expires")
    const signature = searchParams.get("signature")

    // Validate required parameters
    if (!key || !expires || !signature) {
      return NextResponse.json(
        { error: "Missing required parameters: key, expires, signature" },
        { status: 400 }
      )
    }

    // Verify the signed URL
    const verification = verifySignedUrl(key, Number(expires), signature)

    if (!verification.valid) {
      return NextResponse.json(
        {
          error: verification.error || "Invalid signature",
          code: verification.error?.includes("expired") ? "EXPIRED" : "INVALID_SIGNATURE",
        },
        { status: 403 }
      )
    }

    // Get the public URL and redirect
    const publicUrl = getPublicUrl(key)

    // Use 302 redirect to preserve caching behavior
    return NextResponse.redirect(publicUrl, {
      status: 302,
      headers: {
        // Cache the redirect briefly to reduce load
        "Cache-Control": "private, max-age=60",
        // Security headers
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
      },
    })
  } catch (error) {
    console.error("Signed URL verification error:", error)
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    )
  }
}
