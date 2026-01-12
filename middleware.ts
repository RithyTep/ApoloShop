import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Header names for client context injection
const CLIENT_ID_HEADER = "x-client-id"
const CLIENT_SLUG_HEADER = "x-client-slug"

// Default client slug for fallback
const DEFAULT_CLIENT_SLUG = process.env.DEFAULT_CLIENT_SLUG || "default"

// Base domain for subdomain extraction
const BASE_DOMAIN = process.env.BASE_DOMAIN || "apoloshop.com"

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

  // Return response with modified headers
  // API routes can use these headers to resolve client context
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
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
