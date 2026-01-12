import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/reviews - Get all reviews (admin)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100)
    const offset = parseInt(searchParams.get("offset") || "0")
    const status = searchParams.get("status") as "PENDING" | "APPROVED" | "REJECTED" | null
    const productId = searchParams.get("productId")

    // Build where clause
    const whereClause: {
      status?: "PENDING" | "APPROVED" | "REJECTED"
      productId?: string
    } = {}

    if (status && ["PENDING", "APPROVED", "REJECTED"].includes(status)) {
      whereClause.status = status
    }

    if (productId) {
      whereClause.productId = productId
    }

    // Get reviews with pagination
    const [reviews, totalCount, pendingCount] = await Promise.all([
      prisma.review.findMany({
        where: whereClause,
        select: {
          id: true,
          rating: true,
          comment: true,
          status: true,
          guestName: true,
          createdAt: true,
          updatedAt: true,
          product: {
            select: {
              id: true,
              nameEn: true,
              nameKh: true,
              imageUrl: true,
            },
          },
          customer: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.review.count({ where: whereClause }),
      prisma.review.count({ where: { status: "PENDING" } }),
    ])

    return NextResponse.json({
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        status: r.status,
        reviewerName: r.customer?.name || r.guestName || "Anonymous",
        reviewerEmail: r.customer?.email,
        product: r.product,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
      pendingCount,
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
