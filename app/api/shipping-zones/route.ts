import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const shippingZoneSchema = z.object({
  nameEn: z.string().min(1, "English name is required"),
  nameKh: z.string().min(1, "Khmer name is required"),
  regions: z.array(z.string()).min(1, "At least one region is required"),
  rateType: z.enum(["FLAT_RATE", "WEIGHT_BASED", "FREE"]).default("FLAT_RATE"),
  flatRateUsd: z.number().min(0).optional().nullable(),
  flatRateKhr: z.number().int().min(0).optional().nullable(),
  pricePerKgUsd: z.number().min(0).optional().nullable(),
  pricePerKgKhr: z.number().int().min(0).optional().nullable(),
  baseWeightKg: z.number().min(0).optional().nullable(),
  freeThresholdUsd: z.number().min(0).optional().nullable(),
  freeThresholdKhr: z.number().int().min(0).optional().nullable(),
  minDeliveryDays: z.number().int().min(0).optional().nullable(),
  maxDeliveryDays: z.number().int().min(0).optional().nullable(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
})

const shippingZoneUpdateSchema = shippingZoneSchema.partial().extend({
  id: z.string().min(1, "Shipping zone ID is required"),
})

// GET /api/shipping-zones - List all shipping zones
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const isActive = searchParams.get("isActive")
    const region = searchParams.get("region") // Find zones containing this region

    const where: Record<string, unknown> = {}

    if (isActive !== null) {
      where.isActive = isActive === "true"
    }

    const zones = await prisma.shippingZone.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
    })

    // Filter by region if specified (JSON array contains check)
    let filteredZones = zones
    if (region) {
      filteredZones = zones.filter((zone) => {
        const regions = zone.regions as string[]
        return Array.isArray(regions) && regions.includes(region)
      })
    }

    return NextResponse.json({
      zones: filteredZones,
      total: filteredZones.length
    })
  } catch (error) {
    console.error("Get shipping zones error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/shipping-zones - Create a new shipping zone
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const result = shippingZoneSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const data = result.data

    // Validate rate type consistency
    if (data.rateType === "FLAT_RATE" && !data.flatRateUsd && !data.flatRateKhr) {
      return NextResponse.json(
        { error: "Flat rate pricing is required for FLAT_RATE type" },
        { status: 400 }
      )
    }

    if (data.rateType === "WEIGHT_BASED" && !data.pricePerKgUsd && !data.pricePerKgKhr) {
      return NextResponse.json(
        { error: "Per-kg pricing is required for WEIGHT_BASED type" },
        { status: 400 }
      )
    }

    // Validate delivery days
    if (data.minDeliveryDays && data.maxDeliveryDays && data.minDeliveryDays > data.maxDeliveryDays) {
      return NextResponse.json(
        { error: "Minimum delivery days cannot exceed maximum delivery days" },
        { status: 400 }
      )
    }

    const zone = await prisma.shippingZone.create({
      data: {
        nameEn: data.nameEn,
        nameKh: data.nameKh,
        regions: data.regions,
        rateType: data.rateType,
        flatRateUsd: data.flatRateUsd,
        flatRateKhr: data.flatRateKhr,
        pricePerKgUsd: data.pricePerKgUsd,
        pricePerKgKhr: data.pricePerKgKhr,
        baseWeightKg: data.baseWeightKg,
        freeThresholdUsd: data.freeThresholdUsd,
        freeThresholdKhr: data.freeThresholdKhr,
        minDeliveryDays: data.minDeliveryDays,
        maxDeliveryDays: data.maxDeliveryDays,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      },
    })

    return NextResponse.json(zone, { status: 201 })
  } catch (error) {
    console.error("Create shipping zone error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/shipping-zones - Update a shipping zone
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    const result = shippingZoneUpdateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { id, ...data } = result.data

    // Check if zone exists
    const existingZone = await prisma.shippingZone.findUnique({
      where: { id },
    })

    if (!existingZone) {
      return NextResponse.json({ error: "Shipping zone not found" }, { status: 404 })
    }

    // Validate rate type consistency if updating
    const rateType = data.rateType || existingZone.rateType
    const flatRateUsd = data.flatRateUsd !== undefined ? data.flatRateUsd : existingZone.flatRateUsd
    const flatRateKhr = data.flatRateKhr !== undefined ? data.flatRateKhr : existingZone.flatRateKhr
    const pricePerKgUsd = data.pricePerKgUsd !== undefined ? data.pricePerKgUsd : existingZone.pricePerKgUsd
    const pricePerKgKhr = data.pricePerKgKhr !== undefined ? data.pricePerKgKhr : existingZone.pricePerKgKhr

    if (rateType === "FLAT_RATE" && !flatRateUsd && !flatRateKhr) {
      return NextResponse.json(
        { error: "Flat rate pricing is required for FLAT_RATE type" },
        { status: 400 }
      )
    }

    if (rateType === "WEIGHT_BASED" && !pricePerKgUsd && !pricePerKgKhr) {
      return NextResponse.json(
        { error: "Per-kg pricing is required for WEIGHT_BASED type" },
        { status: 400 }
      )
    }

    // Validate delivery days if provided
    const minDays = data.minDeliveryDays !== undefined ? data.minDeliveryDays : existingZone.minDeliveryDays
    const maxDays = data.maxDeliveryDays !== undefined ? data.maxDeliveryDays : existingZone.maxDeliveryDays
    if (minDays && maxDays && minDays > maxDays) {
      return NextResponse.json(
        { error: "Minimum delivery days cannot exceed maximum delivery days" },
        { status: 400 }
      )
    }

    const zone = await prisma.shippingZone.update({
      where: { id },
      data,
    })

    return NextResponse.json(zone)
  } catch (error) {
    console.error("Update shipping zone error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/shipping-zones?id=xxx - Delete a shipping zone
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Shipping zone ID is required" }, { status: 400 })
    }

    // Check if zone exists
    const existingZone = await prisma.shippingZone.findUnique({
      where: { id },
    })

    if (!existingZone) {
      return NextResponse.json({ error: "Shipping zone not found" }, { status: 404 })
    }

    await prisma.shippingZone.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete shipping zone error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
