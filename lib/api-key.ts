/**
 * API Key Authentication Module
 *
 * Provides utilities for generating, validating, and managing API keys
 * for third-party integrations.
 *
 * Security features:
 * - SHA-256 hashed key storage (keys are never stored in plain text)
 * - Scope-based permissions (read:products, write:orders, etc.)
 * - Rate limiting per key
 * - Key rotation without downtime
 * - Expiration support
 */

import { createHash, randomBytes, timingSafeEqual } from "crypto"
import { prisma } from "./prisma"

// ============================================
// CONFIGURATION
// ============================================

export const API_KEY_CONFIG = {
  // Key format: ak_<prefix>_<random>
  prefix: "ak",
  prefixLength: 8, // Characters after ak_ used for identification
  secretLength: 32, // Random bytes for the secret part
  // Rate limiting defaults
  defaultRateLimit: 60, // Requests per minute
  maxRateLimit: 1000, // Maximum configurable rate limit
  // Key rotation
  rotationGracePeriod: 24 * 60 * 60 * 1000, // 24 hours in ms
}

// ============================================
// SCOPES DEFINITION
// ============================================

/**
 * Available API key scopes
 * Format: action:resource
 */
export const API_KEY_SCOPES = {
  // Products
  "read:products": "Read product information",
  "write:products": "Create and update products",
  "delete:products": "Delete products",
  // Orders
  "read:orders": "Read order information",
  "write:orders": "Create and update orders",
  // Customers
  "read:customers": "Read customer information",
  "write:customers": "Create and update customers",
  // Inventory
  "read:inventory": "Read inventory levels",
  "write:inventory": "Update inventory levels",
  // Categories
  "read:categories": "Read categories",
  "write:categories": "Create and update categories",
  // Settings
  "read:settings": "Read shop settings",
  // Analytics
  "read:analytics": "Read analytics and reports",
  // Webhooks
  "write:webhooks": "Create and manage webhooks",
} as const

export type ApiKeyScope = keyof typeof API_KEY_SCOPES

// Group scopes by resource for UI
export const SCOPE_GROUPS: Record<string, ApiKeyScope[]> = {
  Products: ["read:products", "write:products", "delete:products"],
  Orders: ["read:orders", "write:orders"],
  Customers: ["read:customers", "write:customers"],
  Inventory: ["read:inventory", "write:inventory"],
  Categories: ["read:categories", "write:categories"],
  Settings: ["read:settings"],
  Analytics: ["read:analytics"],
  Webhooks: ["write:webhooks"],
}

// Preset scope bundles
export const SCOPE_PRESETS = {
  readonly: [
    "read:products",
    "read:orders",
    "read:customers",
    "read:inventory",
    "read:categories",
    "read:settings",
    "read:analytics",
  ] as ApiKeyScope[],
  standard: [
    "read:products",
    "write:products",
    "read:orders",
    "write:orders",
    "read:customers",
    "read:inventory",
    "write:inventory",
    "read:categories",
  ] as ApiKeyScope[],
  full: Object.keys(API_KEY_SCOPES) as ApiKeyScope[],
}

// ============================================
// KEY GENERATION
// ============================================

/**
 * Generate a new API key
 * @returns Object with the plain key (show once) and hash (for storage)
 */
export function generateApiKey(): {
  key: string
  keyHash: string
  keyPrefix: string
} {
  // Generate random bytes for the key
  const randomPart = randomBytes(API_KEY_CONFIG.secretLength).toString("base64url")

  // Create the full key with prefix
  const keyPrefix = randomPart.substring(0, API_KEY_CONFIG.prefixLength)
  const key = `${API_KEY_CONFIG.prefix}_${randomPart}`

  // Hash the key for storage
  const keyHash = hashApiKey(key)

  return {
    key, // This is shown to the user ONCE
    keyHash, // This is stored in the database
    keyPrefix: `${API_KEY_CONFIG.prefix}_${keyPrefix}`, // For identification
  }
}

/**
 * Hash an API key using SHA-256
 */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex")
}

/**
 * Verify an API key against a stored hash (timing-safe)
 */
