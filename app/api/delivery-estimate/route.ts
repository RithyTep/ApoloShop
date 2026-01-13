import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  calculateDeliveryEstimate,
  willProcessToday,
  getNextBusinessDay,
  getUpcomingHolidays,
  DeliveryEstimateResult,
} from "@/lib/delivery-estimate"

// GET /api/delivery-estimate - Get delivery estimates for a region or zone
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const region = searchParams.get("region") // Province/region code (e.g., "PP" for Phnom Penh)
    const zoneId = searchParams.get("zoneId") // Specific shipping zone ID
    const includeHolidays = searchParams.get("includeHolidays") === "true"

    // Start date for calculation
    const orderDate = new Date()
    const processDate = getNextBusinessDay(orderDate)
    const processesToday = willProcessToday(orderDate)

    // Build query based on parameters
    let zones

    if (zoneId) {
      // Fetch specific zone
      const zone = await prisma.shippingZone.findUnique({
        where: { id: zoneId, isActive: true },
      })

      if (!zone) {
        return NextResponse.json(
          { error: "Shipping zone not found" },
          { status: 404 }
        )
      }

      zones = [zone]
    } else if (region) {
      // Find zones that cover this region
      const allZones = await prisma.shippingZone.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }],
      })

      zones = allZones.filter((zone) => {
        const regions = zone.regions as string[]
        return Array.isArray(regions) && regions.includes(region)
      })

      if (zones.length === 0) {
        return NextResponse.json(
          {
            available: false,
            message: "Delivery not available for this region",
            region,
          }
        )
      }
    } else {
      // Return all active zones with estimates
      zones = await prisma.shippingZone.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }],
      })
    }

    // Calculate delivery estimates for each zone
    const estimates: DeliveryEstimateResult[] = zones.map((zone) =>
      calculateDeliveryEstimate(
        {
          id: zone.id,
          nameEn: zone.nameEn,
          nameKh: zone.nameKh,
          minDeliveryDays: zone.minDeliveryDays,
          maxDeliveryDays: zone.maxDeliveryDays,
          rateType: zone.rateType,
        },
        processDate
      )
    )

    // Find fastest option
    const fastestOption = estimates.reduce((prev, curr) =>
      curr.businessDays.min < prev.businessDays.min ? curr : prev
    )

    const response: Record<string, unknown> = {
      available: true,
      region: region || null,
      orderDate: orderDate.toISOString(),
      processDate: processDate.toISOString(),
      processesToday,
      estimates,
      fastestOption,
      totalOptions: estimates.length,
    }

    // Include upcoming holidays if requested
    if (includeHolidays) {
      response.upcomingHolidays = getUpcomingHolidays(5)
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Get delivery estimate error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST /api/delivery-estimate - Calculate delivery estimate for specific parameters
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { region, zoneId, shippingMethod, orderDate: orderDateStr } = body

    // Parse order date or use current time
    const orderDate = orderDateStr ? new Date(orderDateStr) : new Date()

    if (isNaN(orderDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid order date format" },
        { status: 400 }
      )
    }

    const processDate = getNextBusinessDay(orderDate)
    const processesToday = willProcessToday(orderDate)

    // Determine which zone to use
    let zone

    if (zoneId) {
      zone = await prisma.shippingZone.findUnique({
        where: { id: zoneId, isActive: true },
      })
    } else if (region) {
      // Find best matching zone for region
      const allZones = await prisma.shippingZone.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }],
      })

      const matchingZones = allZones.filter((z) => {
        const regions = z.regions as string[]
        return Array.isArray(regions) && regions.includes(region)
      })

      // If shipping method specified, try to match
      if (shippingMethod && matchingZones.length > 0) {
        zone = matchingZones.find((z) => {
          if (shippingMethod === "express") {
            return (z.minDeliveryDays ?? 5) <= 2
          }
          if (shippingMethod === "free_shipping") {
            return z.rateType === "FREE"
          }
          return true
        }) || matchingZones[0]
      } else {
        zone = matchingZones[0]
      }
    }

    if (!zone) {
      return NextResponse.json(
        {
          available: false,
          message: "No shipping zone found for the specified parameters",
        }
      )
    }

    // Calculate estimate
    const estimate = calculateDeliveryEstimate(
      {
        id: zone.id,
        nameEn: zone.nameEn,
        nameKh: zone.nameKh,
        minDeliveryDays: zone.minDeliveryDays,
        maxDeliveryDays: zone.maxDeliveryDays,
        rateType: zone.rateType,
      },
      processDate
    )

    return NextResponse.json({
      available: true,
      orderDate: orderDate.toISOString(),
      processDate: processDate.toISOString(),
      processesToday,
      estimate,
      upcomingHolidays: getUpcomingHolidays(3),
    })
  } catch (error) {
    console.error("Calculate delivery estimate error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
