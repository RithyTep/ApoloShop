/**
 * Global API Rate Limiter
 *
 * Provides rate limiting for all API endpoints with:
 * - Default limit: 100 requests per minute per IP
 * - Configurable limits per endpoint
 * - Higher limits for authenticated users
 * - In-memory store (Redis-ready architecture for distributed deployments)
 * - Returns 429 with Retry-After header when exceeded
 */

// ============================================
// CONFIGURATION
// ============================================

export interface RateLimitConfig {
  // Requests allowed per window
  limit: number
  // Window size in milliseconds (default: 60000 = 1 minute)
  windowMs: number
  // Optional custom key generator
  keyGenerator?: (identifier: string, endpoint?: string) => string
}

export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  limit: 100, // 100 requests per minute per IP (default)
  windowMs: 60 * 1000, // 1 minute
}

// Rate limits for different user types
export const RATE_LIMITS = {
  // Anonymous users (by IP)
  anonymous: {
    limit: 100,
    windowMs: 60 * 1000, // 100 req/min
  },
  // Authenticated users (by user ID)
  authenticated: {
    limit: 200,
    windowMs: 60 * 1000, // 200 req/min
  },
  // Admin users
  admin: {
    limit: 500,
    windowMs: 60 * 1000, // 500 req/min
  },
  // Super admin users
  super_admin: {
    limit: 1000,
    windowMs: 60 * 1000, // 1000 req/min
  },
} as const

// Endpoint-specific rate limits (overrides default)
export const ENDPOINT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Authentication endpoints - stricter limits to prevent brute force
  "/api/auth/login": { limit: 10, windowMs: 60 * 1000 }, // 10 req/min
  "/api/auth/forgot-password": { limit: 3, windowMs: 60 * 1000 }, // 3 req/min
  "/api/auth/reset-password": { limit: 5, windowMs: 60 * 1000 }, // 5 req/min
  "/api/auth/send-verification": { limit: 3, windowMs: 60 * 1000 }, // 3 req/min
  "/api/auth/2fa/verify": { limit: 5, windowMs: 60 * 1000 }, // 5 req/min

  // Search endpoint - moderate limit
  "/api/products/search": { limit: 60, windowMs: 60 * 1000 }, // 60 req/min

  // Export/Import - lower limits due to resource intensity
  "/api/products/export": { limit: 10, windowMs: 60 * 1000 }, // 10 req/min
  "/api/products/import": { limit: 5, windowMs: 60 * 1000 }, // 5 req/min
  "/api/reports/sales": { limit: 20, windowMs: 60 * 1000 }, // 20 req/min
  "/api/reports/inventory": { limit: 20, windowMs: 60 * 1000 }, // 20 req/min
  "/api/reports/customers": { limit: 20, windowMs: 60 * 1000 }, // 20 req/min

  // Analytics - moderate limits
  "/api/analytics/search": { limit: 30, windowMs: 60 * 1000 }, // 30 req/min
}

// ============================================
// TYPES
// ============================================

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: number // Unix timestamp in ms
  retryAfter?: number // Seconds until reset (only if not allowed)
}

export interface RateLimitEntry {
  count: number
  resetAt: number
}

// User type for rate limiting
export type RateLimitUserType = "anonymous" | "authenticated" | "admin" | "super_admin"

// ============================================
// IN-MEMORY STORE
// ============================================

/**
 * In-memory rate limit store
 * For production/distributed deployments, replace with Redis implementation
 */
class InMemoryRateLimitStore {
  private store: Map<string, RateLimitEntry> = new Map()
  private cleanupInterval: ReturnType<typeof setInterval> | null = null

  constructor() {
    // Start periodic cleanup
    this.startCleanup()
  }

  /**
   * Get current count for a key, creating entry if needed
   */
  get(key: string, windowMs: number): RateLimitEntry {
    const now = Date.now()
    const existing = this.store.get(key)

    // If no entry or window expired, create new entry
    if (!existing || existing.resetAt <= now) {
      const entry: RateLimitEntry = {
        count: 0,
        resetAt: now + windowMs,
      }
      this.store.set(key, entry)
      return entry
    }

    return existing
  }

