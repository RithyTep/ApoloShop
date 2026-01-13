import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { PickupStatus } from "@prisma/client"
import crypto from "crypto"

// Generate a unique 6-character verification code
function generateVerificationCode(): string {
  return crypto.randomBytes(3).toString("hex").toUpperCase()
}

// Generate QR code data containing order info
function generateQRCodeData(
  orderId: string,
  verificationCode: string,
  orderNumber?: string
): string {
  return JSON.stringify({
    type: "STORE_PICKUP",
    orderId,
    verificationCode,
    orderNumber,
    timestamp: Date.now(),
  })
}

// Schema for creating a store pickup
const createPickupSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  storeId: z.string().min(1, "Store ID is required"),
  scheduledDate: z.string().transform((str) => new Date(str)),
  timeSlotId: z.string().optional().nullable(),
  customerName: z.string().min(1, "Customer name is required"),
  customerPhone: z.string().optional().nullable(),
  customerEmail: z.string().email().optional().nullable(),
  customerNotes: z.string().optional().nullable(),
})

// Schema for updating pickup status
const updateStatusSchema = z.object({
  id: z.string().min(1, "Pickup ID is required"),
  status: z.nativeEnum(PickupStatus),
  notes: z.string().optional().nullable(),
  staffNotes: z.string().optional().nullable(),
  verifiedBy: z.string().optional().nullable(),
})

// Schema for time slot
const timeSlotSchema = z.object({
  storeId: z.string().min(1, "Store ID is required"),
  dayOfWeek: z.number().int().min(0).max(6).optional().nullable(),
  specificDate: z.string().transform((str) => new Date(str)).optional().nullable(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format (HH:MM)"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format (HH:MM)"),
  maxPickups: z.number().int().positive().optional().default(10),
  isActive: z.boolean().optional().default(true),
})

