import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/questions - Admin: Get all questions (for moderation)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100)
    const offset = parseInt(searchParams.get("offset") || "0")
    const status = searchParams.get("status") // PENDING, APPROVED, REJECTED
    const productId = searchParams.get("productId")

    // Build where clause
    const whereClause: {
      status?: "PENDING" | "APPROVED" | "REJECTED"
      productId?: string
    } = {}

    if (status && ["PENDING", "APPROVED", "REJECTED"].includes(status)) {
      whereClause.status = status as "PENDING" | "APPROVED" | "REJECTED"
    }

    if (productId) {
      whereClause.productId = productId
    }

    // Get questions with product info
    const [questions, totalCount, statusCounts] = await Promise.all([
      prisma.productQuestion.findMany({
        where: whereClause,
        select: {
          id: true,
          question: true,
          status: true,
          guestName: true,
          guestEmail: true,
          createdAt: true,
          updatedAt: true,
          customer: {
            select: { id: true, name: true, email: true },
          },
          product: {
            select: {
              id: true,
              nameEn: true,
              nameKh: true,
              imageUrl: true,
            },
          },
          _count: {
            select: { answers: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.productQuestion.count({ where: whereClause }),
      // Get counts by status for dashboard
      prisma.productQuestion.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
    ])

    // Format status counts
    const counts = {
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
    }
    for (const sc of statusCounts) {
      counts[sc.status] = sc._count.id
    }

    return NextResponse.json({
      questions: questions.map((q) => ({
        id: q.id,
        question: q.question,
        status: q.status,
        askerName: q.customer?.name || q.guestName || "Anonymous",
        askerEmail: q.customer?.email || q.guestEmail || null,
        customerId: q.customer?.id || null,
        product: {
          id: q.product.id,
          nameEn: q.product.nameEn,
          nameKh: q.product.nameKh,
          imageUrl: q.product.imageUrl,
        },
        answerCount: q._count.answers,
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
      })),
      statusCounts: counts,
      pagination: {
        total: totalCount,
        offset,
        limit,
        hasMore: offset + questions.length < totalCount,
      },
    })
  } catch (error) {
    console.error("Get questions error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
