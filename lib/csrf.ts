/**
 * CSRF (Cross-Site Request Forgery) Protection
 * Generates and validates CSRF tokens tied to sessions
 */

import { randomBytes, createHmac } from "crypto";

// Configuration
export const CSRF_CONFIG = {
  // Token is valid for 1 hour
  tokenExpiryMs: 60 * 60 * 1000,
  // Refresh token when less than 15 minutes remaining
  refreshThresholdMs: 15 * 60 * 1000,
  // Token length in bytes (32 bytes = 64 hex chars)
  tokenLength: 32,
  // Cookie name for CSRF token
  cookieName: "csrf-token",
  // Header name for CSRF token
  headerName: "X-CSRF-Token",
  // Cookie max age (same as token expiry)
  cookieMaxAgeSeconds: 60 * 60,
};

// CSRF secret for HMAC signing (should be set in environment)
const CSRF_SECRET = process.env.CSRF_SECRET || process.env.JWT_SECRET || "csrf-secret-key";

/**
 * CSRF Token structure
 */
export interface CSRFToken {
  token: string;
  expiresAt: number; // Unix timestamp in milliseconds
}

/**
 * Parsed token data
 */
interface TokenData {
  sessionId: string;
  random: string;
  timestamp: number;
}

/**
 * Generate a random string for token
 */
function generateRandomString(length: number = CSRF_CONFIG.tokenLength): string {
  return randomBytes(length).toString("hex");
}

/**
 * Create HMAC signature for token data
 */
function createSignature(data: string): string {
  return createHmac("sha256", CSRF_SECRET).update(data).digest("hex");
}

/**
 * Generate a CSRF token tied to a session
 * Token format: {sessionId}:{random}:{timestamp}:{signature}
 * All encoded as base64 for safe transport
 */
export function generateCSRFToken(sessionId: string): CSRFToken {
  const random = generateRandomString();
  const timestamp = Date.now();
  const expiresAt = timestamp + CSRF_CONFIG.tokenExpiryMs;

  // Create data string for signing
  const data = `${sessionId}:${random}:${timestamp}`;
  const signature = createSignature(data);

  // Combine all parts and encode
  const token = Buffer.from(`${data}:${signature}`).toString("base64url");

  return {
    token,
    expiresAt,
  };
}

/**
 * Parse and validate a CSRF token
 * Returns the token data if valid, null otherwise
 */
export function parseCSRFToken(token: string): TokenData | null {
  try {
    // Decode from base64url
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(":");

    if (parts.length !== 4) {
      return null;
    }

    const [sessionId, random, timestampStr, providedSignature] = parts;
    const timestamp = parseInt(timestampStr, 10);

    if (isNaN(timestamp)) {
      return null;
    }

    // Verify signature
    const data = `${sessionId}:${random}:${timestamp}`;
    const expectedSignature = createSignature(data);

    // Timing-safe comparison to prevent timing attacks
    if (!timingSafeEqual(providedSignature, expectedSignature)) {
      return null;
    }

    return {
      sessionId,
      random,
      timestamp,
    };
  } catch {
    return null;
  }
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Validate a CSRF token against a session
 */
export function validateCSRFToken(
  token: string | null | undefined,
  sessionId: string | null | undefined
): { valid: boolean; error?: string; shouldRefresh?: boolean } {
  if (!token) {
    return { valid: false, error: "CSRF token missing" };
  }

  if (!sessionId) {
    return { valid: false, error: "Session ID missing" };
  }

  const tokenData = parseCSRFToken(token);

  if (!tokenData) {
    return { valid: false, error: "Invalid CSRF token format" };
  }

  // Check if token belongs to this session
  if (tokenData.sessionId !== sessionId) {
    return { valid: false, error: "CSRF token does not match session" };
  }

  // Check if token has expired
  const now = Date.now();
  const expiresAt = tokenData.timestamp + CSRF_CONFIG.tokenExpiryMs;

  if (now > expiresAt) {
    return { valid: false, error: "CSRF token expired" };
  }

  // Check if token should be refreshed
  const shouldRefresh = now > expiresAt - CSRF_CONFIG.refreshThresholdMs;

  return { valid: true, shouldRefresh };
}

/**
 * Extract CSRF token from request headers or cookies
 */
export function extractCSRFToken(
  headers: Headers,
  cookies?: { get: (name: string) => { value: string } | undefined }
): string | null {
  // Try header first (preferred for AJAX requests)
  const headerToken = headers.get(CSRF_CONFIG.headerName);
  if (headerToken) {
    return headerToken;
  }

  // Fall back to cookie
  if (cookies) {
    const cookieToken = cookies.get(CSRF_CONFIG.cookieName)?.value;
    if (cookieToken) {
      return cookieToken;
    }
  }

  return null;
}

/**
 * Extract session ID from request
 * Tries Authorization header (JWT) first, then legacy cookie
 */
export function extractSessionId(
  headers: Headers,
  cookies?: { get: (name: string) => { value: string } | undefined }
): string | null {
  // Try Authorization header (JWT access token)
  const authHeader = headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    // For JWT tokens, use the token itself as session identifier
    // This ties CSRF to the specific access token
    const token = authHeader.substring(7);
    // Use first 32 chars of JWT as session ID (unique per token)
    return token.substring(0, 32);
  }

  // Fall back to legacy session token from cookie
  if (cookies) {
    const sessionToken = cookies.get("auth-token")?.value;
    if (sessionToken) {
      // Use first 32 chars as session ID
      return sessionToken.substring(0, 32);
    }
  }

  return null;
}

