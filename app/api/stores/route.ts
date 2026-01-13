import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

// Operating hours schema
const hoursSchema = z.record(
  z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]),
  z.object({
    open: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format (HH:MM)"),
    close: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format (HH:MM)"),
    closed: z.boolean().optional(),
  }).optional()
).optional()

const storeLocationSchema = z.object({
  name: z.string().min(1, "Store name is required"),
  nameKh: z.string().optional().nullable(),
  address: z.string().min(1, "Address is required"),
  addressKh: z.string().optional().nullable(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  hours: hoursSchema,
  hoursNote: z.string().optional().nullable(),
  hoursNoteKh: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  descriptionKh: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  isActive: z.boolean().optional().default(true),
  isPrimary: z.boolean().optional().default(false),
  sortOrder: z.number().int().optional().default(0),
})

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// GET /api/stores - List store locations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get("active") !== "false"
    const customerLat = searchParams.get("lat")
    const customerLng = searchParams.get("lng")
    const limit = parseInt(searchParams.get("limit") || "50")

    const where: Record<string, unknown> = {}
    if (activeOnly) {
      where.isActive = true
    }

    const stores = await prisma.storeLocation.findMany({
      where,
      orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
      take: limit,
    })

    // If customer location provided, calculate distances and sort by nearest
    if (customerLat && customerLng) {
      const lat = parseFloat(customerLat)
      const lng = parseFloat(customerLng)

      if (!isNaN(lat) && !isNaN(lng)) {
        const storesWithDistance = stores.map((store) => ({
          ...store,
          lat: Number(store.lat),
          lng: Number(store.lng),
          distance: calculateDistance(
            lat,
            lng,
            Number(store.lat),
            Number(store.lng)
          ),
        }))

        // Sort by distance (nearest first)
        storesWithDistance.sort((a, b) => a.distance - b.distance)

        return NextResponse.json({
          stores: storesWithDistance,
          nearest: storesWithDistance[0] || null,
        })
      }
    }

    // Convert Decimal to number for JSON serialization
    const storesFormatted = stores.map((store) => ({
      ...store,
      lat: Number(store.lat),
      lng: Number(store.lng),
    }))

    return NextResponse.json({ stores: storesFormatted })
  } catch (error) {
    console.error("Get stores error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST /api/stores - Create store location
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const result = storeLocationSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const data = result.data

    // If this is set as primary, unset others
    if (data.isPrimary) {
      await prisma.storeLocation.updateMany({
        where: { isPrimary: true },
        data: { isPrimary: false },
      })
    }

    const store = await prisma.storeLocation.create({
      data: {
        name: data.name,
        nameKh: data.nameKh,
        address: data.address,
        addressKh: data.addressKh,
        lat: data.lat,
        lng: data.lng,
        phone: data.phone,
        email: data.email,
        hours: data.hours || undefined,
        hoursNote: data.hoursNote,
        hoursNoteKh: data.hoursNoteKh,
        description: data.description,
        descriptionKh: data.descriptionKh,
        imageUrl: data.imageUrl,
        isActive: data.isActive,
        isPrimary: data.isPrimary,
        sortOrder: data.sortOrder,
      },
    })

    return NextResponse.json(
      {
        ...store,
        lat: Number(store.lat),
        lng: Number(store.lng),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Create store error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

const storeUpdateSchema = storeLocationSchema.partial().extend({
  id: z.string().min(1, "Store ID is required"),
})

// PUT /api/stores - Update store location
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    const result = storeUpdateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { id, ...data } = result.data

    // Check if store exists
    const existing = await prisma.storeLocation.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 })
    }

    // If setting as primary, unset others
    if (data.isPrimary) {
      await prisma.storeLocation.updateMany({
        where: { isPrimary: true, id: { not: id } },
        data: { isPrimary: false },
      })
    }

    const store = await prisma.storeLocation.update({
      where: { id },
      data,
    })

    return NextResponse.json({
      ...store,
      lat: Number(store.lat),
      lng: Number(store.lng),
    })
  } catch (error) {
    console.error("Update store error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE /api/stores - Delete store location
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { error: "Store ID is required" },
        { status: 400 }
      )
    }

    // Check if store exists
    const existing = await prisma.storeLocation.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 })
    }

    await prisma.storeLocation.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete store error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
