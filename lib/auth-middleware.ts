import { NextRequest, NextResponse } from "next/server"
import {
  verifyToken,
  verifyAccessToken,
  extractBearerToken,
  isTokenExpiredError,
  TokenPayload,
} from "./jwt"
import { prisma } from "./prisma"
import {
  Resource,
  Action,
  checkPermission,
  checkAnyPermission,
  checkAllPermissions,
  isSuperAdmin,
  hasHigherOrEqualRole,
  convertLegacyPermissions,
} from "./rbac"
import { touchSession } from "./session-service"
import {
  validateCSRFRequest,
  requiresCSRFValidation,
  generateCSRFToken,
  generateCSRFCookieHeader,
  extractSessionId,
  CSRF_CONFIG,
  CSRFValidationResult,
} from "./csrf"
import {
  extractApiKey,
  validateApiKey,
  checkRateLimit,
  recordApiKeyUsage,
  hasScope,
  hasAnyScope,
  hasAllScopes,
  ApiKeyScope,
} from "./api-key"
import {
  checkIPWhitelist,
  extractIPFromHeaders,
  logBlockedIPAccess,
} from "./ip-whitelist"

// User context type
export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
  permissions: Record<string, string[]>
  allowedIPs?: string[] | null
}

export type AuthenticatedRequest = NextRequest & {
  user: AuthUser
}

// Auth error codes for client handling
export const AUTH_ERROR_CODES = {
  NO_TOKEN: "NO_TOKEN",
  INVALID_TOKEN: "INVALID_TOKEN",
  ACCESS_TOKEN_EXPIRED: "ACCESS_TOKEN_EXPIRED",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  ACCOUNT_DISABLED: "ACCOUNT_DISABLED",
  INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS",
  IP_NOT_ALLOWED: "IP_NOT_ALLOWED",
  CSRF_MISSING: "CSRF_MISSING",
  CSRF_INVALID: "CSRF_INVALID",
  CSRF_EXPIRED: "CSRF_EXPIRED",
  // API Key errors
  API_KEY_INVALID: "API_KEY_INVALID",
  API_KEY_EXPIRED: "API_KEY_EXPIRED",
  API_KEY_DISABLED: "API_KEY_DISABLED",
  API_KEY_RATE_LIMITED: "API_KEY_RATE_LIMITED",
  API_KEY_INSUFFICIENT_SCOPE: "API_KEY_INSUFFICIENT_SCOPE",
} as const

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES]

/**
 * Verify authentication from request
 * Supports both:
 * - Authorization: Bearer <access_token> header (JWT - preferred)
 * - auth-token cookie (session - legacy fallback)
 */
async function verifyAuthentication(
  request: NextRequest
): Promise<
  | { success: true; user: AuthUser }
  | { success: false; error: string; code: AuthErrorCode; status: number }
> {
  // Try Authorization header first (new JWT flow)
  const authHeader = request.headers.get("Authorization")
  const bearerToken = extractBearerToken(authHeader)

  if (bearerToken) {
    try {
      // Verify JWT access token
      const payload = verifyAccessToken(bearerToken)

      return {
        success: true,
        user: {
          id: payload.userId,
          email: payload.email,
          name: payload.email.split("@")[0], // Fallback name from email
          role: payload.role,
          permissions: payload.permissions,
        },
      }
    } catch (error) {
      if (isTokenExpiredError(error)) {
        return {
          success: false,
          error: "Access token expired",
          code: AUTH_ERROR_CODES.ACCESS_TOKEN_EXPIRED,
          status: 401,
        }
      }
      return {
        success: false,
        error: "Invalid access token",
        code: AUTH_ERROR_CODES.INVALID_TOKEN,
        status: 401,
      }
    }
  }

  // Fallback to legacy auth-token cookie
  const legacyToken = request.cookies.get("auth-token")?.value

  if (!legacyToken) {
    return {
      success: false,
      error: "Authentication required",
      code: AUTH_ERROR_CODES.NO_TOKEN,
      status: 401,
    }
  }

  try {
    verifyToken(legacyToken) as TokenPayload

    // Verify session exists and is valid
    const session = await prisma.session.findUnique({
      where: { token: legacyToken },
      include: {
        user: {
          include: { role: true },
        },
      },
    })

    if (!session || session.expiresAt < new Date() || session.isRevoked) {
      return {
        success: false,
        error: "Session expired",
        code: AUTH_ERROR_CODES.SESSION_EXPIRED,
        status: 401,
      }
    }

    // Update session activity (fire and forget)
    touchSession(session.id).catch(() => {})

    if (!session.user.isActive) {
      return {
        success: false,
        error: "Account disabled",
        code: AUTH_ERROR_CODES.ACCOUNT_DISABLED,
        status: 403,
      }
    }

    return {
      success: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role.name,
        permissions: session.user.role.permissions as Record<string, string[]>,
        allowedIPs: session.user.allowedIPs as string[] | null,
      },
    }
  } catch {
    return {
      success: false,
      error: "Invalid token",
      code: AUTH_ERROR_CODES.INVALID_TOKEN,
      status: 401,
    }
  }
}