// GET /api/store-pickup - List pickups or get available time slots
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")

    // Get available stores with pickup enabled
    if (action === "stores") {
      const stores = await prisma.storeLocation.findMany({
        where: {
          isActive: true,
          pickupEnabled: true,
        },
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
        include: {
          timeSlots: {
            where: { isActive: true },
            orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
          },
        },
      })

      const storesFormatted = stores.map((store) => ({
        ...store,
        lat: Number(store.lat),
        lng: Number(store.lng),
      }))

      return NextResponse.json({ stores: storesFormatted })
    }

    // Get time slots for a specific store and date
    if (action === "slots") {
      const storeId = searchParams.get("storeId")
      const dateStr = searchParams.get("date")

      if (!storeId) {
        return NextResponse.json(
          { error: "Store ID is required" },
          { status: 400 }
        )
      }

      const date = dateStr ? new Date(dateStr) : new Date()
      const dayOfWeek = date.getDay() // 0 = Sunday, 1 = Monday, etc.

      // Get recurring slots for this day of week and any specific date slots
      const slots = await prisma.pickupTimeSlot.findMany({
        where: {
          storeId,
          isActive: true,
          OR: [
            { dayOfWeek },
            {
              specificDate: {
                gte: new Date(date.setHours(0, 0, 0, 0)),
                lte: new Date(date.setHours(23, 59, 59, 999)),
              },
            },
          ],
        },
        orderBy: { startTime: "asc" },
      })

      // Get booking counts for each slot on this date
      const slotsWithAvailability = await Promise.all(
        slots.map(async (slot) => {
          const bookings = await prisma.storePickup.count({
            where: {
              timeSlotId: slot.id,
              scheduledDate: {
                gte: new Date(new Date(dateStr || new Date()).setHours(0, 0, 0, 0)),
                lte: new Date(new Date(dateStr || new Date()).setHours(23, 59, 59, 999)),
              },
              status: {
                notIn: [PickupStatus.CANCELLED, PickupStatus.EXPIRED, PickupStatus.PICKED_UP],
              },
            },
          })

          return {
            ...slot,
            bookedCount: bookings,
            availableCount: Math.max(0, slot.maxPickups - bookings),
            isAvailable: bookings < slot.maxPickups,
          }
        })
      )

      return NextResponse.json({ slots: slotsWithAvailability, date: date.toISOString() })
    }

    // Get pickup by verification code (for in-store verification)
    if (action === "verify") {
      const code = searchParams.get("code")
      if (!code) {
        return NextResponse.json(
          { error: "Verification code is required" },
          { status: 400 }
        )
      }

      const pickup = await prisma.storePickup.findUnique({
        where: { verificationCode: code.toUpperCase() },
        include: {
          store: true,
          timeSlot: true,
          statusHistory: {
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
      })

      if (!pickup) {
        return NextResponse.json(
          { error: "Invalid verification code" },
          { status: 404 }
        )
      }

      return NextResponse.json({ pickup })
    }

    // Get pickup by order ID
    if (action === "order") {
      const orderId = searchParams.get("orderId")
      if (!orderId) {
        return NextResponse.json(
          { error: "Order ID is required" },
          { status: 400 }
        )
      }

      const pickup = await prisma.storePickup.findUnique({
        where: { orderId },
        include: {
          store: true,
          timeSlot: true,
          statusHistory: {
            orderBy: { createdAt: "desc" },
          },
        },
      })

      if (!pickup) {
        return NextResponse.json(
          { error: "Pickup not found for this order" },
          { status: 404 }
        )
      }

      return NextResponse.json({ pickup })
    }

    // List all pickups (admin view)
    const storeId = searchParams.get("storeId")
    const status = searchParams.get("status") as PickupStatus | null
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")

    const where: Record<string, unknown> = {}
    if (storeId) where.storeId = storeId
    if (status) where.status = status
    if (dateFrom || dateTo) {
      where.scheduledDate = {}
      if (dateFrom) (where.scheduledDate as Record<string, unknown>).gte = new Date(dateFrom)
      if (dateTo) (where.scheduledDate as Record<string, unknown>).lte = new Date(dateTo)
    }

    const [pickups, total] = await Promise.all([
      prisma.storePickup.findMany({
        where,
        include: {
          store: true,
          timeSlot: true,
        },
        orderBy: { scheduledDate: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.storePickup.count({ where }),
    ])

    // Get status counts for dashboard
    const statusCounts = await prisma.storePickup.groupBy({
      by: ["status"],
      _count: true,
      where: storeId ? { storeId } : undefined,
    })

    return NextResponse.json({
      pickups,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      statusCounts: statusCounts.reduce(
        (acc, { status, _count }) => ({ ...acc, [status]: _count }),
        {} as Record<PickupStatus, number>
      ),
    })
  } catch (error) {
    console.error("Get store pickup error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST /api/store-pickup - Create a store pickup
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")

    // Create time slot (admin)
    if (action === "slot") {
      const body = await request.json()
      const result = timeSlotSchema.safeParse(body)

      if (!result.success) {
        return NextResponse.json(
          { error: "Validation failed", details: result.error.flatten() },
          { status: 400 }
        )
      }

      // Verify store exists and has pickup enabled
      const store = await prisma.storeLocation.findUnique({
        where: { id: result.data.storeId },
      })

      if (!store) {
        return NextResponse.json({ error: "Store not found" }, { status: 404 })
      }

      if (!store.pickupEnabled) {
        return NextResponse.json(
          { error: "Store does not have pickup enabled" },
          { status: 400 }
        )
      }

      const slot = await prisma.pickupTimeSlot.create({
        data: result.data,
      })

      return NextResponse.json(slot, { status: 201 })
    }

    // Create pickup order
    const body = await request.json()
    const result = createPickupSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const data = result.data

    // Verify store exists and has pickup enabled
    const store = await prisma.storeLocation.findUnique({
      where: { id: data.storeId },
    })

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 })
    }

    if (!store.pickupEnabled) {
      return NextResponse.json(
        { error: "Store does not have pickup enabled" },
        { status: 400 }
      )
    }

    // Check if pickup already exists for this order
    const existingPickup = await prisma.storePickup.findUnique({
      where: { orderId: data.orderId },
    })

    if (existingPickup) {
      return NextResponse.json(
        { error: "Pickup already exists for this order" },
        { status: 400 }
      )
    }

    // If time slot specified, verify availability
    if (data.timeSlotId) {
      const slot = await prisma.pickupTimeSlot.findUnique({
        where: { id: data.timeSlotId },
      })

      if (!slot || !slot.isActive) {
        return NextResponse.json(
          { error: "Invalid or inactive time slot" },
          { status: 400 }
        )
      }

      // Check slot capacity
      const bookingsCount = await prisma.storePickup.count({
        where: {
          timeSlotId: data.timeSlotId,
          scheduledDate: {
            gte: new Date(data.scheduledDate.setHours(0, 0, 0, 0)),
            lte: new Date(data.scheduledDate.setHours(23, 59, 59, 999)),
          },
          status: {
            notIn: [PickupStatus.CANCELLED, PickupStatus.EXPIRED, PickupStatus.PICKED_UP],
          },
        },
      })

      if (bookingsCount >= slot.maxPickups) {
        return NextResponse.json(
          { error: "Time slot is fully booked" },
          { status: 400 }
        )
      }
    }

    // Generate unique verification code
    let verificationCode: string
    let attempts = 0
    do {
      verificationCode = generateVerificationCode()
      const existing = await prisma.storePickup.findUnique({
        where: { verificationCode },
      })
      if (!existing) break
      attempts++
    } while (attempts < 10)

    if (attempts >= 10) {
      return NextResponse.json(
        { error: "Failed to generate unique verification code" },
        { status: 500 }
      )
    }

    // Get order number for QR code
    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
      select: { orderNumber: true },
    })

    const qrCodeData = generateQRCodeData(
      data.orderId,
      verificationCode,
      order?.orderNumber
    )

    // Create the pickup
    const pickup = await prisma.storePickup.create({
      data: {
        orderId: data.orderId,
        storeId: data.storeId,
        scheduledDate: data.scheduledDate,
        timeSlotId: data.timeSlotId,
        verificationCode,
        qrCodeData,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail,
        customerNotes: data.customerNotes,
        status: PickupStatus.PENDING,
        statusHistory: {
          create: {
            status: PickupStatus.PENDING,
            notes: "Pickup order created",
          },
        },
      },
      include: {
        store: true,
        timeSlot: true,
      },
    })

    return NextResponse.json(pickup, { status: 201 })
  } catch (error) {
    console.error("Create store pickup error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT /api/store-pickup - Update pickup status
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const result = updateStatusSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { id, status, notes, staffNotes, verifiedBy } = result.data

    // Get current pickup
    const currentPickup = await prisma.storePickup.findUnique({
      where: { id },
    })

    if (!currentPickup) {
      return NextResponse.json({ error: "Pickup not found" }, { status: 404 })
    }

    // Validate status transitions
    const validTransitions: Record<PickupStatus, PickupStatus[]> = {
      PENDING: [PickupStatus.CONFIRMED, PickupStatus.CANCELLED],
      CONFIRMED: [PickupStatus.PREPARING, PickupStatus.CANCELLED],
      PREPARING: [PickupStatus.READY, PickupStatus.CANCELLED],
      READY: [PickupStatus.PICKED_UP, PickupStatus.EXPIRED, PickupStatus.CANCELLED],
      PICKED_UP: [], // Final state
      CANCELLED: [], // Final state
      EXPIRED: [PickupStatus.READY], // Can reactivate an expired pickup
    }

    if (!validTransitions[currentPickup.status].includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid status transition from ${currentPickup.status} to ${status}`,
        },
        { status: 400 }
      )
    }

    // Update pickup
    const updateData: Record<string, unknown> = {
      status,
      statusChangedAt: new Date(),
    }

    if (staffNotes !== undefined) {
      updateData.staffNotes = staffNotes
    }

    // Mark as ready notification sent if transitioning to READY
    if (status === PickupStatus.READY) {
      updateData.readyNotificationSent = true
    }

    // Mark verification info if picked up
    if (status === PickupStatus.PICKED_UP) {
      updateData.verifiedAt = new Date()
      if (verifiedBy) {
        updateData.verifiedBy = verifiedBy
      }
    }

    const pickup = await prisma.storePickup.update({
      where: { id },
      data: {
        ...updateData,
        statusHistory: {
          create: {
            status,
            notes,
            changedBy: verifiedBy,
          },
        },
      },
      include: {
        store: true,
        timeSlot: true,
        statusHistory: {
          orderBy: { createdAt: "desc" },
        },
      },
    })

    return NextResponse.json(pickup)
  } catch (error) {
    console.error("Update store pickup error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE /api/store-pickup - Delete pickup or time slot
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const action = searchParams.get("action")

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 })
    }

    // Delete time slot
    if (action === "slot") {
      const slot = await prisma.pickupTimeSlot.findUnique({ where: { id } })
      if (!slot) {
        return NextResponse.json({ error: "Time slot not found" }, { status: 404 })
      }

      await prisma.pickupTimeSlot.delete({ where: { id } })
      return NextResponse.json({ success: true })
    }

    // Delete pickup (cancel)
    const pickup = await prisma.storePickup.findUnique({ where: { id } })
    if (!pickup) {
      return NextResponse.json({ error: "Pickup not found" }, { status: 404 })
    }

    // Only allow deletion of pending or cancelled pickups
    if (
      pickup.status !== PickupStatus.PENDING &&
      pickup.status !== PickupStatus.CANCELLED
    ) {
      return NextResponse.json(
        { error: "Can only delete pending or cancelled pickups" },
        { status: 400 }
      )
    }

    await prisma.storePickup.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete store pickup error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
