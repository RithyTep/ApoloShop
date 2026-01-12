import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Security constants
const MAX_QUERY_LENGTH = 100
const MAX_LIMIT = 50
const RATE_LIMIT_WINDOW = 60 // seconds
const RATE_LIMIT_MAX_REQUESTS = 60 // requests per window

// Simple in-memory rate limiter (per IP, resets every minute)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

// Sanitize input to prevent XSS - strips HTML tags and dangerous characters
function sanitizeInput(input: string): string {
  return input
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/[<>"'`]/g, "") // Remove potentially dangerous characters
    .trim()
}

// Check if query contains suspicious patterns
function isSuspiciousQuery(query: string): boolean {
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+=/i, // onclick=, onerror=, etc.
    /data:/i,
    /vbscript:/i,
    /expression\(/i,
  ]
  return suspiciousPatterns.some((pattern) => pattern.test(query))
}

// Get client IP from request
function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim()
  }
  return request.headers.get("x-real-ip") || "unknown"
}

// Check rate limit for IP
function checkRateLimit(ip: string): {
  allowed: boolean
  remaining: number
  resetTime: number
} {
  const now = Date.now()
  const windowMs = RATE_LIMIT_WINDOW * 1000

  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetTime) {
    // New window
    const resetTime = now + windowMs
    rateLimitMap.set(ip, { count: 1, resetTime })
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetTime }
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime }
  }

  entry.count++
  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - entry.count,
    resetTime: entry.resetTime,
  }
}

// GET /api/products/search - Search products by name and description
export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request)

  // Check rate limit
  const rateLimit = checkRateLimit(clientIp)
  const rateLimitHeaders = {
    "X-RateLimit-Limit": RATE_LIMIT_MAX_REQUESTS.toString(),
    "X-RateLimit-Remaining": rateLimit.remaining.toString(),
    "X-RateLimit-Reset": Math.ceil(rateLimit.resetTime / 1000).toString(),
  }

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: rateLimitHeaders }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const rawQuery = searchParams.get("q") || ""
    const rawLimit = searchParams.get("limit")

    // Validate query length
    if (rawQuery.length > MAX_QUERY_LENGTH) {
      return NextResponse.json(
        {
          error: `Query too long. Maximum length is ${MAX_QUERY_LENGTH} characters.`,
        },
        { status: 400, headers: rateLimitHeaders }
      )
    }

    // Check for suspicious/malformed queries
    if (isSuspiciousQuery(rawQuery)) {
      console.warn(`Suspicious search query from ${clientIp}: ${rawQuery}`)
      return NextResponse.json(
        { error: "Invalid query format." },
        { status: 400, headers: rateLimitHeaders }
      )
    }

    // Sanitize the query
    const query = sanitizeInput(rawQuery)

    // Validate and sanitize limit parameter
    let limit = 10
    if (rawLimit !== null) {
      const parsedLimit = parseInt(rawLimit, 10)
      if (isNaN(parsedLimit) || parsedLimit < 1) {
        return NextResponse.json(
          { error: "Invalid limit parameter. Must be a positive integer." },
          { status: 400, headers: rateLimitHeaders }
        )
      }
      limit = Math.min(parsedLimit, MAX_LIMIT)
    }

    // Handle empty query gracefully
    if (!query) {
      return NextResponse.json(
        {
          products: [],
          query: "",
          total: 0,
        },
        { headers: rateLimitHeaders }
      )
    }

    // Search in nameEn, nameKh, descriptionEn, descriptionKh fields
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { nameEn: { contains: query, mode: "insensitive" } },
          { nameKh: { contains: query, mode: "insensitive" } },
          { descriptionEn: { contains: query, mode: "insensitive" } },
          { descriptionKh: { contains: query, mode: "insensitive" } },
        ],
      },
      include: {
        category: {
          select: {
            id: true,
            nameEn: true,
            nameKh: true,
            slug: true,
          },
        },
      },
      take: limit,
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(
      {
        products,
        query,
        total: products.length,
      },
      { headers: rateLimitHeaders }
    )
  } catch (error) {
    console.error("Search products error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: rateLimitHeaders }
    )
  }
}
