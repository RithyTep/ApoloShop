/**
 * Signed URL API
 * US-049: Serve files through signed URLs with expiry
 *
 * Endpoints:
 * - GET /api/uploads/signed-url?key=... - Generate signed URL for file access
 * - POST /api/uploads/signed-url - Verify signed URL parameters
 */

import { NextRequest, NextResponse } from "next/server"
import { getPublicUrl } from "@/lib/r2"
import {
  buildSignedUrl,
  verifySignedUrl,
  DEFAULT_SIGNED_URL_EXPIRY,
  generateSignedUrlParams,
} from "@/lib/secure-upload"

// Base URL for signed URL verification endpoint
const getBaseUrl = (request: NextRequest) => {
  const proto = request.headers.get("x-forwarded-proto") || "https"
  const host = request.headers.get("host") || "localhost:3000"
  return `${proto}://${host}`
}

/**
 * GET /api/uploads/signed-url
 * Generate a signed URL for secure file access
 *
 * Query params:
 * - key: The file key/path in storage (required)
 * - expiresIn: Expiry time in seconds (optional, default 1 hour)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fileKey = searchParams.get("key")
    const expiresIn = searchParams.get("expiresIn")
      ? parseInt(searchParams.get("expiresIn")!, 10)
      : DEFAULT_SIGNED_URL_EXPIRY

    if (!fileKey) {
      return NextResponse.json(
        { error: "File key is required" },
        { status: 400 }
      )
    }

    // Validate expiry time (min 60 seconds, max 7 days)
    const minExpiry = 60
    const maxExpiry = 7 * 24 * 60 * 60 // 7 days
    const validExpiry = Math.max(minExpiry, Math.min(maxExpiry, expiresIn))

    // Generate signed URL parameters
    const { expires, signature } = generateSignedUrlParams(fileKey, validExpiry)

    // Get the public URL for the file
    const publicUrl = getPublicUrl(fileKey)

    // Build signed URL for verification endpoint
    const baseUrl = getBaseUrl(request)
    const signedUrl = buildSignedUrl(
      `${baseUrl}/api/uploads/signed-url/verify`,
      fileKey,
      validExpiry
    )

    return NextResponse.json({
      success: true,
      // Direct public URL (for CDN-served files)
      publicUrl,
      // Signed URL (for verification endpoint)
      signedUrl,
      // Signed parameters (for client-side URL construction)
      signedParams: {
        key: fileKey,
        expires,
        signature,
      },
      // Expiry info
      expiresAt: new Date(expires * 1000).toISOString(),
      expiresIn: validExpiry,
    })
  } catch (error) {
    console.error("Signed URL generation error:", error)
    return NextResponse.json(
      { error: "Failed to generate signed URL" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/uploads/signed-url
 * Verify signed URL parameters
 *
 * Body:
 * - key: File key (required)
 * - expires: Expiry timestamp (required)
 * - signature: HMAC signature (required)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { key, expires, signature } = body

    // Validate required fields
    if (!key || !expires || !signature) {
      return NextResponse.json(
        { error: "Missing required fields: key, expires, signature" },
        { status: 400 }
      )
    }

    // Verify the signed URL
    const verification = verifySignedUrl(key, Number(expires), signature)

    if (!verification.valid) {
      return NextResponse.json(
        {
          valid: false,
          error: verification.error,
        },
        { status: 401 }
      )
    }

    // Return public URL for valid signatures
    const publicUrl = getPublicUrl(key)

    return NextResponse.json({
      valid: true,
      publicUrl,
      // Include remaining time for client reference
      expiresAt: new Date(Number(expires) * 1000).toISOString(),
      remainingSeconds: Number(expires) - Math.floor(Date.now() / 1000),
    })
  } catch (error) {
    console.error("Signed URL verification error:", error)
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    )
  }
}