/**
 * Higher-order function to protect API routes with authentication
 * Supports both JWT access tokens and legacy session tokens
 */
export function withAuth(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const result = await verifyAuthentication(request)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: result.status }
      )
    }

    // Attach user to request
    const authenticatedRequest = request as AuthenticatedRequest
    authenticatedRequest.user = result.user

    return handler(authenticatedRequest)
  }
}

/**
 * Enhanced withAuth that also supports route params (for dynamic routes)
 */
export function withAuthAndParams(
  handler: (
    request: AuthenticatedRequest,
    context: { params: Promise<Record<string, string>> }
  ) => Promise<NextResponse>
) {
  return async (
    request: NextRequest,
    context: { params: Promise<Record<string, string>> }
  ) => {
    const result = await verifyAuthentication(request)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: result.status }
      )
    }

    // Attach user to request
    const authenticatedRequest = request as AuthenticatedRequest
    authenticatedRequest.user = result.user

    return handler(authenticatedRequest, context)
  }
}

/**
 * Legacy permission check (kept for backwards compatibility)
 * @deprecated Use requireResourcePermission instead
 */
export function requirePermission(resource: string, action: string) {
  return (
    handler: (request: AuthenticatedRequest) => Promise<NextResponse>
  ) => {
    return async (request: AuthenticatedRequest) => {
      const permissions = request.user.permissions

      const resourcePerms = permissions[resource] || []
      if (!resourcePerms.includes(action) && !resourcePerms.includes("*")) {
        return NextResponse.json(
          {
            error: "Insufficient permissions",
            code: AUTH_ERROR_CODES.INSUFFICIENT_PERMISSIONS,
          },
          { status: 403 }
        )
      }

      return handler(request)
    }
  }
}

/**
 * Check if user has specific permission (legacy object format)
 */
export function hasPermission(
  user: AuthUser,
  resource: string,
  action: string
): boolean {
  const resourcePerms = user.permissions[resource] || []
  return resourcePerms.includes(action) || resourcePerms.includes("*")
}

/**
 * Check if user has any of the specified roles
 */
export function hasRole(user: AuthUser, roles: string[]): boolean {
  return roles.includes(user.role)
}

// ============================================
// NEW RBAC PERMISSION MIDDLEWARE
// ============================================

/**
 * Middleware that requires specific resource/action permission
 * Works with both legacy object format and new array format
 */
export function requireResourcePermission(resource: Resource, action: Action) {
  return (
    handler: (request: AuthenticatedRequest) => Promise<NextResponse>
  ) => {
    return async (request: AuthenticatedRequest) => {
      // Super admins bypass all permission checks
      if (isSuperAdmin(request.user.role)) {
        return handler(request)
      }

      const hasAccess = checkPermission(request.user.permissions, resource, action)

      if (!hasAccess) {
        return NextResponse.json(
          {
            error: `Permission denied: ${resource}:${action}`,
            code: AUTH_ERROR_CODES.INSUFFICIENT_PERMISSIONS,
            required: `${resource}:${action}`,
          },
          { status: 403 }
        )
      }

      return handler(request)
    }
  }
}

/**
 * Middleware that requires any of the specified permissions
 */
