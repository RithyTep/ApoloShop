import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/reports/sales - Get comprehensive sales report with date range filter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    // Default to last 30 days if no dates provided
    const now = new Date()
    const defaultStartDate = new Date(now)
    defaultStartDate.setDate(defaultStartDate.getDate() - 30)

    const dateFrom = startDate ? new Date(startDate) : defaultStartDate
    const dateTo = endDate ? new Date(endDate) : now

    // Ensure dateTo is end of day
    dateTo.setHours(23, 59, 59, 999)

    // Build where clause for completed/ready orders within date range
    const whereClause = {
      createdAt: {
        gte: dateFrom,
        lte: dateTo,
      },
      status: {
        in: ["COMPLETED", "READY"] as const,
      },
    }

    // Fetch all relevant data in parallel
    const [
      orders,
      totalOrdersCount,
      cancelledOrdersCount,
      previousPeriodOrders,
    ] = await Promise.all([
      // Orders with items for detailed analysis
      prisma.order.findMany({
        where: whereClause,
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  nameEn: true,
                  nameKh: true,
                  priceUsd: true,
                  imageUrl: true,
                  category: {
                    select: {
                      id: true,
                      nameEn: true,
                      nameKh: true,
                    },
                  },
                },
              },
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),

      // Total order count
      prisma.order.count({
        where: whereClause,
      }),

      // Cancelled orders in period
      prisma.order.count({
        where: {
          createdAt: {
            gte: dateFrom,
            lte: dateTo,
          },
          status: "CANCELLED",
        },
      }),

      // Previous period for comparison
      prisma.order.aggregate({
        where: {
          createdAt: {
            gte: new Date(dateFrom.getTime() - (dateTo.getTime() - dateFrom.getTime())),
            lt: dateFrom,
          },
          status: {
            in: ["COMPLETED", "READY"],
          },
        },
        _sum: {
          totalUsd: true,
          totalKhr: true,
        },
        _count: true,
      }),
    ])

    // Calculate summary metrics
    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.totalUsd), 0)
    const totalRevenueKhr = orders.reduce((sum, order) => sum + order.totalKhr, 0)
    const orderCount = totalOrdersCount
    const averageOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0

    // Previous period comparison
    const previousRevenue = Number(previousPeriodOrders._sum.totalUsd || 0)
    const previousOrderCount = previousPeriodOrders._count
    const revenueChange = previousRevenue > 0
      ? Math.round(((totalRevenue - previousRevenue) / previousRevenue) * 100)
      : totalRevenue > 0 ? 100 : 0
    const orderCountChange = previousOrderCount > 0
      ? Math.round(((orderCount - previousOrderCount) / previousOrderCount) * 100)
      : orderCount > 0 ? 100 : 0

    // Calculate top products by revenue
    const productSales = new Map<string, {
      id: string
      nameEn: string
      nameKh: string
      imageUrl: string | null
      category: { id: string; nameEn: string; nameKh: string } | null
      quantity: number
      revenue: number
    }>()

    for (const order of orders) {
      for (const item of order.items) {
        if (!item.product) continue

        const existing = productSales.get(item.product.id) || {
          id: item.product.id,
          nameEn: item.product.nameEn,
          nameKh: item.product.nameKh,
          imageUrl: item.product.imageUrl,
          category: item.product.category,
          quantity: 0,
          revenue: 0,
        }

        existing.quantity += item.quantity
        existing.revenue += Number(item.priceUsd) * item.quantity

        productSales.set(item.product.id, existing)
      }
    }

    const topProducts = Array.from(productSales.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map((p, index) => ({
        rank: index + 1,
        ...p,
        revenue: Number(p.revenue.toFixed(2)),
      }))

    // Calculate sales by category
    const categorySales = new Map<string, {
      id: string
      nameEn: string
      nameKh: string
      revenue: number
      orderCount: number
    }>()

    for (const order of orders) {
      for (const item of order.items) {
        const category = item.product?.category
        if (!category) continue

        const existing = categorySales.get(category.id) || {
          id: category.id,
          nameEn: category.nameEn,
          nameKh: category.nameKh,
          revenue: 0,
          orderCount: 0,
        }

        existing.revenue += Number(item.priceUsd) * item.quantity
        existing.orderCount++

        categorySales.set(category.id, existing)
      }
    }

    const salesByCategory = Array.from(categorySales.values())
      .sort((a, b) => b.revenue - a.revenue)
      .map(c => ({
        ...c,
        revenue: Number(c.revenue.toFixed(2)),
        percentage: totalRevenue > 0 ? Number(((c.revenue / totalRevenue) * 100).toFixed(1)) : 0,
      }))

    // Calculate sales by channel
    const channelSales = new Map<string, { channel: string; revenue: number; orderCount: number }>()

    for (const order of orders) {
      const existing = channelSales.get(order.channel) || {
        channel: order.channel,
        revenue: 0,
        orderCount: 0,
      }

      existing.revenue += Number(order.totalUsd)
      existing.orderCount++

      channelSales.set(order.channel, existing)
    }

    const salesByChannel = Array.from(channelSales.values())
      .sort((a, b) => b.revenue - a.revenue)
      .map(c => ({
        ...c,
        revenue: Number(c.revenue.toFixed(2)),
        percentage: totalRevenue > 0 ? Number(((c.revenue / totalRevenue) * 100).toFixed(1)) : 0,
      }))

    // Calculate daily sales data for charts
    const dailySales = new Map<string, {
      date: string
      revenue: number
      orderCount: number
      averageOrderValue: number
    }>()

    for (const order of orders) {
      const date = order.createdAt.toISOString().split("T")[0]
      const existing = dailySales.get(date) || {
        date,
        revenue: 0,
        orderCount: 0,
        averageOrderValue: 0,
      }

      existing.revenue += Number(order.totalUsd)
      existing.orderCount++

      dailySales.set(date, existing)
    }

    // Calculate averages and sort by date
    const chartData = Array.from(dailySales.values())
      .map(d => ({
        ...d,
        revenue: Number(d.revenue.toFixed(2)),
        averageOrderValue: d.orderCount > 0
          ? Number((d.revenue / d.orderCount).toFixed(2))
          : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Top customers by revenue
    const customerSales = new Map<string, {
      id: string
      name: string
      revenue: number
      orderCount: number
    }>()

    for (const order of orders) {
      if (!order.customer) continue

      const existing = customerSales.get(order.customer.id) || {
        id: order.customer.id,
        name: order.customer.name,
        revenue: 0,
        orderCount: 0,
      }

      existing.revenue += Number(order.totalUsd)
      existing.orderCount++

      customerSales.set(order.customer.id, existing)
    }

    const topCustomers = Array.from(customerSales.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map((c, index) => ({
        rank: index + 1,
        ...c,
        revenue: Number(c.revenue.toFixed(2)),
        averageOrderValue: c.orderCount > 0
          ? Number((c.revenue / c.orderCount).toFixed(2))
          : 0,
      }))

    return NextResponse.json({
      summary: {
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalRevenueKhr,
        orderCount,
        cancelledOrders: cancelledOrdersCount,
        averageOrderValue: Number(averageOrderValue.toFixed(2)),
        revenueChange,
        orderCountChange,
        dateRange: {
          start: dateFrom.toISOString().split("T")[0],
          end: dateTo.toISOString().split("T")[0],
        },
      },
      topProducts,
      salesByCategory,
      salesByChannel,
      topCustomers,
      chartData,
    })
  } catch (error) {
    console.error("GET /api/reports/sales error:", error)
    return NextResponse.json({ error: "Failed to generate sales report" }, { status: 500 })
  }
}
