/**
 * IP Whitelisting Service
 *
 * Provides IP address validation and CIDR notation support
 * for restricting admin access to specific IP addresses.
 */

import { prisma } from "./prisma"
import { isSuperAdmin } from "./rbac"

// ============================================
// IP ADDRESS VALIDATION
// ============================================

/**
 * Validate if a string is a valid IPv4 address
 */
export function isValidIPv4(ip: string): boolean {
  const parts = ip.split(".")
  if (parts.length !== 4) return false

  return parts.every((part) => {
    const num = parseInt(part, 10)
    return !isNaN(num) && num >= 0 && num <= 255 && part === num.toString()
  })
}

/**
 * Validate if a string is a valid IPv6 address (simplified check)
 */
export function isValidIPv6(ip: string): boolean {
  // Remove brackets if present
  const cleanIP = ip.replace(/^\[|\]$/g, "")
  const parts = cleanIP.split(":")
  if (parts.length < 3 || parts.length > 8) return false

  // Check for :: shorthand (only one allowed)
  const doubleColonCount = (cleanIP.match(/::/g) || []).length
  if (doubleColonCount > 1) return false

  return parts.every((part) => {
    if (part === "") return true // Empty parts from ::
    return /^[0-9a-fA-F]{1,4}$/.test(part)
  })
}

/**
 * Validate if a string is a valid IP address (IPv4 or IPv6)
 */
export function isValidIP(ip: string): boolean {
  return isValidIPv4(ip) || isValidIPv6(ip)
}

/**
 * Parse CIDR notation and return base IP and prefix length
 * e.g., "192.168.1.0/24" -> { ip: "192.168.1.0", prefixLength: 24 }
 */
export function parseCIDR(cidr: string): { ip: string; prefixLength: number } | null {
  const parts = cidr.split("/")
  if (parts.length !== 2) return null

  const ip = parts[0]
  const prefixLength = parseInt(parts[1], 10)

  if (!isValidIP(ip)) return null
  if (isNaN(prefixLength)) return null

  // IPv4 prefix: 0-32, IPv6 prefix: 0-128
  const maxPrefix = isValidIPv4(ip) ? 32 : 128
  if (prefixLength < 0 || prefixLength > maxPrefix) return null

  return { ip, prefixLength }
}

/**
 * Convert IPv4 address to a 32-bit number
 */
export function ipv4ToNumber(ip: string): number {
  const parts = ip.split(".").map((p) => parseInt(p, 10))
  return (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]
}

/**
 * Check if an IPv4 address matches a CIDR range
 */
export function ipv4MatchesCIDR(ip: string, cidr: string): boolean {
  const parsed = parseCIDR(cidr)
  if (!parsed) return false

  if (!isValidIPv4(ip) || !isValidIPv4(parsed.ip)) return false

  const ipNum = ipv4ToNumber(ip) >>> 0 // Convert to unsigned
  const cidrNum = ipv4ToNumber(parsed.ip) >>> 0

  // Create mask from prefix length
  const mask = parsed.prefixLength === 0 ? 0 : ~((1 << (32 - parsed.prefixLength)) - 1) >>> 0

  return (ipNum & mask) === (cidrNum & mask)
}

/**
 * Check if an IP address matches an IP or CIDR entry
 */
export function ipMatchesEntry(ip: string, entry: string): boolean {
  // Exact match
  if (ip === entry) return true

  // CIDR match (IPv4 only for now)
  if (entry.includes("/") && isValidIPv4(ip)) {
    return ipv4MatchesCIDR(ip, entry)
  }

  return false
}

/**
 * Check if an IP address is in the allowed list
 * Supports both individual IPs and CIDR notation
 */
export function isIPAllowed(ip: string, allowedList: string[]): boolean {
  if (!allowedList || allowedList.length === 0) {
    // No whitelist configured = all IPs allowed
    return true
  }

  return allowedList.some((entry) => ipMatchesEntry(ip, entry.trim()))
}

