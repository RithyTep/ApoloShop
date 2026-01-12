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

// User context type
export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
  permissions: Record<string, string[]>
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
