import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/products/[id]/reviews - Get reviews for a product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50)
    const offset = parseInt(searchParams.get("offset") || "0")
    const includeUnapproved = searchParams.get("includeUnapproved") === "true"

    // Validate product ID
    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 })
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Build where clause
    const whereClause: {
      productId: string
      status?: "APPROVED"
    } = { productId }

    // Only show approved reviews unless admin requests all
    if (!includeUnapproved) {
      whereClause.status = "APPROVED"
    }

    // Get reviews with pagination
    const [reviews, totalCount] = await Promise.all([
      prisma.review.findMany({
        where: whereClause,
        select: {
          id: true,
          rating: true,
          comment: true,
          status: true,
          guestName: true,
          createdAt: true,
          customer: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.review.count({ where: whereClause }),
    ])

    // Calculate average rating (only from approved reviews)
    const ratingStats = await prisma.review.aggregate({
      where: { productId, status: "APPROVED" },
      _avg: { rating: true },
      _count: { rating: true },
    })

    // Get rating distribution
    const ratingDistribution = await prisma.review.groupBy({
      by: ["rating"],
      where: { productId, status: "APPROVED" },
      _count: { rating: true },
      orderBy: { rating: "desc" },
    })

    // Convert to distribution object
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    for (const r of ratingDistribution) {
      distribution[r.rating] = r._count.rating
    }

    return NextResponse.json({
      productId,
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        status: r.status,
        reviewerName: r.customer?.name || r.guestName || "Anonymous",
        createdAt: r.createdAt,
      })),
      stats: {
        averageRating: ratingStats._avg.rating || 0,
        totalReviews: ratingStats._count.rating,
        distribution,
      },
      pagination: {
        total: totalCount,
        offset,
        limit,
        hasMore: offset + reviews.length < totalCount,
      },
    })
  } catch (error) {
    console.error("Get reviews error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/products/[id]/reviews - Create a new review
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params
    const body = await request.json()

    // Validate product ID
    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 })
    }

    // Validate required fields
    const { rating, comment, customerId, guestName } = body

    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be a number between 1 and 5" },
        { status: 400 }
      )
    }

    // Require either customerId or guestName
    if (!customerId && !guestName) {
      return NextResponse.json(
        { error: "Either customerId or guestName is required" },
        { status: 400 }
      )
    }

    // Validate guestName length
    if (guestName && (typeof guestName !== "string" || guestName.length > 100)) {
      return NextResponse.json(
        { error: "Guest name must be a string of max 100 characters" },
        { status: 400 }
      )
    }

    // Validate comment length
    if (comment && (typeof comment !== "string" || comment.length > 2000)) {
      return NextResponse.json(
        { error: "Comment must be a string of max 2000 characters" },
        { status: 400 }
      )
    }

    // Check if product exists and is active
    const product = await prisma.product.findUnique({
      where: { id: productId, isActive: true },
      select: { id: true },
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // If customerId provided, validate it exists
    if (customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { id: true },
      })
      if (!customer) {
        return NextResponse.json({ error: "Customer not found" }, { status: 404 })
      }

      // Check for duplicate review from same customer
      const existingReview = await prisma.review.findFirst({
        where: { productId, customerId },
      })
      if (existingReview) {
        return NextResponse.json(
          { error: "You have already reviewed this product" },
          { status: 409 }
        )
      }
    }

    // Sanitize comment (basic XSS prevention)
    const sanitizedComment = comment
      ? comment
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#x27;")
          .trim()
      : null

    const sanitizedGuestName = guestName
      ? guestName
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#x27;")
          .trim()
      : null

    // Create the review (default status is PENDING for moderation)
    const review = await prisma.review.create({
      data: {
        productId,
        customerId: customerId || null,
        guestName: sanitizedGuestName,
        rating,
        comment: sanitizedComment,
        status: "PENDING",
      },
      select: {
        id: true,
        rating: true,
        comment: true,
        status: true,
        guestName: true,
        createdAt: true,
        customer: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(
      {
        message: "Review submitted successfully. It will be visible after moderation.",
        review: {
          id: review.id,
          rating: review.rating,
          comment: review.comment,
          status: review.status,
          reviewerName: review.customer?.name || review.guestName || "Anonymous",
          createdAt: review.createdAt,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Create review error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
