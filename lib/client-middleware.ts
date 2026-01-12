import { NextRequest, NextResponse } from "next/server"
import { prisma } from "./prisma"

// Client context interface
export interface ClientContext {
  id: string
  name: string
  slug: string
  domain: string | null
  settings: ClientSettings | null
  theme: ClientTheme | null
  isActive: boolean
}

export interface ClientSettings {
  currency?: "USD" | "KHR"
  language?: "EN" | "KH"
  timezone?: string
}

// Client theme for whitelabel branding
export interface ClientTheme {
  primaryColor: string | null
  secondaryColor: string | null
  logoUrl: string | null
  faviconUrl: string | null
}

// Header name for client ID injection
export const CLIENT_ID_HEADER = "x-client-id"
export const CLIENT_SLUG_HEADER = "x-client-slug"

// Default client slug for fallback
const DEFAULT_CLIENT_SLUG = process.env.DEFAULT_CLIENT_SLUG || "default"

// Base domain for subdomain extraction
const BASE_DOMAIN = process.env.BASE_DOMAIN || "apoloshop.com"

/**
 * Extract client identifier from hostname
 * Supports:
 * - Custom domains: shop.example.com
 * - Subdomains: client.apoloshop.com
 */
export function extractClientIdentifier(hostname: string): {
  type: "domain" | "subdomain" | "default"
  value: string
} {
  // Remove port if present
  const host = hostname.split(":")[0]

  // Localhost handling - use query param or default
  if (host === "localhost" || host === "127.0.0.1") {
    return { type: "default", value: DEFAULT_CLIENT_SLUG }
  }

  // Check if it's a subdomain of base domain
  if (host.endsWith(`.${BASE_DOMAIN}`)) {
    const subdomain = host.replace(`.${BASE_DOMAIN}`, "")
    // Ignore www subdomain
    if (subdomain === "www") {
      return { type: "default", value: DEFAULT_CLIENT_SLUG }
    }
    return { type: "subdomain", value: subdomain }
  }

  // Check if it's the base domain itself
  if (host === BASE_DOMAIN || host === `www.${BASE_DOMAIN}`) {
    return { type: "default", value: DEFAULT_CLIENT_SLUG }
  }

  // Otherwise, treat as custom domain
  return { type: "domain", value: host }
}

/**
 * Find client by domain or slug
 */
export async function findClientByIdentifier(
  type: "domain" | "subdomain" | "default",
  value: string
): Promise<ClientContext | null> {
  try {
    let client

    if (type === "domain") {
      // Look up by custom domain
      client = await prisma.client.findUnique({
        where: { domain: value },
        select: {
          id: true,
          name: true,
          slug: true,
          domain: true,
          settings: true,
          primaryColor: true,
          secondaryColor: true,
          logoUrl: true,
          faviconUrl: true,
          isActive: true,
        },
      })
    } else {
      // Look up by slug (subdomain or default)
      client = await prisma.client.findUnique({
        where: { slug: value },
        select: {
          id: true,
          name: true,
          slug: true,
          domain: true,
          settings: true,
          primaryColor: true,
          secondaryColor: true,
          logoUrl: true,
          faviconUrl: true,
          isActive: true,
        },
      })
    }

    if (!client) return null

    return {
      id: client.id,
      name: client.name,
      slug: client.slug,
      domain: client.domain,
      settings: client.settings as ClientSettings | null,
      theme: {
        primaryColor: client.primaryColor,
        secondaryColor: client.secondaryColor,
        logoUrl: client.logoUrl,
        faviconUrl: client.faviconUrl,
      },
      isActive: client.isActive,
    }
  } catch (error) {
    console.error("Error finding client:", error)
    return null
  }
}

/**
 * Parse the client slug header which may contain a domain prefix
 * Middleware sets "domain:shop.example.com" for custom domains
 * or just "client-slug" for subdomains
 */
function parseClientSlugHeader(slugHeader: string): {
  type: "domain" | "subdomain" | "default"
  value: string
} {
  if (slugHeader.startsWith("domain:")) {
    // Custom domain - extract the domain part
    return { type: "domain", value: slugHeader.slice(7) }
  }

  // Regular slug (subdomain or default)
  if (slugHeader === DEFAULT_CLIENT_SLUG) {
    return { type: "default", value: slugHeader }
  }

  return { type: "subdomain", value: slugHeader }
}

