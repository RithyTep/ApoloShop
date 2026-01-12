import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

interface RevenueTrendPoint {
  date: string
  revenue: number
  previousRevenue: number
  orderCount: number
  previousOrderCount: number
  avgOrderValue: number
  previousAvgOrderValue: number
}

interface FunnelStage {
  stage: string
  count: number
  percentage: number
  dropoff: number
}

interface ProductPerformanceItem {
  id: string
  nameEn: string
  nameKh: string
  sku: string
  imageUrl: string | null
  revenue: number
  cost: number
  margin: number
  marginPercent: number
  quantity: number
  category: {
    id: string
    nameEn: string
    nameKh: string
  } | null
}

interface CohortRow {
  cohortMonth: string
  cohortSize: number
  retention: number[] // retention percentage for each month
}

interface AdvancedAnalyticsResponse {
  revenueTrends: RevenueTrendPoint[]
  conversionFunnel: FunnelStage[]
  productPerformance: ProductPerformanceItem[]
  customerCohorts: CohortRow[]
  summary: {
    totalRevenue: number
    previousTotalRevenue: number
    revenueGrowth: number
    totalOrders: number
    previousTotalOrders: number
    ordersGrowth: number
    avgOrderValue: number
    previousAvgOrderValue: number
    aovGrowth: number
    conversionRate: number
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    // Calculate date ranges
    const now = new Date()
    const dateFrom = startDate ? new Date(startDate) : new Date(now.setDate(now.getDate() - 30))
    const dateTo = endDate ? new Date(endDate) : new Date()

    // Calculate previous period for comparison
    const periodLength = dateTo.getTime() - dateFrom.getTime()
    const previousFrom = new Date(dateFrom.getTime() - periodLength)
    const previousTo = new Date(dateFrom.getTime() - 1)

    // Fetch current period orders
    const currentOrders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: dateFrom,
          lte: dateTo,
        },
        status: {
          notIn: ["CANCELLED"],
        },
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
                inventory: true,
              },
            },
          },
        },
        customer: true,
      },
      orderBy: { createdAt: "asc" },
    })

    // Fetch previous period orders for comparison
    const previousOrders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: previousFrom,
          lte: previousTo,
        },
        status: {
          notIn: ["CANCELLED"],
        },
      },
    })

    // 1. REVENUE TRENDS WITH COMPARISON
    const revenueTrends = await calculateRevenueTrends(dateFrom, dateTo, previousFrom, previousTo)

    // 2. CONVERSION FUNNEL
    const conversionFunnel = await calculateConversionFunnel(dateFrom, dateTo)

    // 3. PRODUCT PERFORMANCE MATRIX
    const productPerformance = calculateProductPerformance(currentOrders)

    // 4. CUSTOMER COHORT ANALYSIS
    const customerCohorts = await calculateCustomerCohorts()

    // 5. SUMMARY METRICS
    const currentRevenue = currentOrders.reduce((sum, order) => sum + Number(order.totalUsd), 0)
    const previousRevenue = previousOrders.reduce((sum, order) => sum + Number(order.totalUsd), 0)
    const currentOrderCount = currentOrders.length
    const previousOrderCount = previousOrders.length
    const currentAOV = currentOrderCount > 0 ? currentRevenue / currentOrderCount : 0
    const previousAOV = previousOrderCount > 0 ? previousRevenue / previousOrderCount : 0

    // Calculate completed orders for conversion rate
    const completedOrders = currentOrders.filter(o => o.status === "COMPLETED").length

    const response: AdvancedAnalyticsResponse = {
      revenueTrends,
      conversionFunnel,
      productPerformance,
      customerCohorts,
      summary: {
        totalRevenue: currentRevenue,
        previousTotalRevenue: previousRevenue,
        revenueGrowth: previousRevenue > 0 ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100) : 0,
        totalOrders: currentOrderCount,
        previousTotalOrders: previousOrderCount,
        ordersGrowth: previousOrderCount > 0 ? Math.round(((currentOrderCount - previousOrderCount) / previousOrderCount) * 100) : 0,
        avgOrderValue: Math.round(currentAOV * 100) / 100,
        previousAvgOrderValue: Math.round(previousAOV * 100) / 100,
        aovGrowth: previousAOV > 0 ? Math.round(((currentAOV - previousAOV) / previousAOV) * 100) : 0,
        conversionRate: currentOrderCount > 0 ? Math.round((completedOrders / currentOrderCount) * 100) : 0,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Advanced analytics error:", error)
    return NextResponse.json(
      { error: "Failed to fetch advanced analytics" },
      { status: 500 }
    )
  }
}