export function requireAnyPermission(
  permissions: Array<{ resource: Resource; action: Action }>
) {
  return (
    handler: (request: AuthenticatedRequest) => Promise<NextResponse>
  ) => {
    return async (request: AuthenticatedRequest) => {
      // Super admins bypass all permission checks
      if (isSuperAdmin(request.user.role)) {
        return handler(request)
      }

      const hasAccess = checkAnyPermission(request.user.permissions, permissions)

      if (!hasAccess) {
        return NextResponse.json(
          {
            error: "Permission denied",
            code: AUTH_ERROR_CODES.INSUFFICIENT_PERMISSIONS,
            required: permissions.map(p => `${p.resource}:${p.action}`),
          },
          { status: 403 }
        )
      }

      return handler(request)
    }
  }
}

/**
 * Middleware that requires all specified permissions
 */
export function requireAllPermissions(
  permissions: Array<{ resource: Resource; action: Action }>
) {
  return (
    handler: (request: AuthenticatedRequest) => Promise<NextResponse>
  ) => {
    return async (request: AuthenticatedRequest) => {
      // Super admins bypass all permission checks
      if (isSuperAdmin(request.user.role)) {
        return handler(request)
      }

      const hasAccess = checkAllPermissions(request.user.permissions, permissions)

      if (!hasAccess) {
        return NextResponse.json(
          {
            error: "Permission denied",
            code: AUTH_ERROR_CODES.INSUFFICIENT_PERMISSIONS,
            required: permissions.map(p => `${p.resource}:${p.action}`),
          },
          { status: 403 }
        )
      }

      return handler(request)
    }
  }
}

/**
 * Middleware that requires a specific role or higher
 */
export function requireRole(requiredRole: string) {
  return (
    handler: (request: AuthenticatedRequest) => Promise<NextResponse>
  ) => {
    return async (request: AuthenticatedRequest) => {
      if (!hasHigherOrEqualRole(request.user.role, requiredRole)) {
        return NextResponse.json(
          {
            error: "Insufficient role privileges",
            code: AUTH_ERROR_CODES.INSUFFICIENT_PERMISSIONS,
            required: requiredRole,
            current: request.user.role,
          },
          { status: 403 }
        )
      }

      return handler(request)
    }
  }
}

/**
 * Middleware that requires super_admin role
 */
export function requireSuperAdmin() {
  return (
    handler: (request: AuthenticatedRequest) => Promise<NextResponse>
  ) => {
    return async (request: AuthenticatedRequest) => {
      if (!isSuperAdmin(request.user.role)) {
        return NextResponse.json(
          {
            error: "Super admin access required",
            code: AUTH_ERROR_CODES.INSUFFICIENT_PERMISSIONS,
          },
          { status: 403 }
        )
      }

      return handler(request)
    }
  }
}

/**
 * Check if user can access a resource/action (helper for inline checks)
 */
export function canAccess(
  user: AuthUser,
  resource: Resource,
  action: Action
): boolean {
  if (isSuperAdmin(user.role)) {
    return true
  }
  return checkPermission(user.permissions, resource, action)
}

/**
 * Get user's permissions as array format
 * Converts legacy object format to array if needed
 */
export function getUserPermissionsArray(user: AuthUser): string[] {
  const perms = user.permissions
  if (Array.isArray(perms)) {
    return perms
  }
  return convertLegacyPermissions(perms)
}

/**
 * Helper to extract user from request without requiring auth
 * Supports both JWT access tokens and legacy session tokens
 */
export async function getOptionalUser(
  request: NextRequest
): Promise<AuthUser | null> {
  // Try Authorization header first (new JWT flow)
  const authHeader = request.headers.get("Authorization")
  const bearerToken = extractBearerToken(authHeader)

  if (bearerToken) {
    try {
      const payload = verifyAccessToken(bearerToken)
      return {
        id: payload.userId,
        email: payload.email,
        name: payload.email.split("@")[0],
        role: payload.role,
        permissions: payload.permissions,
      }
    } catch {
      // Token invalid or expired, try legacy fallback
    }
  }

  // Fallback to legacy auth-token cookie
  try {
    const token = request.cookies.get("auth-token")?.value
    if (!token) return null

    verifyToken(token)

    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          include: { role: true },
        },
      },
    })

    if (!session || session.expiresAt < new Date() || !session.user.isActive) {
      return null
    }

    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role.name,
      permissions: session.user.role.permissions as Record<string, string[]>,
    }
  } catch {
    return null
  }
}