/**
 * Check if a request method requires CSRF validation
 */
export function requiresCSRFValidation(method: string): boolean {
  // Only state-changing methods require CSRF protection
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  return !safeMethods.includes(method.toUpperCase());
}

/**
 * Generate a Set-Cookie header value for CSRF token
 */
export function generateCSRFCookieHeader(token: string, secure: boolean = true): string {
  const parts = [
    `${CSRF_CONFIG.cookieName}=${token}`,
    "Path=/",
    `Max-Age=${CSRF_CONFIG.cookieMaxAgeSeconds}`,
    "HttpOnly=false", // Must be accessible to JavaScript for AJAX requests
    "SameSite=Strict",
  ];

  if (secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

/**
 * Get CSRF validation result with detailed error
 */
export interface CSRFValidationResult {
  valid: boolean;
  error?: string;
  errorCode?: CSRFErrorCode;
  shouldRefresh?: boolean;
  newToken?: CSRFToken;
}

export type CSRFErrorCode =
  | "MISSING_TOKEN"
  | "MISSING_SESSION"
  | "INVALID_FORMAT"
  | "SESSION_MISMATCH"
  | "TOKEN_EXPIRED";

/**
 * Full CSRF validation with automatic token refresh
 */
export function validateCSRFRequest(
  headers: Headers,
  cookies: { get: (name: string) => { value: string } | undefined }
): CSRFValidationResult {
  const token = extractCSRFToken(headers, cookies);
  const sessionId = extractSessionId(headers, cookies);

  if (!token) {
    return { valid: false, error: "CSRF token missing", errorCode: "MISSING_TOKEN" };
  }

  if (!sessionId) {
    return { valid: false, error: "Session required for CSRF validation", errorCode: "MISSING_SESSION" };
  }

  const result = validateCSRFToken(token, sessionId);

  if (!result.valid) {
    let errorCode: CSRFErrorCode = "INVALID_FORMAT";
    if (result.error?.includes("expired")) {
      errorCode = "TOKEN_EXPIRED";
    } else if (result.error?.includes("match")) {
      errorCode = "SESSION_MISMATCH";
    }
    return { valid: false, error: result.error, errorCode };
  }

  // Generate new token if refresh needed
  const response: CSRFValidationResult = { valid: true, shouldRefresh: result.shouldRefresh };

  if (result.shouldRefresh) {
    response.newToken = generateCSRFToken(sessionId);
  }

  return response;
}

/**
 * Create CSRF protection middleware response (for use in API routes)
 */
export function createCSRFErrorResponse(errorCode: CSRFErrorCode, error: string): Response {
  const statusCode = errorCode === "TOKEN_EXPIRED" ? 419 : 403;

  return new Response(
    JSON.stringify({
      error,
      code: `CSRF_${errorCode}`,
      message: error,
    }),
    {
      status: statusCode,
      headers: { "Content-Type": "application/json" },
    }
  );
}
