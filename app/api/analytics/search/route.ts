import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/analytics/search - Get search analytics for admin dashboard
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse date range parameters (default to last 30 days)
    const now = new Date()
    const defaultStartDate = new Date(now)
    defaultStartDate.setDate(defaultStartDate.getDate() - 30)

    const startDateParam = searchParams.get("startDate")
    const endDateParam = searchParams.get("endDate")
    const limitParam = searchParams.get("limit")

    const startDate = startDateParam ? new Date(startDateParam) : defaultStartDate
    const endDate = endDateParam ? new Date(endDateParam) : now
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 20

    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format. Use ISO 8601 format." },
        { status: 400 }
      )
    }

    // Get aggregated statistics in parallel
    const [
      totalSearches,
      searchesWithResults,
      popularSearches,
      recentSearches,
      dailyStats,
    ] = await Promise.all([
      // Total searches in date range
      prisma.searchLog.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      // Searches that returned results
      prisma.searchLog.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          resultsCount: { gt: 0 },
        },
      }),
      // Popular searches (grouped by query with counts)
      prisma.searchLog.groupBy({
        by: ["query"],
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
        _count: { query: true },
        _avg: { resultsCount: true },
        orderBy: { _count: { query: "desc" } },
        take: limit,
      }),
      // Recent searches
      prisma.searchLog.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          query: true,
          resultsCount: true,
          createdAt: true,
        },
      }),
      // Daily search volume
      prisma.$queryRaw<{ date: Date; searches: bigint; avg_results: number }[]>`
        SELECT
          DATE(created_at) as date,
          COUNT(*) as searches,
          COALESCE(AVG(results_count), 0) as avg_results
        FROM "apolo"."search_logs"
        WHERE created_at >= ${startDate} AND created_at <= ${endDate}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `,
    ])

    // Calculate success rate (searches that returned at least one result)
    const successRate =
      totalSearches > 0
        ? Math.round((searchesWithResults / totalSearches) * 100)
        : 0

    // Format popular searches for response
    const formattedPopularSearches = popularSearches.map((item) => ({
      query: item.query,
      count: item._count.query,
      avgResults: Math.round(item._avg.resultsCount || 0),
    }))

    // Format daily stats for charting
    const formattedDailyStats = dailyStats.map((stat) => ({
      date: stat.date,
      searches: Number(stat.searches),
      avgResults: Math.round(Number(stat.avg_results)),
    }))

    // Identify zero-result searches (opportunities for improvement)
    const zeroResultSearches = popularSearches
      .filter((item) => (item._avg.resultsCount || 0) === 0)
      .map((item) => ({
        query: item.query,
        count: item._count.query,
      }))

    return NextResponse.json({
      summary: {
        totalSearches,
        searchesWithResults,
        zeroResultSearches: totalSearches - searchesWithResults,
        successRate,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      },
      popularSearches: formattedPopularSearches,
      zeroResultQueries: zeroResultSearches.slice(0, 10),
      recentSearches,
      dailyStats: formattedDailyStats,
    })
  } catch (error) {
    console.error("Search analytics error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