// ============================================
// CSRF PROTECTION MIDDLEWARE
// ============================================

/**
 * Higher-order function to protect API routes with CSRF validation
 * Only validates on state-changing requests (POST, PUT, DELETE, PATCH)
 * GET, HEAD, OPTIONS requests are allowed without CSRF token
 */
export function withCSRF(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    // Skip CSRF validation for safe methods
    if (!requiresCSRFValidation(request.method)) {
      return handler(request)
    }

    // Validate CSRF token
    const result = validateCSRFRequest(request.headers, request.cookies)

    if (!result.valid) {
      const errorCode = getCSRFErrorCode(result)
      // Use 419 for expired tokens (Laravel convention) or 403 for other errors
      const status = result.errorCode === "TOKEN_EXPIRED" ? 419 : 403

      return NextResponse.json(
        {
          error: result.error,
          code: errorCode,
        },
        { status }
      )
    }

    // Call the handler
    const response = await handler(request)

    // If token should be refreshed, add new token to response
    if (result.shouldRefresh && result.newToken) {
      const isProduction = process.env.NODE_ENV === "production"
      response.headers.set(
        "Set-Cookie",
        generateCSRFCookieHeader(result.newToken.token, isProduction)
      )
      // Also include in response header for AJAX clients
      response.headers.set("X-CSRF-Token-Refresh", result.newToken.token)
      response.headers.set(
        "X-CSRF-Token-Expires",
        result.newToken.expiresAt.toString()
      )
    }

    return response
  }
}

/**
 * Combined withAuth and withCSRF middleware
 * Use this for protected routes that need both authentication and CSRF protection
 */
export function withAuthAndCSRF(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withAuth(
    withCSRF(handler as (request: NextRequest) => Promise<NextResponse>) as (
      request: AuthenticatedRequest
    ) => Promise<NextResponse>
  )
}

/**
 * Map CSRF validation result to AUTH_ERROR_CODES
 */
function getCSRFErrorCode(result: CSRFValidationResult): AuthErrorCode {
  if (result.errorCode === "MISSING_TOKEN") {
    return AUTH_ERROR_CODES.CSRF_MISSING
  }
  if (result.errorCode === "TOKEN_EXPIRED") {
    return AUTH_ERROR_CODES.CSRF_EXPIRED
  }
  return AUTH_ERROR_CODES.CSRF_INVALID
}

/**
 * Validate CSRF token manually within a route handler
 * Returns validation result that can be used for custom error handling
 */
export function validateCSRF(request: NextRequest): CSRFValidationResult {
  return validateCSRFRequest(request.headers, request.cookies)
}

/**
 * Generate a new CSRF token for the current session
 * Useful for including in initial page load or after login
 */
export function getCSRFToken(request: NextRequest): {
  token: string
  expiresAt: number
} | null {
  const sessionId = extractSessionId(request.headers, request.cookies)

  if (!sessionId) {
    return null
  }

  return generateCSRFToken(sessionId)
}

/**
 * Skip CSRF validation for specific routes or conditions
 * Use as a wrapper around handlers that shouldn't require CSRF
 */
export function withoutCSRF(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return handler
}

// ============================================
// API KEY AUTHENTICATION MIDDLEWARE
// ============================================

/**
 * API Key context type
 */
export interface ApiKeyContext {
  id: string
  name: string
  clientId: string | null
  scopes: string[]
  rateLimitPerMinute: number
}

export type ApiKeyAuthenticatedRequest = NextRequest & {
  apiKey: ApiKeyContext
}

/**
 * Higher-order function to protect API routes with API key authentication
 * Validates API key, checks rate limits, and records usage
 */
