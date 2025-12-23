import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/dashboard - Get dashboard statistics
export async function GET() {
  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterdayStart = new Date(todayStart)
    yesterdayStart.setDate(yesterdayStart.getDate() - 1)
    const weekAgo = new Date(todayStart)
    weekAgo.setDate(weekAgo.getDate() - 7)

    // Aggregate all stats in parallel
    const [
      todayOrders,
      yesterdayOrders,
      pendingOrders,
      lowStockCount,
      todayRevenue,
      yesterdayRevenue,
      recentOrders,
      weeklyStats,
    ] = await Promise.all([
      // Today's orders count
      prisma.order.count({
        where: { createdAt: { gte: todayStart } },
      }),
      // Yesterday's orders count
      prisma.order.count({
        where: {
          createdAt: { gte: yesterdayStart, lt: todayStart },
        },
      }),
      // Pending orders (NEW or CONFIRMED)
      prisma.order.count({
        where: { status: { in: ["NEW", "CONFIRMED"] } },
      }),
      // Low stock items
      prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count FROM "apolo"."inventory"
        WHERE quantity <= min_level
      `,
      // Today's revenue
      prisma.order.aggregate({
        where: {
          createdAt: { gte: todayStart },
          status: { not: "CANCELLED" },
        },
        _sum: { totalUsd: true, totalKhr: true },
      }),
      // Yesterday's revenue
      prisma.order.aggregate({
        where: {
          createdAt: { gte: yesterdayStart, lt: todayStart },
          status: { not: "CANCELLED" },
        },
        _sum: { totalUsd: true, totalKhr: true },
      }),
      // Recent orders
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          customer: true,
          items: { include: { product: true } },
        },
      }),
      // Weekly order stats grouped by day
      prisma.$queryRaw<{ date: Date; orders: bigint; revenue: number }[]>`
        SELECT
          DATE(created_at) as date,
          COUNT(*) as orders,
          COALESCE(SUM(total_usd), 0) as revenue
        FROM "apolo"."orders"
        WHERE created_at >= ${weekAgo}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,
    ])

    // Calculate percentage changes
    const ordersChange = yesterdayOrders > 0
      ? Math.round(((todayOrders - yesterdayOrders) / yesterdayOrders) * 100)
      : todayOrders > 0 ? 100 : 0

    const todayRevenueUsd = Number(todayRevenue._sum.totalUsd || 0)
    const yesterdayRevenueUsd = Number(yesterdayRevenue._sum.totalUsd || 0)
    const revenueChange = yesterdayRevenueUsd > 0
      ? Math.round(((todayRevenueUsd - yesterdayRevenueUsd) / yesterdayRevenueUsd) * 100)
      : todayRevenueUsd > 0 ? 100 : 0

    // Format weekly chart data
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    const chartData = weeklyStats.map((stat) => ({
      day: dayNames[new Date(stat.date).getDay()],
      date: stat.date,
      orders: Number(stat.orders),
      revenue: Number(stat.revenue),
    }))

    return NextResponse.json({
      kpis: {
        todayOrders,
        ordersChange,
        pendingOrders,
        lowStockItems: Number(lowStockCount[0]?.count || 0),
        revenueUsd: todayRevenueUsd,
        revenueKhr: Number(todayRevenue._sum.totalKhr || 0),
        revenueChange,
      },
      recentOrders: recentOrders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customer: order.customer?.name || "Unknown",
        phone: order.customer?.phone || "",
        total: Number(order.totalUsd),
        status: order.status,
        channel: order.channel,
        createdAt: order.createdAt,
        items: order.items.length,
      })),
      chartData,
    })
  } catch (error) {
    console.error("Dashboard stats error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
