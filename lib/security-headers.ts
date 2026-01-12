/**
 * Security Headers Configuration
 *
 * Implements OWASP recommended security headers for defense in depth
 */

// Environment-specific configuration
const isDevelopment = process.env.NODE_ENV === "development"
const isProduction = process.env.NODE_ENV === "production"

// Base domain for CSP
const baseDomain = process.env.NEXT_PUBLIC_BASE_URL || "localhost:3000"

/**
 * Content Security Policy (CSP) directives
 * Restricts which resources can be loaded on the page
 */
export function generateCSP(): string {
  const directives: Record<string, string[]> = {
    // Default fallback - only same origin
    "default-src": ["'self'"],

    // Scripts - allow self, inline (needed for Next.js), and eval in dev
    "script-src": [
      "'self'",
      "'unsafe-inline'", // Required for Next.js inline scripts
      ...(isDevelopment ? ["'unsafe-eval'"] : []), // Hot reload in dev
    ],

    // Styles - allow self and inline (needed for Tailwind/emotion)
    "style-src": [
      "'self'",
      "'unsafe-inline'", // Required for Tailwind CSS and dynamic styles
    ],

    // Images - allow self, data URIs, and blob (for dynamic images)
    "img-src": [
      "'self'",
      "data:",
      "blob:",
      "https:", // Allow HTTPS images (product images, etc.)
    ],

    // Fonts - allow self and data URIs
    "font-src": [
      "'self'",
      "data:",
    ],

    // Connect - XHR, WebSocket, Fetch destinations
    "connect-src": [
      "'self'",
      ...(isDevelopment ? ["ws://localhost:*", "wss://localhost:*"] : []),
      "https://api.telegram.org", // Telegram notifications
    ],

    // Media - audio/video sources
    "media-src": ["'self'"],

    // Objects - plugins, Flash, etc. - block all
    "object-src": ["'none'"],

    // Frames - where this page can be embedded
    "frame-ancestors": ["'none'"],

    // Forms - where forms can submit to
    "form-action": ["'self'"],

    // Base URI - restrict base tag
    "base-uri": ["'self'"],

    // Manifest - PWA manifest
    "manifest-src": ["'self'"],

    // Workers - service workers and web workers
    "worker-src": ["'self'", "blob:"],

    // Child frames - iframes, frame, embed
    "child-src": ["'self'", "blob:"],
  }

  // Build CSP string
  return Object.entries(directives)
    .map(([directive, values]) => `${directive} ${values.join(" ")}`)
    .join("; ")
}

/**
 * Permissions Policy (formerly Feature Policy)
 * Controls which browser features can be used
 */
export function generatePermissionsPolicy(): string {
  const policies: Record<string, string[]> = {
    // Camera - needed for barcode scanning (future feature)
    camera: ["self"],

    // Microphone - disable for now
    microphone: [],

    // Geolocation - for store locator feature
    geolocation: ["self"],

    // Payment - for payment integrations
    payment: ["self"],

    // USB - disable
    usb: [],

    // Fullscreen - allow for product images
    fullscreen: ["self"],

    // Display capture - disable
    "display-capture": [],

    // Accelerometer - disable
    accelerometer: [],

    // Gyroscope - disable
    gyroscope: [],

    // Magnetometer - disable
    magnetometer: [],

    // Picture in picture - allow for videos
    "picture-in-picture": ["self"],

    // Document domain - legacy, disable
    "document-domain": [],

    // Interest cohort (FLoC) - opt out
    "interest-cohort": [],
  }

  // Build Permissions-Policy string
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
 * All security headers to be applied
 */
export interface SecurityHeaders {
  "Content-Security-Policy": string
  "X-Content-Type-Options": string
  "X-Frame-Options": string
  "Strict-Transport-Security": string
  "X-XSS-Protection": string
  "Permissions-Policy": string
  "Referrer-Policy": string
  "X-DNS-Prefetch-Control": string
}

/**
 * Generate all security headers
 */
export function getSecurityHeaders(): SecurityHeaders {
  return {
    // Content Security Policy - restricts resource loading
    "Content-Security-Policy": generateCSP(),

    // Prevent MIME type sniffing
    "X-Content-Type-Options": "nosniff",

    // Prevent clickjacking - page cannot be embedded in frames
    "X-Frame-Options": "DENY",

    // HSTS - force HTTPS for 1 year, include subdomains
    // Only apply in production to avoid localhost issues
    "Strict-Transport-Security": isProduction
      ? "max-age=31536000; includeSubDomains; preload"
      : "max-age=0",

    // XSS Protection - legacy but still useful for older browsers
    // mode=block prevents rendering if XSS detected
    "X-XSS-Protection": "1; mode=block",

    // Permissions Policy - control browser features
    "Permissions-Policy": generatePermissionsPolicy(),

    // Referrer Policy - control referrer information sent
    "Referrer-Policy": "strict-origin-when-cross-origin",

    // DNS Prefetch Control - prevent DNS prefetching leaks
    "X-DNS-Prefetch-Control": "on",
  }
}

/**
 * Apply security headers to a response
 * For use in API routes and middleware
 */
export function applySecurityHeaders(headers: Headers): void {
  const securityHeaders = getSecurityHeaders()

  Object.entries(securityHeaders).forEach(([header, value]) => {
    headers.set(header, value)
  })
}

/**
 * Get headers as plain object for Next.js config
 * Used in next.config.js headers() function
 */
export function getSecurityHeadersArray(): Array<{ key: string; value: string }> {
  const securityHeaders = getSecurityHeaders()

  return Object.entries(securityHeaders).map(([key, value]) => ({
    key,
    value,
  }))
}

/**
 * CSP nonce generation for inline scripts
 * Note: For full CSP with nonces, use Next.js middleware or a custom server
 */
export function generateNonce(): string {
  // Generate a random nonce using crypto
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, "")
  }
  // Fallback for edge runtime
  return Math.random().toString(36).substring(2, 18) + Date.now().toString(36)
}

/**
 * Report-only CSP for testing
 * Use this to test CSP without breaking functionality
 */
export function getReportOnlyCSP(): string {
  const csp = generateCSP()
  // Add report-uri if configured
  const reportUri = process.env.CSP_REPORT_URI
  if (reportUri) {
    return `${csp}; report-uri ${reportUri}`
  }
  return csp
}
