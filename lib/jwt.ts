import jwt, { JwtPayload, TokenExpiredError } from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET!
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET + "_refresh"

// Token expiry durations
export const ACCESS_TOKEN_EXPIRY = "15m" // 15 minutes
export const REFRESH_TOKEN_EXPIRY = "7d" // 7 days
export const ACCESS_TOKEN_EXPIRY_MS = 15 * 60 * 1000 // 15 minutes in ms
export const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000 // 7 days in ms

// Token types
export type TokenType = "access" | "refresh"

// Base payload interface
export interface TokenPayload {
  userId: string
  roleId: string
  email: string
}

// Extended payload with role and permissions (for access tokens)
export interface AccessTokenPayload extends TokenPayload {
  type: "access"
  role: string
  permissions: Record<string, string[]>
}

// Refresh token payload (minimal data)
export interface RefreshTokenPayload {
  userId: string
  type: "refresh"
  tokenVersion?: number // For token revocation support
}

// Combined decoded token type
export type DecodedToken = (AccessTokenPayload | RefreshTokenPayload) & JwtPayload

// Token pair for login response
export interface TokenPair {
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt: Date
  refreshTokenExpiresAt: Date
}

/**
 * Sign an access token with user info, role, and permissions
 */
export function signAccessToken(payload: {
  userId: string
  roleId: string
  email: string
  role: string
  permissions: Record<string, string[]>
}): string {
  const tokenPayload: Omit<AccessTokenPayload, keyof JwtPayload> = {
    userId: payload.userId,
    roleId: payload.roleId,
    email: payload.email,
    role: payload.role,
    permissions: payload.permissions,
    type: "access",
  }
  return jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY })
}

/**
 * Sign a refresh token with minimal user info
 */
export function signRefreshToken(userId: string, tokenVersion?: number): string {
  const tokenPayload: RefreshTokenPayload = {
    userId,
    type: "refresh",
    tokenVersion,
  }
  return jwt.sign(tokenPayload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY })
}

/**
 * Generate a token pair (access + refresh) for login
 */
export function generateTokenPair(payload: {
  userId: string
  roleId: string
  email: string
  role: string
  permissions: Record<string, string[]>
  tokenVersion?: number
}): TokenPair {
  const accessToken = signAccessToken(payload)
  const refreshToken = signRefreshToken(payload.userId, payload.tokenVersion)

  const now = Date.now()
  return {
    accessToken,
    refreshToken,
    accessTokenExpiresAt: new Date(now + ACCESS_TOKEN_EXPIRY_MS),
    refreshTokenExpiresAt: new Date(now + REFRESH_TOKEN_EXPIRY_MS),
  }
}

/**
 * Verify an access token
 * @throws TokenExpiredError if token is expired
 * @throws JsonWebTokenError if token is invalid
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, JWT_SECRET) as AccessTokenPayload
  if (decoded.type !== "access") {
    throw new Error("Invalid token type: expected access token")
  }
  return decoded
}

/**
 * Verify a refresh token
 * @throws TokenExpiredError if token is expired
 * @throws JsonWebTokenError if token is invalid
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload & JwtPayload {
  const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as RefreshTokenPayload & JwtPayload
  if (decoded.type !== "refresh") {
    throw new Error("Invalid token type: expected refresh token")
  }
  return decoded
}

/**
 * Check if a token error is due to expiration
 */
export function isTokenExpiredError(error: unknown): error is TokenExpiredError {
  return error instanceof TokenExpiredError
}

/**
 * Legacy function for backwards compatibility - signs a token with 7d expiry
 * @deprecated Use signAccessToken or generateTokenPair instead
 */
export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" })
}

/**
 * Legacy function for backwards compatibility - verifies any token
 * @deprecated Use verifyAccessToken or verifyRefreshToken instead
 */
export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload
}

/**
 * Decode a token without verifying (for inspection)
 */
export function decodeToken(token: string): DecodedToken | null {
  try {
    return jwt.decode(token) as DecodedToken | null
  } catch {
    return null
  }
}

/**
 * Extract token from Authorization header
 * Supports: "Bearer <token>" format
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null
  const parts = authHeader.split(" ")
  if (parts.length !== 2 || parts[0] !== "Bearer") return null
  return parts[1]
}