  /**
   * Increment count for a key
   */
  increment(key: string, windowMs: number): RateLimitEntry {
    const entry = this.get(key, windowMs)
    entry.count++
    return entry
  }

  /**
   * Reset count for a key
   */
  reset(key: string): void {
    this.store.delete(key)
  }

  /**
   * Get store size (for monitoring)
   */
  size(): number {
    return this.store.size
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanup(): void {
    // Clean up every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      for (const [key, entry] of this.store.entries()) {
        if (entry.resetAt <= now) {
          this.store.delete(key)
        }
      }
    }, 60 * 1000)

    // Allow process to exit even if interval is running
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref()
    }
  }

  /**
   * Stop cleanup (for testing)
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  /**
   * Clear all entries (for testing)
   */
  clear(): void {
    this.store.clear()
  }
}

// Singleton instance
const rateLimitStore = new InMemoryRateLimitStore()

// ============================================
// RATE LIMITER INTERFACE
// ============================================

/**
 * Rate limiter interface for future Redis implementation
 */
export interface IRateLimiter {
  check(key: string, config: RateLimitConfig): Promise<RateLimitResult>
  reset(key: string): Promise<void>
}

// ============================================
// IN-MEMORY RATE LIMITER
// ============================================

/**
 * In-memory rate limiter implementation
 */
class InMemoryRateLimiter implements IRateLimiter {
  async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const { limit, windowMs } = config

    // Increment and get current state
    const entry = rateLimitStore.increment(key, windowMs)

    const remaining = Math.max(0, limit - entry.count)
    const allowed = entry.count <= limit

    const result: RateLimitResult = {
      allowed,
      limit,
      remaining,
      resetAt: entry.resetAt,
    }

    if (!allowed) {
      result.retryAfter = Math.ceil((entry.resetAt - Date.now()) / 1000)
    }

    return result
  }

  async reset(key: string): Promise<void> {
    rateLimitStore.reset(key)
  }
}

// ============================================
// REDIS RATE LIMITER (PLACEHOLDER)
// ============================================

/**
 * Redis rate limiter implementation
 * Uses sliding window algorithm for accurate rate limiting
 *
 * To enable Redis:
 * 1. Install ioredis: bun add ioredis
 * 2. Set REDIS_URL environment variable
 * 3. Uncomment and configure the Redis client below
 */
// import Redis from "ioredis"
//
// class RedisRateLimiter implements IRateLimiter {
//   private redis: Redis
//
//   constructor(redisUrl: string) {
//     this.redis = new Redis(redisUrl)
//   }
//
//   async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
//     const { limit, windowMs } = config
//     const now = Date.now()
//     const windowKey = `ratelimit:${key}`
//
//     // Use Redis transaction for atomic operations
//     const multi = this.redis.multi()
//     multi.zremrangebyscore(windowKey, 0, now - windowMs) // Remove expired entries
//     multi.zadd(windowKey, now, `${now}:${Math.random()}`) // Add current request
//     multi.zcard(windowKey) // Get count
//     multi.pexpire(windowKey, windowMs) // Set expiry
//
//     const results = await multi.exec()
//     const count = (results?.[2]?.[1] as number) || 0
//
//     const remaining = Math.max(0, limit - count)
//     const allowed = count <= limit
//     const resetAt = now + windowMs
//
//     return {
//       allowed,
//       limit,
//       remaining,
//       resetAt,
//       retryAfter: allowed ? undefined : Math.ceil(windowMs / 1000),
//     }
//   }
//
//   async reset(key: string): Promise<void> {
//     await this.redis.del(`ratelimit:${key}`)
//   }
// }

// ============================================
// RATE LIMITER FACTORY
// ============================================

/**
 * Get the appropriate rate limiter based on environment
 */
function getRateLimiter(): IRateLimiter {
  // Check if Redis is configured
  // const redisUrl = process.env.REDIS_URL
  // if (redisUrl) {
  //   return new RedisRateLimiter(redisUrl)
  // }

  // Fall back to in-memory
  return new InMemoryRateLimiter()
}

// Singleton rate limiter instance
const rateLimiter = getRateLimiter()

// ============================================
// KEY GENERATORS
// ============================================