async function calculateRevenueTrends(
  currentFrom: Date,
  currentTo: Date,
  previousFrom: Date,
  previousTo: Date
): Promise<RevenueTrendPoint[]> {
  // Get daily revenue for current period
  const currentDailyData = await prisma.$queryRaw<Array<{
    date: Date
    revenue: number
    order_count: bigint
  }>>`
    SELECT
      DATE(created_at) as date,
      COALESCE(SUM(total_usd), 0)::float as revenue,
      COUNT(*)::bigint as order_count
    FROM apolo.orders
    WHERE created_at >= ${currentFrom}
      AND created_at <= ${currentTo}
      AND status != 'CANCELLED'
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `

  // Get daily revenue for previous period
  const previousDailyData = await prisma.$queryRaw<Array<{
    date: Date
    revenue: number
    order_count: bigint
  }>>`
    SELECT
      DATE(created_at) as date,
      COALESCE(SUM(total_usd), 0)::float as revenue,
      COUNT(*)::bigint as order_count
    FROM apolo.orders
    WHERE created_at >= ${previousFrom}
      AND created_at <= ${previousTo}
      AND status != 'CANCELLED'
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `

  // Map previous data by day offset for comparison
  const previousByOffset = new Map<number, { revenue: number; orderCount: number }>()
  const previousStart = previousFrom.getTime()
  previousDailyData.forEach((row) => {
    const offset = Math.floor((new Date(row.date).getTime() - previousStart) / (1000 * 60 * 60 * 24))
    previousByOffset.set(offset, {
      revenue: row.revenue,
      orderCount: Number(row.order_count),
    })
  })

  // Build trend data with comparisons
  const currentStart = currentFrom.getTime()
  return currentDailyData.map((row) => {
    const dayOffset = Math.floor((new Date(row.date).getTime() - currentStart) / (1000 * 60 * 60 * 24))
    const previous = previousByOffset.get(dayOffset) || { revenue: 0, orderCount: 0 }
    const orderCount = Number(row.order_count)
    const avgOrderValue = orderCount > 0 ? row.revenue / orderCount : 0
    const previousAvgOrderValue = previous.orderCount > 0 ? previous.revenue / previous.orderCount : 0

    return {
      date: new Date(row.date).toISOString().split("T")[0],
      revenue: Math.round(row.revenue * 100) / 100,
      previousRevenue: Math.round(previous.revenue * 100) / 100,
      orderCount,
      previousOrderCount: previous.orderCount,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      previousAvgOrderValue: Math.round(previousAvgOrderValue * 100) / 100,
    }
  })
}

async function calculateConversionFunnel(
  dateFrom: Date,
  dateTo: Date
): Promise<FunnelStage[]> {
  // Get order counts by status
  const statusCounts = await prisma.order.groupBy({
    by: ["status"],
    where: {
      createdAt: {
        gte: dateFrom,
        lte: dateTo,
      },
    },
    _count: {
      id: true,
    },
  })

  const statusMap = new Map<string, number>()
  statusCounts.forEach((s) => {
    statusMap.set(s.status, s._count.id)
  })

  // Calculate funnel stages (orders flow through these stages)
  const newOrders = statusMap.get("NEW") || 0
  const confirmed = statusMap.get("CONFIRMED") || 0
  const preparing = statusMap.get("PREPARING") || 0
  const ready = statusMap.get("READY") || 0
  const completed = statusMap.get("COMPLETED") || 0
  const cancelled = statusMap.get("CANCELLED") || 0

  // Total orders created
  const totalCreated = newOrders + confirmed + preparing + ready + completed + cancelled

  // Funnel: Orders that moved past NEW
  const confirmedPlus = confirmed + preparing + ready + completed
  // Funnel: Orders that moved past CONFIRMED
  const preparingPlus = preparing + ready + completed
  // Funnel: Orders that completed
  const completedTotal = completed

  const stages: FunnelStage[] = [
    {
      stage: "Orders Created",
      count: totalCreated,
      percentage: 100,
      dropoff: 0,
    },
    {
      stage: "Confirmed",
      count: confirmedPlus,
      percentage: totalCreated > 0 ? Math.round((confirmedPlus / totalCreated) * 100) : 0,
      dropoff: totalCreated > 0 ? Math.round(((totalCreated - confirmedPlus) / totalCreated) * 100) : 0,
    },
    {
      stage: "In Preparation",
      count: preparingPlus,
      percentage: totalCreated > 0 ? Math.round((preparingPlus / totalCreated) * 100) : 0,
      dropoff: confirmedPlus > 0 ? Math.round(((confirmedPlus - preparingPlus) / confirmedPlus) * 100) : 0,
    },
    {
      stage: "Completed",
      count: completedTotal,
      percentage: totalCreated > 0 ? Math.round((completedTotal / totalCreated) * 100) : 0,
      dropoff: preparingPlus > 0 ? Math.round(((preparingPlus - completedTotal) / preparingPlus) * 100) : 0,
    },
  ]

  return stages
}