export function verifyApiKeyHash(key: string, storedHash: string): boolean {
  const keyHash = hashApiKey(key)
  try {
    return timingSafeEqual(Buffer.from(keyHash), Buffer.from(storedHash))
  } catch {
    return false
  }
}

// ============================================
// KEY VALIDATION
// ============================================

export interface ApiKeyValidationResult {
  valid: boolean
  error?: string
  errorCode?: string
  apiKey?: {
    id: string
    name: string
    clientId: string | null
    scopes: string[]
    rateLimitPerMinute: number
    isRotated?: boolean // True if validated via previous key during rotation
  }
}

/**
 * Validate an API key and return its details
 */
export async function validateApiKey(
  key: string
): Promise<ApiKeyValidationResult> {
  // Check key format
  if (!key || !key.startsWith(`${API_KEY_CONFIG.prefix}_`)) {
    return {
      valid: false,
      error: "Invalid API key format",
      errorCode: "INVALID_KEY_FORMAT",
    }
  }

  const keyHash = hashApiKey(key)

  // Find the API key in database
  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
  })

  // If not found by primary hash, check previous key (rotation support)
  if (!apiKey) {
    // Try to find by previous key hash (during rotation grace period)
    const rotatingKey = await prisma.apiKey.findFirst({
      where: {
        previousKeyHash: keyHash,
        previousKeyExpiresAt: { gt: new Date() },
      },
    })

    if (rotatingKey) {
      // Key is valid but using the old key during rotation
      return validateApiKeyRecord(rotatingKey, true)
    }

    return {
      valid: false,
      error: "API key not found",
      errorCode: "KEY_NOT_FOUND",
    }
  }

  return validateApiKeyRecord(apiKey, false)
}

/**
 * Validate an API key record from database
 */
function validateApiKeyRecord(
  apiKey: {
    id: string
    name: string
    clientId: string | null
    scopes: unknown
    rateLimitPerMinute: number
    isActive: boolean
    expiresAt: Date | null
  },
  isRotated: boolean
): ApiKeyValidationResult {
  // Check if key is active
  if (!apiKey.isActive) {
    return {
      valid: false,
      error: "API key is disabled",
      errorCode: "KEY_DISABLED",
    }
  }

  // Check expiration
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return {
      valid: false,
      error: "API key has expired",
      errorCode: "KEY_EXPIRED",
    }
  }

  // Parse scopes
  const scopes = Array.isArray(apiKey.scopes)
    ? (apiKey.scopes as string[])
    : []

  return {
    valid: true,
    apiKey: {
      id: apiKey.id,
      name: apiKey.name,
      clientId: apiKey.clientId,
      scopes,
      rateLimitPerMinute: apiKey.rateLimitPerMinute,
      isRotated,
    },
  }
}

// ============================================
// RATE LIMITING
// ============================================

// In-memory rate limit tracking (use Redis for production/distributed)
const rateLimitStore = new Map<
  string,
  { count: number; resetAt: number }
>()

/**
 * Check and update rate limit for an API key
 */
export function checkRateLimit(
  apiKeyId: string,
  limitPerMinute: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minute window

  const existing = rateLimitStore.get(apiKeyId)

  // Start new window if none exists or window expired
  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(apiKeyId, {
      count: 1,
      resetAt: now + windowMs,
    })
    return {
      allowed: true,
      remaining: limitPerMinute - 1,
      resetAt: now + windowMs,
    }
  }

  // Check if limit exceeded
  if (existing.count >= limitPerMinute) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
    }
  }

  // Increment count
  existing.count++
  return {
    allowed: true,
    remaining: limitPerMinute - existing.count,
    resetAt: existing.resetAt,
  }
}

// Cleanup old rate limit entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt <= now) {
      rateLimitStore.delete(key)
    }
  }
}, 60 * 1000) // Clean up every minute

// ============================================
// SCOPE VALIDATION
// ============================================

/**
 * Check if API key has required scope
 */
export function hasScope(keyScopes: string[], requiredScope: ApiKeyScope): boolean {
  return keyScopes.includes(requiredScope)
}

