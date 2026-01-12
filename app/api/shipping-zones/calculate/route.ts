import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// POST /api/shipping-zones/calculate - Calculate shipping cost for a cart
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { region, cartTotalUsd, cartTotalKhr, weightKg } = body

    if (!region) {
      return NextResponse.json({ error: "Region is required" }, { status: 400 })
    }

    // Find shipping zones that include this region
    const zones = await prisma.shippingZone.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }],
    })

    // Filter zones by region
    const matchingZones = zones.filter((zone) => {
      const regions = zone.regions as string[]
      return Array.isArray(regions) && regions.includes(region)
    })

    if (matchingZones.length === 0) {
      return NextResponse.json({
        available: false,
        message: "Shipping not available for this region",
      })
    }

    // Calculate shipping for all matching zones
    const shippingOptions = matchingZones.map((zone) => {
      let shippingCostUsd = 0
      let shippingCostKhr = 0
      let isFree = false

      // Check free shipping threshold first
      if (zone.freeThresholdUsd && cartTotalUsd >= Number(zone.freeThresholdUsd)) {
        isFree = true
      } else if (zone.freeThresholdKhr && cartTotalKhr >= zone.freeThresholdKhr) {
        isFree = true
      }

      if (!isFree) {
        switch (zone.rateType) {
          case "FREE":
            isFree = true
            break

          case "FLAT_RATE":
            shippingCostUsd = zone.flatRateUsd ? Number(zone.flatRateUsd) : 0
            shippingCostKhr = zone.flatRateKhr || 0
            break

          case "WEIGHT_BASED":
            const weight = weightKg || 0
            const baseWeight = zone.baseWeightKg ? Number(zone.baseWeightKg) : 0
            const chargeableWeight = Math.max(0, weight - baseWeight)

            if (zone.pricePerKgUsd) {
              shippingCostUsd = chargeableWeight * Number(zone.pricePerKgUsd)
            }
            if (zone.pricePerKgKhr) {
              shippingCostKhr = Math.round(chargeableWeight * zone.pricePerKgKhr)
            }
            break
        }
      }

      return {
        zoneId: zone.id,
        zoneName: {
          en: zone.nameEn,
          kh: zone.nameKh,
        },
        rateType: zone.rateType,
        shippingCostUsd: isFree ? 0 : shippingCostUsd,
        shippingCostKhr: isFree ? 0 : shippingCostKhr,
        isFree,
        freeShippingThreshold: zone.freeThresholdUsd ? {
          usd: Number(zone.freeThresholdUsd),
          khr: zone.freeThresholdKhr || 0,
        } : null,
        estimatedDelivery: {
          minDays: zone.minDeliveryDays,
          maxDays: zone.maxDeliveryDays,
        },
      }
    })

    return NextResponse.json({
      available: true,
      region,
      options: shippingOptions,
      // Return the cheapest option as default
      recommended: shippingOptions.reduce((prev, curr) =>
        curr.shippingCostUsd < prev.shippingCostUsd ? curr : prev
      ),
    })
  } catch (error) {
    console.error("Calculate shipping error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