function calculateProductPerformance(
  orders: Array<{
    items: Array<{
      priceUsd: unknown
      quantity: number
      product: {
        id: string
        nameEn: string
        nameKh: string
        sku: string
        imageUrl: string | null
        priceUsd: unknown
        category: {
          id: string
          nameEn: string
          nameKh: string
        } | null
        inventory: {
          id: string
        } | null
      } | null
    }>
  }>
): ProductPerformanceItem[] {
  const productMap = new Map<
    string,
    {
      id: string
      nameEn: string
      nameKh: string
      sku: string
      imageUrl: string | null
      revenue: number
      quantity: number
      cost: number
      category: { id: string; nameEn: string; nameKh: string } | null
    }
  >()

  orders.forEach((order) => {
    order.items.forEach((item) => {
      if (!item.product) return
      const productId = item.product.id
      const existing = productMap.get(productId)
      const itemRevenue = Number(item.priceUsd) * item.quantity
      // Estimate cost as 60% of revenue (placeholder - real cost data would come from inventory)
      const itemCost = itemRevenue * 0.6

      if (existing) {
        existing.revenue += itemRevenue
        existing.quantity += item.quantity
        existing.cost += itemCost
      } else {
        productMap.set(productId, {
          id: item.product.id,
          nameEn: item.product.nameEn,
          nameKh: item.product.nameKh,
          sku: item.product.sku,
          imageUrl: item.product.imageUrl,
          revenue: itemRevenue,
          quantity: item.quantity,
          cost: itemCost,
          category: item.product.category,
        })
      }
    })
  })

  return Array.from(productMap.values())
    .map((product) => ({
      ...product,
      margin: Math.round((product.revenue - product.cost) * 100) / 100,
      marginPercent: product.revenue > 0
        ? Math.round(((product.revenue - product.cost) / product.revenue) * 100)
        : 0,
      revenue: Math.round(product.revenue * 100) / 100,
      cost: Math.round(product.cost * 100) / 100,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 20) // Top 20 products
}

async function calculateCustomerCohorts(): Promise<CohortRow[]> {
  // Get customer cohorts by first order month
  const cohortData = await prisma.$queryRaw<Array<{
    cohort_month: string
    order_month: string
    customer_count: bigint
  }>>`
    WITH customer_first_order AS (
      SELECT
        customer_id,
        DATE_TRUNC('month', MIN(created_at)) as cohort_month
      FROM apolo.orders
      WHERE status != 'CANCELLED'
      GROUP BY customer_id
    ),
    monthly_activity AS (
      SELECT
        cfo.cohort_month,
        DATE_TRUNC('month', o.created_at) as order_month,
        COUNT(DISTINCT o.customer_id) as customer_count
      FROM apolo.orders o
      JOIN customer_first_order cfo ON o.customer_id = cfo.customer_id
      WHERE o.status != 'CANCELLED'
      GROUP BY cfo.cohort_month, DATE_TRUNC('month', o.created_at)
    )
    SELECT
      TO_CHAR(cohort_month, 'YYYY-MM') as cohort_month,
      TO_CHAR(order_month, 'YYYY-MM') as order_month,
      customer_count
    FROM monthly_activity
    WHERE cohort_month >= NOW() - INTERVAL '6 months'
    ORDER BY cohort_month, order_month
  `

  // Group by cohort month
  const cohortMap = new Map<string, Map<string, number>>()
  const cohortSizes = new Map<string, number>()

  cohortData.forEach((row) => {
    if (!cohortMap.has(row.cohort_month)) {
      cohortMap.set(row.cohort_month, new Map())
    }
    cohortMap.get(row.cohort_month)!.set(row.order_month, Number(row.customer_count))

    // Track cohort size (first month = cohort size)
    if (row.cohort_month === row.order_month) {
      cohortSizes.set(row.cohort_month, Number(row.customer_count))
    }
  })

  // Build cohort rows
  const cohorts: CohortRow[] = []
  const sortedCohorts = Array.from(cohortMap.keys()).sort()

  sortedCohorts.forEach((cohortMonth) => {
    const monthData = cohortMap.get(cohortMonth)!
    const cohortSize = cohortSizes.get(cohortMonth) || 0

    // Calculate retention for each subsequent month
    const retention: number[] = []
    let monthIndex = 0
    const sortedMonths = Array.from(monthData.keys()).sort()

    sortedMonths.forEach((orderMonth) => {
      const count = monthData.get(orderMonth) || 0
      const retentionPercent = cohortSize > 0 ? Math.round((count / cohortSize) * 100) : 0
      retention.push(retentionPercent)
      monthIndex++
    })

    cohorts.push({
      cohortMonth,
      cohortSize,
      retention,
    })
  })

  return cohorts.slice(-6) // Last 6 cohorts
}