// ============================================
// IP WHITELIST VALIDATION
// ============================================

export interface IPWhitelistCheckResult {
  allowed: boolean
  reason?: string
  isSuperAdminBypass?: boolean
  blockedIP?: string
}

/**
 * Check if an IP is allowed for a specific user
 * Super admins bypass IP restrictions
 */
export function checkIPWhitelist(
  ip: string,
  allowedIPs: string[] | null | undefined,
  userRole: string
): IPWhitelistCheckResult {
  // Super admins bypass IP restrictions
  if (isSuperAdmin(userRole)) {
    return {
      allowed: true,
      isSuperAdminBypass: true,
    }
  }

  // No whitelist configured = all IPs allowed
  if (!allowedIPs || allowedIPs.length === 0) {
    return { allowed: true }
  }

  // Check if IP is in the allowed list
  if (isIPAllowed(ip, allowedIPs)) {
    return { allowed: true }
  }

  return {
    allowed: false,
    reason: "IP address not in allowed list",
    blockedIP: ip,
  }
}

// ============================================
// IP WHITELIST LOGGING
// ============================================

export interface IPBlockedLogEntry {
  userId: string
  userName: string
  ipAddress: string
  allowedIPs: string[]
  timestamp: Date
  userAgent?: string
  endpoint?: string
}

/**
 * Log blocked IP access attempt to the audit log
 */
export async function logBlockedIPAccess(entry: IPBlockedLogEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        userName: entry.userName,
        action: "LOGIN", // Using LOGIN as the closest action type
        resource: "security",
        resourceId: entry.userId,
        details: {
          type: "ip_blocked",
          blockedIP: entry.ipAddress,
          allowedIPs: entry.allowedIPs,
          userAgent: entry.userAgent,
          endpoint: entry.endpoint,
          message: `Access blocked: IP ${entry.ipAddress} not in allowed list`,
        },
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      },
    })

    // Also log to console for immediate visibility
    console.warn(
      `[IP Whitelist] Blocked access attempt: user=${entry.userName} (${entry.userId}), ip=${entry.ipAddress}, allowed=${entry.allowedIPs.join(", ")}`
    )
  } catch (error) {
    console.error("[IP Whitelist] Failed to log blocked access:", error)
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Extract IP address from request headers
 * Handles various proxy headers
 */
export function extractIPFromHeaders(headers: Headers): string {
  // Try common proxy headers first
  const forwardedFor = headers.get("x-forwarded-for")
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first (client IP)
    return forwardedFor.split(",")[0].trim()
  }

  const realIP = headers.get("x-real-ip")
  if (realIP) {
    return realIP.trim()
  }

  const cfConnectingIP = headers.get("cf-connecting-ip")
  if (cfConnectingIP) {
    return cfConnectingIP.trim()
  }

  // Fallback to localhost
  return "127.0.0.1"
}

/**
 * Validate an array of IP/CIDR entries
 * Returns invalid entries if any
 */
export function validateIPList(entries: string[]): { valid: boolean; invalidEntries: string[] } {
  const invalidEntries: string[] = []

  for (const entry of entries) {
    const trimmed = entry.trim()
    if (!trimmed) continue

    // Check if it's a CIDR notation
    if (trimmed.includes("/")) {
      if (!parseCIDR(trimmed)) {
        invalidEntries.push(trimmed)
      }
    } else {
      // Check if it's a valid IP
      if (!isValidIP(trimmed)) {
        invalidEntries.push(trimmed)
      }
    }
  }

  return {
    valid: invalidEntries.length === 0,
    invalidEntries,
  }
}

/**
 * Format allowed IPs for display
 */
export function formatAllowedIPs(allowedIPs: string[] | null | undefined): string {
  if (!allowedIPs || allowedIPs.length === 0) {
    return "All IPs allowed"
  }
  return allowedIPs.join(", ")
}