export function withApiKey(
  handler: (request: ApiKeyAuthenticatedRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const startTime = Date.now()

    // Extract API key from request
    const key = extractApiKey(request.headers)

    if (!key) {
      return NextResponse.json(
        {
          error: "API key required",
          code: AUTH_ERROR_CODES.NO_TOKEN,
          hint: "Include API key in Authorization: Bearer ak_xxx or X-API-Key: ak_xxx header",
        },
        { status: 401 }
      )
    }

    // Validate the API key
    const validation = await validateApiKey(key)

    if (!validation.valid || !validation.apiKey) {
      const errorCode = mapApiKeyErrorCode(validation.errorCode)
      return NextResponse.json(
        {
          error: validation.error,
          code: errorCode,
        },
        { status: 401 }
      )
    }

    const apiKeyContext = validation.apiKey

    // Check rate limit
    const rateLimit = checkRateLimit(
      apiKeyContext.id,
      apiKeyContext.rateLimitPerMinute
    )

    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000)
      const response = NextResponse.json(
        {
          error: "Rate limit exceeded",
          code: AUTH_ERROR_CODES.API_KEY_RATE_LIMITED,
          retryAfter,
        },
        { status: 429 }
      )
      response.headers.set("Retry-After", retryAfter.toString())
      response.headers.set(
        "X-RateLimit-Limit",
        apiKeyContext.rateLimitPerMinute.toString()
      )
      response.headers.set("X-RateLimit-Remaining", "0")
      response.headers.set(
        "X-RateLimit-Reset",
        Math.ceil(rateLimit.resetAt / 1000).toString()
      )
      return response
    }

    // Attach API key context to request
    const authenticatedRequest = request as ApiKeyAuthenticatedRequest
    authenticatedRequest.apiKey = apiKeyContext

    // Call handler
    let response: NextResponse
    let statusCode: number | undefined
    try {
      response = await handler(authenticatedRequest)
      statusCode = response.status
    } catch (error) {
      statusCode = 500
      throw error
    } finally {
      // Record usage (fire-and-forget)
      const responseTime = Date.now() - startTime
      recordApiKeyUsage(
        apiKeyContext.id,
        request.nextUrl.pathname,
        request.method,
        request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip") ||
          undefined,
        request.headers.get("user-agent") || undefined,
        statusCode,
        responseTime
      )
    }

    // Add rate limit headers to response
    response.headers.set(
      "X-RateLimit-Limit",
      apiKeyContext.rateLimitPerMinute.toString()
    )
    response.headers.set(
      "X-RateLimit-Remaining",
      rateLimit.remaining.toString()
    )
    response.headers.set(
      "X-RateLimit-Reset",
      Math.ceil(rateLimit.resetAt / 1000).toString()
    )

    return response
  }
}

/**
 * Middleware that requires specific API key scope(s)
 */
export function requireApiKeyScope(scope: ApiKeyScope) {
  return (
    handler: (request: ApiKeyAuthenticatedRequest) => Promise<NextResponse>
  ) => {
    return async (request: ApiKeyAuthenticatedRequest) => {
      if (!hasScope(request.apiKey.scopes, scope)) {
        return NextResponse.json(
          {
            error: `Insufficient scope: ${scope} required`,
            code: AUTH_ERROR_CODES.API_KEY_INSUFFICIENT_SCOPE,
            required: scope,
            granted: request.apiKey.scopes,
          },
          { status: 403 }
        )
      }

      return handler(request)
    }
  }
}

/**
 * Middleware that requires any of the specified API key scopes
 */
export function requireAnyApiKeyScope(scopes: ApiKeyScope[]) {
  return (
    handler: (request: ApiKeyAuthenticatedRequest) => Promise<NextResponse>
  ) => {
    return async (request: ApiKeyAuthenticatedRequest) => {
      if (!hasAnyScope(request.apiKey.scopes, scopes)) {
        return NextResponse.json(
          {
            error: "Insufficient scope",
            code: AUTH_ERROR_CODES.API_KEY_INSUFFICIENT_SCOPE,
            required: scopes,
            granted: request.apiKey.scopes,
          },
          { status: 403 }
        )
      }

      return handler(request)
    }
  }
}

/**
 * Middleware that requires all specified API key scopes
 */
export function requireAllApiKeyScopes(scopes: ApiKeyScope[]) {
  return (
    handler: (request: ApiKeyAuthenticatedRequest) => Promise<NextResponse>
  ) => {
    return async (request: ApiKeyAuthenticatedRequest) => {
      if (!hasAllScopes(request.apiKey.scopes, scopes)) {
        return NextResponse.json(
          {
            error: "Insufficient scopes",
            code: AUTH_ERROR_CODES.API_KEY_INSUFFICIENT_SCOPE,
            required: scopes,
            granted: request.apiKey.scopes,
            missing: scopes.filter(s => !request.apiKey.scopes.includes(s)),
          },
          { status: 403 }
        )
      }

      return handler(request)
    }
  }
}

