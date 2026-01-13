/**
 * POS Sales API
 * GET /api/pos/sales - List imported POS sales for analytics
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/pos/sales - List POS sales
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const providerId = searchParams.get("providerId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    const where: Record<string, unknown> = {}

    if (providerId) {
      where.providerId = providerId
    }

    if (startDate || endDate) {
      where.saleDate = {}
      if (startDate) {
        (where.saleDate as Record<string, Date>).gte = new Date(startDate)
      }
      if (endDate) {
        (where.saleDate as Record<string, Date>).lte = new Date(endDate)
      }
    }

    const [sales, total] = await Promise.all([
      prisma.pOSSale.findMany({
        where,
        include: {
          provider: {
            select: { id: true, name: true, type: true },
          },
        },
        orderBy: { saleDate: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.pOSSale.count({ where }),
    ])

    // Calculate summary stats
    const summaryWhere = { ...where }
    const stats = await prisma.pOSSale.aggregate({
      where: summaryWhere,
      _sum: {
        totalAmount: true,
        taxAmount: true,
        discountAmount: true,
        itemCount: true,
      },
      _count: true,
      _avg: {
        totalAmount: true,
      },
    })

    // Get sales by payment method
    const byPaymentMethod = await prisma.pOSSale.groupBy({
      by: ["paymentMethod"],
      where: summaryWhere,
      _sum: { totalAmount: true },
      _count: true,
    })

    // Get sales by date (last 7 days if no date range specified)
    const salesByDay = await prisma.$queryRaw`
      SELECT
        DATE(sale_date) as date,
        COUNT(*)::int as count,
        SUM(total_amount)::float as total
      FROM apolo.pos_sales
      WHERE ${providerId ? prisma.$queryRaw`provider_id = ${providerId} AND` : prisma.$queryRaw``} 1=1
        ${startDate ? prisma.$queryRaw`AND sale_date >= ${new Date(startDate)}` : prisma.$queryRaw``}
        ${endDate ? prisma.$queryRaw`AND sale_date <= ${new Date(endDate)}` : prisma.$queryRaw``}
      GROUP BY DATE(sale_date)
      ORDER BY date DESC
      LIMIT 30
    ` as Array<{ date: Date; count: number; total: number }>

    return NextResponse.json({
      sales: sales.map((s) => ({
        ...s,
        totalAmount: Number(s.totalAmount),
        taxAmount: s.taxAmount ? Number(s.taxAmount) : null,
        discountAmount: s.discountAmount ? Number(s.discountAmount) : null,
      })),
      total,
      summary: {
        totalSales: stats._count,
        totalRevenue: Number(stats._sum.totalAmount) || 0,
        totalTax: Number(stats._sum.taxAmount) || 0,
        totalDiscount: Number(stats._sum.discountAmount) || 0,
        totalItems: stats._sum.itemCount || 0,
        averageOrderValue: Number(stats._avg.totalAmount) || 0,
      },
      byPaymentMethod: byPaymentMethod.map((p) => ({
        method: p.paymentMethod || "unknown",
        count: p._count,
        total: Number(p._sum.totalAmount) || 0,
      })),
      salesByDay,
      pagination: {
        limit,
        offset,
        hasMore: offset + sales.length < total,
      },
    })
  } catch (error) {
    console.error("Get POS sales error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
