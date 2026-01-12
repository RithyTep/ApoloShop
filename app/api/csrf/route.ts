/**
 * CSRF Token API
 * GET /api/csrf - Get a new CSRF token for the current session
 * POST /api/csrf/validate - Validate a CSRF token (for testing)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  generateCSRFToken,
  extractSessionId,
  CSRF_CONFIG,
  generateCSRFCookieHeader,
  validateCSRFToken,
} from "@/lib/csrf";

/**
 * GET /api/csrf
 * Generate and return a new CSRF token for the current session
 * The token is also set in a cookie for convenience
 */
export async function GET(request: NextRequest) {
  // Extract session ID from auth token
  const sessionId = extractSessionId(request.headers, request.cookies);

  if (!sessionId) {
    return NextResponse.json(
      {
        error: "Authentication required",
        message: "You must be logged in to get a CSRF token",
      },
      { status: 401 }
    );
  }

  // Generate new CSRF token
  const { token, expiresAt } = generateCSRFToken(sessionId);

  // Calculate time until expiry
  const expiresInSeconds = Math.floor((expiresAt - Date.now()) / 1000);

  // Check if we're in production for Secure cookie
  const isProduction = process.env.NODE_ENV === "production";

  // Create response with token
  const response = NextResponse.json({
    token,
    expiresAt,
    expiresIn: expiresInSeconds,
    headerName: CSRF_CONFIG.headerName,
    cookieName: CSRF_CONFIG.cookieName,
  });

  // Set CSRF token cookie
  response.headers.set(
    "Set-Cookie",
    generateCSRFCookieHeader(token, isProduction)
  );

  return response;
}

/**
 * POST /api/csrf
 * Validate a CSRF token (for testing purposes)
 * In production, CSRF validation happens automatically in protected routes
 */
export async function POST(request: NextRequest) {
  const sessionId = extractSessionId(request.headers, request.cookies);

  if (!sessionId) {
    return NextResponse.json(
      {
        error: "Authentication required",
        valid: false,
      },
      { status: 401 }
    );
  }

  // Get token from request body or header
  let token: string | null = null;

  try {
    const body = await request.json();
    token = body.token;
  } catch {
    // Try header if body parsing fails
  }

  if (!token) {
    token = request.headers.get(CSRF_CONFIG.headerName);
  }

  if (!token) {
    return NextResponse.json(
      {
        error: "CSRF token required",
        valid: false,
      },
      { status: 400 }
    );
  }

  // Validate the token
  const result = validateCSRFToken(token, sessionId);

  if (!result.valid) {
    return NextResponse.json(
      {
        error: result.error,
        valid: false,
      },
      { status: 403 }
    );
  }

  // Return validation result
  const response: Record<string, unknown> = {
    valid: true,
    shouldRefresh: result.shouldRefresh,
  };

  // If token should be refreshed, include new token in response
  if (result.shouldRefresh) {
    const newToken = generateCSRFToken(sessionId);
    response.newToken = newToken.token;
    response.newExpiresAt = newToken.expiresAt;
  }

  return NextResponse.json(response);
}
