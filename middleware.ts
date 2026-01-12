import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Header names for client context injection
const CLIENT_ID_HEADER = "x-client-id"
const CLIENT_SLUG_HEADER = "x-client-slug"

// Default client slug for fallback
const DEFAULT_CLIENT_SLUG = process.env.DEFAULT_CLIENT_SLUG || "default"

// Base domain for subdomain extraction
const BASE_DOMAIN = process.env.BASE_DOMAIN || "apoloshop.com"

// Environment check
const isProduction = process.env.NODE_ENV === "production"
const isDevelopment = process.env.NODE_ENV === "development"

/**
 * Generate Content Security Policy (CSP) directives
 * Restricts which resources can be loaded on the page
 */
function generateCSP(): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      ...(isDevelopment ? ["'unsafe-eval'"] : []),
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      ...(isDevelopment ? ["ws://localhost:*", "wss://localhost:*"] : []),
      "https://api.telegram.org",
    ],
    "media-src": ["'self'"],
    "object-src": ["'none'"],
    "frame-ancestors": ["'none'"],
    "form-action": ["'self'"],
    "base-uri": ["'self'"],
    "manifest-src": ["'self'"],
    "worker-src": ["'self'", "blob:"],
    "child-src": ["'self'", "blob:"],
  }

  return Object.entries(directives)
    .map(([directive, values]) => `${directive} ${values.join(" ")}`)
    .join("; ")
}

/**
 * Generate Permissions Policy header
 * Controls which browser features can be used
 */
function generatePermissionsPolicy(): string {
  const policies: Record<string, string[]> = {
    camera: ["self"],
    microphone: [],
    geolocation: ["self"],
    payment: ["self"],
    usb: [],
    fullscreen: ["self"],
    "display-capture": [],
    accelerometer: [],
    gyroscope: [],
    magnetometer: [],
    "picture-in-picture": ["self"],
    "interest-cohort": [],
  }

  return Object.entries(policies)
    .map(([feature, allowList]) => {
      if (allowList.length === 0) {
        return `${feature}=()`
      }
      return `${feature}=(${allowList.join(" ")})`
    })
    .join(", ")
}

/**
 * Apply security headers to a response
 * Implements OWASP recommended security headers
 */
function applySecurityHeaders(response: NextResponse): void {
  // Content Security Policy - restricts resource loading
  response.headers.set("Content-Security-Policy", generateCSP())

  // Prevent MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff")

  // Prevent clickjacking - page cannot be embedded in frames
  response.headers.set("X-Frame-Options", "DENY")

  // HSTS - force HTTPS (only in production)
  response.headers.set(
    "Strict-Transport-Security",
    isProduction ? "max-age=31536000; includeSubDomains; preload" : "max-age=0"
  )

  // XSS Protection - legacy but useful for older browsers
  response.headers.set("X-XSS-Protection", "1; mode=block")

  // Permissions Policy - control browser features
  response.headers.set("Permissions-Policy", generatePermissionsPolicy())

  // Referrer Policy - control referrer information
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")

  // DNS Prefetch Control
  response.headers.set("X-DNS-Prefetch-Control", "on")
}

/**
 * Extract client identifier from hostname
 * NOTE: This is a lightweight version for edge runtime
 * Database lookup happens in API routes via client-middleware.ts
 */
function extractClientSlug(hostname: string): string {
  // Remove port if present
  const host = hostname.split(":")[0]

  // Localhost handling
  if (host === "localhost" || host === "127.0.0.1") {
    return DEFAULT_CLIENT_SLUG
  }

  // Check if it's a subdomain of base domain
  if (host.endsWith(`.${BASE_DOMAIN}`)) {
    const subdomain = host.replace(`.${BASE_DOMAIN}`, "")
    // Ignore www subdomain
    if (subdomain === "www") {
      return DEFAULT_CLIENT_SLUG
    }
    return subdomain
  }

  // For custom domains, we pass the full domain as the slug
  // The API routes will look it up by domain field
  if (host !== BASE_DOMAIN && host !== `www.${BASE_DOMAIN}`) {
    // Prefix with 'domain:' to indicate this is a domain lookup
    return `domain:${host}`
  }

  return DEFAULT_CLIENT_SLUG
}

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || ""
  const clientSlug = extractClientSlug(hostname)

  // Clone the request headers and add client context
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(CLIENT_SLUG_HEADER, clientSlug)

  // Create response with modified request headers
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  // Apply security headers to all responses
  applySecurityHeaders(response)

  return response
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    // Match all API routes
    "/api/:path*",
    // Match shop pages
    "/shop/:path*",
    // Skip static files, images, and internal Next.js routes
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*|_next).*)",
  ],
}
