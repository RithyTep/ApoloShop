import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/abandoned-carts
 * Get abandoned carts list and analytics for admin dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const status = searchParams.get("status") || undefined
    const startDate = searchParams.get("startDate") || undefined
    const endDate = searchParams.get("endDate") || undefined

    // Build where clause
    const whereClause: Record<string, unknown> = {}
    if (status) {
      whereClause.status = status
    }
    if (startDate || endDate) {
      whereClause.createdAt = {}
      if (startDate) {
        (whereClause.createdAt as Record<string, Date>).gte = new Date(startDate)
      }
      if (endDate) {
        (whereClause.createdAt as Record<string, Date>).lte = new Date(endDate)
      }
    }

    // Get paginated abandoned carts
    const [carts, total] = await Promise.all([
      prisma.abandonedCart.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.abandonedCart.count({ where: whereClause }),
    ])

    // Calculate analytics
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [
      // Total counts by status
      statusCounts,
      // Last 30 days metrics
      last30DaysData,
      // Last 7 days metrics
      last7DaysData,
      // Recovery revenue
      recoveredCarts,
    ] = await Promise.all([
      prisma.abandonedCart.groupBy({
        by: ["status"],
        _count: { status: true },
        _sum: { cartTotal: true },
      }),
      prisma.abandonedCart.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: {
          status: true,
          cartTotal: true,
          createdAt: true,
        },
      }),
      prisma.abandonedCart.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: {
          status: true,
          cartTotal: true,
          createdAt: true,
        },
      }),
      prisma.abandonedCart.findMany({
        where: {
          status: "RECOVERED",
          recoveredAt: { gte: thirtyDaysAgo },
        },
        select: { cartTotal: true },
      }),
    ])

    // Calculate metrics
    const totalAbandoned = last30DaysData.length
    const totalRecovered = last30DaysData.filter(c => c.status === "RECOVERED").length
    const recoveryRate = totalAbandoned > 0 ? (totalRecovered / totalAbandoned) * 100 : 0

    const totalAbandonedValue = last30DaysData.reduce(
      (sum, c) => sum + Number(c.cartTotal || 0),
      0
    )
    const recoveredValue = recoveredCarts.reduce(
      (sum, c) => sum + Number(c.cartTotal || 0),
      0
    )

    // Email funnel metrics
    const email1Sent = last30DaysData.filter(c =>
      ["EMAIL_1_SENT", "EMAIL_2_SENT", "EMAIL_3_SENT", "RECOVERED", "UNRECOVERABLE"].includes(c.status)
    ).length
    const email2Sent = last30DaysData.filter(c =>
      ["EMAIL_2_SENT", "EMAIL_3_SENT", "RECOVERED", "UNRECOVERABLE"].includes(c.status)
    ).length
    const email3Sent = last30DaysData.filter(c =>
      ["EMAIL_3_SENT", "RECOVERED", "UNRECOVERABLE"].includes(c.status)
    ).length

    // Daily trend for last 7 days
    const dailyTrend = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split("T")[0]
      const dayData = last7DaysData.filter(c =>
        c.createdAt.toISOString().split("T")[0] === dateStr
      )
      dailyTrend.push({
        date: dateStr,
        abandoned: dayData.length,
        recovered: dayData.filter(c => c.status === "RECOVERED").length,
        value: dayData.reduce((sum, c) => sum + Number(c.cartTotal || 0), 0),
      })
    }

    // Status breakdown
    const statusBreakdown = statusCounts.map(s => ({
      status: s.status,
      count: s._count.status,
      value: Number(s._sum.cartTotal || 0),
    }))

    return NextResponse.json({
      carts: carts.map(cart => ({
        ...cart,
        cartTotal: Number(cart.cartTotal),
        cartItems: cart.cartItems as unknown[],
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      analytics: {
        totalAbandoned,
        totalRecovered,
        recoveryRate: Math.round(recoveryRate * 100) / 100,
        totalAbandonedValue: Math.round(totalAbandonedValue * 100) / 100,
        recoveredValue: Math.round(recoveredValue * 100) / 100,
        potentialRevenueLost: Math.round((totalAbandonedValue - recoveredValue) * 100) / 100,
        emailFunnel: {
          email1Sent,
          email2Sent,
          email3Sent,
          recovered: totalRecovered,
        },
        dailyTrend,
        statusBreakdown,
      },
    })
  } catch (error) {
    console.error("[AbandonedCarts API]", error)
    return NextResponse.json(
      { error: "Failed to fetch abandoned carts" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/abandoned-carts
 * Manually trigger recovery email or apply discount
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cartId, action, discountCode, discountPercent } = body

    if (!cartId || !action) {
      return NextResponse.json(
        { error: "cartId and action are required" },
        { status: 400 }
      )
    }

    const cart = await prisma.abandonedCart.findUnique({
      where: { id: cartId },
    })

    if (!cart) {
      return NextResponse.json(
        { error: "Cart not found" },
        { status: 404 }
      )
    }

    switch (action) {
      case "send_recovery_email": {
        // Import and use the email function
        const { sendRecoveryEmailWithDiscount } = await import("@/lib/abandoned-cart-service")
        await sendRecoveryEmailWithDiscount(cart.id, discountCode, discountPercent)
        return NextResponse.json({ success: true, message: "Recovery email sent" })
      }

      case "mark_recovered": {
        await prisma.abandonedCart.update({
          where: { id: cartId },
          data: {
            status: "RECOVERED",
            recoveredAt: new Date(),
          },
        })
        return NextResponse.json({ success: true, message: "Cart marked as recovered" })
      }

      case "mark_unrecoverable": {
        await prisma.abandonedCart.update({
          where: { id: cartId },
          data: {
            status: "UNRECOVERABLE",
          },
        })
        return NextResponse.json({ success: true, message: "Cart marked as unrecoverable" })
      }

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error("[AbandonedCarts API]", error)
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    )
  }
}