/**
 * Generate rate limit key for anonymous users (by IP)
 */
export function generateAnonymousKey(ip: string, endpoint?: string): string {
  const baseKey = `anon:${ip}`
  return endpoint ? `${baseKey}:${endpoint}` : baseKey
}

/**
 * Generate rate limit key for authenticated users (by user ID)
 */
export function generateAuthenticatedKey(userId: string, endpoint?: string): string {
  const baseKey = `user:${userId}`
  return endpoint ? `${baseKey}:${endpoint}` : baseKey
}

/**
 * Generate rate limit key based on user type
 */
export function generateRateLimitKey(
  identifier: string,
  userType: RateLimitUserType,
  endpoint?: string
): string {
  const prefix = userType === "anonymous" ? "anon" : "user"
  const baseKey = `${prefix}:${identifier}`
  return endpoint ? `${baseKey}:${endpoint}` : baseKey
}

// ============================================
// MAIN RATE LIMIT FUNCTION
// ============================================

/**
 * Check rate limit for a request
 *
 * @param identifier - IP address for anonymous, user ID for authenticated
 * @param userType - Type of user making the request
 * @param endpoint - Optional endpoint path for endpoint-specific limits
 * @param customConfig - Optional custom rate limit config
 */
export async function checkRateLimit(
  identifier: string,
  userType: RateLimitUserType = "anonymous",
  endpoint?: string,
  customConfig?: Partial<RateLimitConfig>
): Promise<RateLimitResult> {
  // Get base config for user type
  let config: RateLimitConfig = { ...RATE_LIMITS[userType] }

  // Check for endpoint-specific limits (only for non-admin users)
  if (endpoint && userType !== "admin" && userType !== "super_admin") {
    const endpointConfig = ENDPOINT_RATE_LIMITS[endpoint]
    if (endpointConfig) {
      config = { ...config, ...endpointConfig }
    }
  }

  // Apply custom config overrides
  if (customConfig) {
    config = { ...config, ...customConfig }
  }

  // Generate key
  const key = generateRateLimitKey(identifier, userType, endpoint)

  // Check rate limit
  return rateLimiter.check(key, config)
}

/**
 * Reset rate limit for a specific key
 * Useful for admin actions or after successful authentication
 */
export async function resetRateLimit(
  identifier: string,
  userType: RateLimitUserType = "anonymous",
  endpoint?: string
): Promise<void> {
  const key = generateRateLimitKey(identifier, userType, endpoint)
  return rateLimiter.reset(key)
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Extract client IP from request headers
 * Handles proxies, load balancers, and direct connections
 */
export function extractClientIP(headers: Headers): string {
  // Check various proxy headers in order of preference
  const forwardedFor = headers.get("x-forwarded-for")
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    const ips = forwardedFor.split(",").map(ip => ip.trim())
    return ips[0] || "unknown"
  }

  const realIP = headers.get("x-real-ip")
  if (realIP) {
    return realIP
  }

  // Cloudflare
  const cfConnectingIP = headers.get("cf-connecting-ip")
  if (cfConnectingIP) {
    return cfConnectingIP
  }

  // Vercel
  const vercelForwardedFor = headers.get("x-vercel-forwarded-for")
  if (vercelForwardedFor) {
    return vercelForwardedFor.split(",")[0]?.trim() || "unknown"
  }

  return "unknown"
}

/**
 * Determine user type from role
 */
export function getUserTypeFromRole(role?: string): RateLimitUserType {
  if (!role) return "anonymous"

  const normalizedRole = role.toLowerCase()

  if (normalizedRole === "super_admin") return "super_admin"
  if (normalizedRole === "admin") return "admin"

  // All authenticated users get "authenticated" rate limit
  return "authenticated"
}

/**
 * Get rate limit config for display in API responses
 */
export function getRateLimitInfo(userType: RateLimitUserType): {
  limit: number
  windowSeconds: number
} {
  const config = RATE_LIMITS[userType]
  return {
    limit: config.limit,
    windowSeconds: config.windowMs / 1000,
  }
}

// ============================================
// EXPORTS FOR TESTING
// ============================================

export const _testing = {
  rateLimitStore,
  rateLimiter,
}
