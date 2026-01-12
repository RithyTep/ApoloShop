import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/reports/customers - Get customer analytics report with date range filter
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

    // Calculate previous period for comparison
    const periodDuration = dateTo.getTime() - dateFrom.getTime()
    const previousPeriodStart = new Date(dateFrom.getTime() - periodDuration)
    const previousPeriodEnd = new Date(dateFrom.getTime() - 1)

    // Fetch all relevant data in parallel
    const [
      newCustomers,
      previousNewCustomers,
      allCustomers,
      ordersInPeriod,
      previousPeriodOrders,
    ] = await Promise.all([
      // New customers created in this period
      prisma.customer.count({
        where: {
          createdAt: {
            gte: dateFrom,
            lte: dateTo,
          },
        },
      }),

      // New customers in previous period for comparison
      prisma.customer.count({
        where: {
          createdAt: {
            gte: previousPeriodStart,
            lt: dateFrom,
          },
        },
      }),

      // All customers with their orders
      prisma.customer.findMany({
        include: {
          orders: {
            where: {
              status: {
                in: ["COMPLETED", "READY"],
              },
            },
            select: {
              id: true,
              totalUsd: true,
              createdAt: true,
            },
          },
        },
      }),

      // Orders in period for returning customer analysis
      prisma.order.findMany({
        where: {
          createdAt: {
            gte: dateFrom,
            lte: dateTo,
          },
          status: {
            in: ["COMPLETED", "READY"],
          },
        },
        select: {
          id: true,
          customerId: true,
          totalUsd: true,
          createdAt: true,
          customer: {
            select: {
              id: true,
              name: true,
              createdAt: true,
            },
          },
        },
      }),

      // Orders in previous period
      prisma.order.findMany({
        where: {
          createdAt: {
            gte: previousPeriodStart,
            lt: dateFrom,
          },
          status: {
            in: ["COMPLETED", "READY"],
          },
        },
        select: {
          customerId: true,
        },
      }),
    ])

    // Calculate returning customers (ordered in both previous period and current period)
    const previousPeriodCustomerIds = new Set(previousPeriodOrders.map(o => o.customerId))
    const currentPeriodCustomerIds = new Set(ordersInPeriod.map(o => o.customerId))

    const returningCustomersCount = [...currentPeriodCustomerIds].filter(
      id => previousPeriodCustomerIds.has(id)
    ).length

    // New customers who ordered in this period (first order in this period)
    const customersWithFirstOrderInPeriod = ordersInPeriod.filter(order => {
      const customerCreatedAt = order.customer?.createdAt
      return customerCreatedAt && customerCreatedAt >= dateFrom && customerCreatedAt <= dateTo
    })
    const uniqueNewBuyersInPeriod = new Set(customersWithFirstOrderInPeriod.map(o => o.customerId)).size

    // Calculate customer lifetime values
    const customerStats = allCustomers.map(customer => {
      const totalSpent = customer.orders.reduce((sum, order) => sum + Number(order.totalUsd), 0)
      const orderCount = customer.orders.length
      const avgOrderValue = orderCount > 0 ? totalSpent / orderCount : 0
      const firstOrderDate = customer.orders.length > 0
        ? customer.orders.reduce((oldest, order) =>
            order.createdAt < oldest ? order.createdAt : oldest,
            customer.orders[0].createdAt)
        : customer.createdAt
      const lastOrderDate = customer.orders.length > 0
        ? customer.orders.reduce((latest, order) =>
            order.createdAt > latest ? order.createdAt : latest,
            customer.orders[0].createdAt)
        : null

      return {
        id: customer.id,
        name: customer.name,
        totalSpent,
        orderCount,
        avgOrderValue,
        firstOrderDate,
        lastOrderDate,
        createdAt: customer.createdAt,
      }
    })

    // Calculate average customer lifetime value
    const customersWithOrders = customerStats.filter(c => c.orderCount > 0)
    const avgCustomerLifetimeValue = customersWithOrders.length > 0
      ? customersWithOrders.reduce((sum, c) => sum + c.totalSpent, 0) / customersWithOrders.length
      : 0

    // Top customers by revenue (all time)
    const topCustomers = [...customerStats]
      .filter(c => c.orderCount > 0)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10)
      .map((customer, index) => ({
        rank: index + 1,
        id: customer.id,
        name: customer.name,
        totalSpent: Number(customer.totalSpent.toFixed(2)),
        orderCount: customer.orderCount,
        avgOrderValue: Number(customer.avgOrderValue.toFixed(2)),
        lastOrderDate: customer.lastOrderDate?.toISOString().split("T")[0] || null,
      }))

    // Calculate customer growth over time (monthly)
    const customerGrowthMap = new Map<string, { date: string; newCustomers: number; totalCustomers: number }>()

    // Get all customers sorted by creation date
    const sortedCustomers = [...allCustomers].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    )

    // Build cumulative customer count by month
    let cumulativeCount = 0
    for (const customer of sortedCustomers) {
      const monthKey = customer.createdAt.toISOString().slice(0, 7) // YYYY-MM
      const existing = customerGrowthMap.get(monthKey)

      if (existing) {
        existing.newCustomers++
        existing.totalCustomers = ++cumulativeCount
      } else {
        cumulativeCount++
        customerGrowthMap.set(monthKey, {
          date: monthKey,
          newCustomers: 1,
          totalCustomers: cumulativeCount,
        })
      }
    }

    const customerGrowthData = Array.from(customerGrowthMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))

    // Calculate changes from previous period
    const newCustomersChange = previousNewCustomers > 0
      ? Math.round(((newCustomers - previousNewCustomers) / previousNewCustomers) * 100)
      : newCustomers > 0 ? 100 : 0

    // Calculate retention metrics
    const totalActiveCustomers = currentPeriodCustomerIds.size
    const retentionRate = previousPeriodCustomerIds.size > 0
      ? Math.round((returningCustomersCount / previousPeriodCustomerIds.size) * 100)
      : 0

    // Customer segments based on order frequency and recency
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const ninetyDaysAgo = new Date(now)
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const segments = {
      vip: customerStats.filter(c => c.orderCount >= 5 && c.totalSpent >= 100).length,
      active: customerStats.filter(c =>
        c.lastOrderDate && c.lastOrderDate >= thirtyDaysAgo && c.orderCount >= 1
      ).length,
      atRisk: customerStats.filter(c =>
        c.lastOrderDate &&
        c.lastOrderDate < thirtyDaysAgo &&
        c.lastOrderDate >= ninetyDaysAgo
      ).length,
      churned: customerStats.filter(c =>
        c.lastOrderDate && c.lastOrderDate < ninetyDaysAgo
      ).length,
      newCustomers: customerStats.filter(c =>
        c.createdAt >= thirtyDaysAgo && c.orderCount === 0
      ).length,
    }

    return NextResponse.json({
      summary: {
        totalCustomers: allCustomers.length,
        newCustomers,
        newCustomersChange,
        returningCustomers: returningCustomersCount,
        activeCustomers: totalActiveCustomers,
        retentionRate,
        avgCustomerLifetimeValue: Number(avgCustomerLifetimeValue.toFixed(2)),
        dateRange: {
          start: dateFrom.toISOString().split("T")[0],
          end: dateTo.toISOString().split("T")[0],
        },
      },
      topCustomers,
      customerGrowthData,
      segments,
    })
  } catch (error) {
    console.error("GET /api/reports/customers error:", error)
    return NextResponse.json({ error: "Failed to generate customer report" }, { status: 500 })
  }
}