/**
 * Check if API key has any of the required scopes
 */
export function hasAnyScope(keyScopes: string[], requiredScopes: ApiKeyScope[]): boolean {
  return requiredScopes.some(scope => keyScopes.includes(scope))
}

/**
 * Check if API key has all required scopes
 */
export function hasAllScopes(keyScopes: string[], requiredScopes: ApiKeyScope[]): boolean {
  return requiredScopes.every(scope => keyScopes.includes(scope))
}

/**
 * Validate scope format
 */
export function isValidScope(scope: string): scope is ApiKeyScope {
  return scope in API_KEY_SCOPES
}

/**
 * Validate array of scopes
 */
export function validateScopes(scopes: string[]): {
  valid: boolean
  invalidScopes: string[]
} {
  const invalidScopes = scopes.filter(s => !isValidScope(s))
  return {
    valid: invalidScopes.length === 0,
    invalidScopes,
  }
}

// ============================================
// KEY ROTATION
// ============================================

/**
 * Rotate an API key (generate new key while keeping old one valid temporarily)
 */
export async function rotateApiKey(
  apiKeyId: string
): Promise<{
  success: boolean
  newKey?: string
  error?: string
}> {
  const existingKey = await prisma.apiKey.findUnique({
    where: { id: apiKeyId },
  })

  if (!existingKey) {
    return { success: false, error: "API key not found" }
  }

  if (!existingKey.isActive) {
    return { success: false, error: "Cannot rotate a disabled key" }
  }

  // Generate new key
  const { key, keyHash, keyPrefix } = generateApiKey()

  // Update the key with rotation
  await prisma.apiKey.update({
    where: { id: apiKeyId },
    data: {
      keyHash,
      keyPrefix,
      previousKeyHash: existingKey.keyHash,
      previousKeyExpiresAt: new Date(
        Date.now() + API_KEY_CONFIG.rotationGracePeriod
      ),
      updatedAt: new Date(),
    },
  })

  return {
    success: true,
    newKey: key,
  }
}

// ============================================
// USAGE TRACKING
// ============================================

/**
 * Record API key usage (fire-and-forget)
 */
export function recordApiKeyUsage(
  apiKeyId: string,
  endpoint: string,
  method: string,
  ipAddress?: string,
  userAgent?: string,
  statusCode?: number,
  responseTime?: number
): void {
  // Update usage count and last used timestamp (fire-and-forget)
  prisma.apiKey
    .update({
      where: { id: apiKeyId },
      data: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    })
    .catch(() => {}) // Ignore errors

  // Log usage (fire-and-forget)
  prisma.apiKeyUsageLog
    .create({
      data: {
        apiKeyId,
        endpoint,
        method,
        ipAddress,
        userAgent,
        statusCode,
        responseTime,
      },
    })
    .catch(() => {}) // Ignore errors
}

// ============================================
// UTILITIES
// ============================================

/**
 * Extract API key from request headers
 * Supports: Authorization: Bearer ak_xxx or X-API-Key: ak_xxx
 */
export function extractApiKey(headers: Headers): string | null {
  // Check Authorization header
  const authHeader = headers.get("Authorization")
  if (authHeader?.startsWith("Bearer ak_")) {
    return authHeader.substring(7) // Remove "Bearer "
  }

  // Check X-API-Key header
  const apiKeyHeader = headers.get("X-API-Key")
  if (apiKeyHeader?.startsWith("ak_")) {
    return apiKeyHeader
  }

  return null
}

/**
 * Mask an API key for display (show only prefix)
 */
export function maskApiKey(key: string): string {
  if (!key.startsWith("ak_")) return "ak_****"
  const parts = key.split("_")
  if (parts.length < 2) return "ak_****"
  const prefix = parts[1].substring(0, API_KEY_CONFIG.prefixLength)
  return `ak_${prefix}****`
}

/**
 * Get all valid scopes
 */
export function getAllScopes(): Array<{
  scope: ApiKeyScope
  description: string
}> {
  return Object.entries(API_KEY_SCOPES).map(([scope, description]) => ({
    scope: scope as ApiKeyScope,
    description,
  }))
}