/**
 * Helper to check API key scope inline
 */
export function apiKeyHasScope(
  apiKey: ApiKeyContext,
  scope: ApiKeyScope
): boolean {
  return hasScope(apiKey.scopes, scope)
}

/**
 * Map API key validation error codes to AUTH_ERROR_CODES
 */
function mapApiKeyErrorCode(errorCode?: string): AuthErrorCode {
  switch (errorCode) {
    case "KEY_EXPIRED":
      return AUTH_ERROR_CODES.API_KEY_EXPIRED
    case "KEY_DISABLED":
      return AUTH_ERROR_CODES.API_KEY_DISABLED
    case "INVALID_KEY_FORMAT":
    case "KEY_NOT_FOUND":
    default:
      return AUTH_ERROR_CODES.API_KEY_INVALID
  }
}

/**
 * Combined middleware that supports both user auth (JWT/session) and API key auth
 * Tries API key first, falls back to user auth
 * Useful for endpoints that should support both authentication methods
 */
export function withAuthOrApiKey(
  handler: (
    request: NextRequest & { user?: AuthUser; apiKey?: ApiKeyContext }
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    // Try API key first
    const apiKey = extractApiKey(request.headers)

    if (apiKey) {
      // Use API key authentication
      return withApiKey(handler as (request: ApiKeyAuthenticatedRequest) => Promise<NextResponse>)(request)
    }

    // Fall back to user authentication
    return withAuth(handler as (request: AuthenticatedRequest) => Promise<NextResponse>)(request)
  }
}

// ============================================
// IP WHITELISTING MIDDLEWARE
// ============================================

/**
 * Middleware that enforces IP whitelisting for admin routes
 * Super admins bypass IP restrictions
 * Must be used AFTER withAuth
 */
export function withIPWhitelist(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (request: AuthenticatedRequest) => {
    const clientIP = extractIPFromHeaders(request.headers)
    const user = request.user

    // Check IP whitelist
    const result = checkIPWhitelist(clientIP, user.allowedIPs, user.role)

    if (!result.allowed) {
      // Log the blocked access attempt
      logBlockedIPAccess({
        userId: user.id,
        userName: user.name,
        ipAddress: clientIP,
        allowedIPs: user.allowedIPs || [],
        timestamp: new Date(),
        userAgent: request.headers.get("user-agent") || undefined,
        endpoint: request.nextUrl.pathname,
      }).catch(() => {}) // Fire and forget

      return NextResponse.json(
        {
          error: "Access denied: IP address not in allowed list",
          code: AUTH_ERROR_CODES.IP_NOT_ALLOWED,
          clientIP,
        },
        { status: 403 }
      )
    }

    return handler(request)
  }
}

/**
 * Combined middleware: auth + IP whitelist
 * Use this for admin routes that require IP whitelisting
 */
export function withAuthAndIPWhitelist(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withAuth(withIPWhitelist(handler))
}

/**
 * Combined middleware: auth + IP whitelist + CSRF
 * Use this for protected admin routes with state-changing operations
 */
export function withAuthIPWhitelistAndCSRF(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withAuth(
    withIPWhitelist(
      withCSRF(handler as (request: NextRequest) => Promise<NextResponse>) as (
        request: AuthenticatedRequest
      ) => Promise<NextResponse>
    )
  )
}

/**
 * Fetch user's allowed IPs from database
 * Useful for JWT flows where allowedIPs isn't in the token
 */
export async function getUserAllowedIPs(userId: string): Promise<string[] | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { allowedIPs: true },
  })
  return user?.allowedIPs as string[] | null
}

/**
 * Update user's allowed IPs
 * Returns true if successful, false otherwise
 */
export async function updateUserAllowedIPs(
  userId: string,
  allowedIPs: string[] | null
): Promise<boolean> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { allowedIPs },
    })
    return true
  } catch {
    return false
  }
}