/**
 * Get client context from request
 * Checks headers first (injected by middleware), then resolves from hostname
 * Falls back to default client if domain not found
 */
export async function getClientFromRequest(
  request: NextRequest
): Promise<ClientContext | null> {
  // First check if client ID is already in headers (from middleware)
  const clientId = request.headers.get(CLIENT_ID_HEADER)

  if (clientId) {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        slug: true,
        domain: true,
        settings: true,
        primaryColor: true,
        secondaryColor: true,
        logoUrl: true,
        faviconUrl: true,
        isActive: true,
      },
    })

    if (client) {
      return {
        id: client.id,
        name: client.name,
        slug: client.slug,
        domain: client.domain,
        settings: client.settings as ClientSettings | null,
        theme: {
          primaryColor: client.primaryColor,
          secondaryColor: client.secondaryColor,
          logoUrl: client.logoUrl,
          faviconUrl: client.faviconUrl,
        },
        isActive: client.isActive,
      }
    }
  }

  // Check for client slug header (set by middleware)
  const clientSlugHeader = request.headers.get(CLIENT_SLUG_HEADER)

  if (clientSlugHeader) {
    const parsed = parseClientSlugHeader(clientSlugHeader)
    const client = await findClientByIdentifier(parsed.type, parsed.value)

    // If client found, return it
    if (client) {
      return client
    }

    // If not found and it was a custom domain or subdomain, fall back to default
    if (parsed.type !== "default") {
      console.warn(
        `Client not found for ${parsed.type}: ${parsed.value}, falling back to default`
      )
      const defaultClient = await findClientByIdentifier(
        "default",
        DEFAULT_CLIENT_SLUG
      )
      return defaultClient
    }
  }

  // Otherwise, extract from hostname
  const hostname = request.headers.get("host") || ""
  const identifier = extractClientIdentifier(hostname)
  const client = await findClientByIdentifier(identifier.type, identifier.value)

  // Fallback to default client if not found
  if (!client && identifier.type !== "default") {
    console.warn(
      `Client not found for ${identifier.type}: ${identifier.value}, falling back to default`
    )
    return findClientByIdentifier("default", DEFAULT_CLIENT_SLUG)
  }

  return client
}

/**
 * Request type with client context
 */
export type ClientRequest = NextRequest & {
  client?: ClientContext
}

/**
 * Higher-order function to inject client context into API route handlers
 */
export function withClient(
  handler: (
    request: ClientRequest,
    client: ClientContext | null
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const client = await getClientFromRequest(request)
    const clientRequest = request as ClientRequest
    clientRequest.client = client ?? undefined

    return handler(clientRequest, client)
  }
}

/**
 * Higher-order function requiring a valid client
 */
export function requireClient(
  handler: (
    request: ClientRequest,
    client: ClientContext
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const client = await getClientFromRequest(request)

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    if (!client.isActive) {
      return NextResponse.json({ error: "Client is disabled" }, { status: 403 })
    }

    const clientRequest = request as ClientRequest
    clientRequest.client = client

    return handler(clientRequest, client)
  }
}

/**
 * Get client ID for filtering queries
 * Returns null if no client context (for backwards compatibility with single-tenant)
 */
export async function getClientIdForFilter(
  request: NextRequest
): Promise<string | null> {
  const client = await getClientFromRequest(request)
  return client?.id ?? null
}

/**
 * Get client slug from request headers (for use in server components)
 * Parses the middleware-injected header value
 */
export function getClientSlugFromHeaders(
  headers: Headers
): { type: "domain" | "subdomain" | "default"; value: string } | null {
  const slugHeader = headers.get(CLIENT_SLUG_HEADER)
  if (!slugHeader) return null
  return parseClientSlugHeader(slugHeader)
}

/**
 * Create a default client context for when no client is found
 * This ensures the application can still function without a database client record
 */
export function createDefaultClientContext(): ClientContext {
  return {
    id: "default",
    name: "Default Shop",
    slug: DEFAULT_CLIENT_SLUG,
    domain: null,
    settings: null,
    theme: null,
    isActive: true,
  }
}

/**
 * Get client context with guaranteed fallback
 * Never returns null - provides a default context if client not found
 */
export async function getClientFromRequestWithFallback(
  request: NextRequest
): Promise<ClientContext> {
  const client = await getClientFromRequest(request)
  return client ?? createDefaultClientContext()
}
