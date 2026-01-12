import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

// Courier providers available in Cambodia
const courierProviders = ["JT_EXPRESS", "NINJA_VAN", "WING_DELIVERY", "OTHER"] as const
const trackingStatuses = [
  "PENDING",
  "PICKED_UP",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "FAILED_DELIVERY",
  "RETURNED",
] as const

const trackingCreateSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  trackingNumber: z.string().optional(),
  courier: z.enum(courierProviders).default("OTHER"),
  courierName: z.string().optional(),
  estimatedDeliveryDate: z.string().datetime().optional(),
  shippingAddress: z.object({
    fullName: z.string(),
    phone: z.string(),
    province: z.string().optional(),
    district: z.string().optional(),
    addressLine: z.string(),
  }).optional(),
  notifyOnStatusChange: z.boolean().default(true),
  notifyViaTelegram: z.boolean().default(true),
  notifyViaSms: z.boolean().default(false),
})

const trackingUpdateSchema = z.object({
  id: z.string().min(1, "Tracking ID is required"),
  trackingNumber: z.string().optional(),
  courier: z.enum(courierProviders).optional(),
  courierName: z.string().optional(),
  status: z.enum(trackingStatuses).optional(),
  estimatedDeliveryDate: z.string().datetime().optional().nullable(),
  location: z.string().optional(),
  notes: z.string().optional(),
  notifyOnStatusChange: z.boolean().optional(),
  notifyViaTelegram: z.boolean().optional(),
  notifyViaSms: z.boolean().optional(),
})

// GET /api/tracking - List tracking records or get by orderId
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get("orderId")
    const trackingNumber = searchParams.get("trackingNumber")
    const status = searchParams.get("status")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")

    // Get single tracking by orderId
    if (orderId) {
      const tracking = await prisma.orderTracking.findUnique({
        where: { orderId },
        include: {
          order: {
            include: {
              customer: true,
              items: {
                include: {
                  product: true,
                },
              },
            },
          },
          statusHistory: {
            orderBy: { createdAt: "desc" },
          },
        },
      })

      if (!tracking) {
        return NextResponse.json({ error: "Tracking not found" }, { status: 404 })
      }

      return NextResponse.json(tracking)
    }

    // Get single tracking by tracking number (public lookup)
    if (trackingNumber) {
      const tracking = await prisma.orderTracking.findFirst({
        where: { trackingNumber },
        include: {
          order: {
            select: {
              orderNumber: true,
              status: true,
              createdAt: true,
              customer: {
                select: { name: true },
              },
            },
          },
          statusHistory: {
            orderBy: { createdAt: "desc" },
          },
        },
      })

      if (!tracking) {
        return NextResponse.json({ error: "Tracking not found" }, { status: 404 })
      }

      return NextResponse.json(tracking)
    }

    // List all tracking records (admin)
    const where: Record<string, unknown> = {}
    if (status) where.status = status

    const [trackings, total] = await Promise.all([
      prisma.orderTracking.findMany({
        where,
        include: {
          order: {
            include: {
              customer: true,
            },
          },
          statusHistory: {
            take: 1,
            orderBy: { createdAt: "desc" },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.orderTracking.count({ where }),
    ])

    return NextResponse.json({
      trackings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Get tracking error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/tracking - Create tracking for an order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const result = trackingCreateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const data = result.data

    // Check if order exists
    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
      include: { customer: true },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Check if tracking already exists for this order
    const existingTracking = await prisma.orderTracking.findUnique({
      where: { orderId: data.orderId },
    })

    if (existingTracking) {
      return NextResponse.json(
        { error: "Tracking already exists for this order" },
        { status: 400 }
      )
    }

    // Create tracking with initial status history
    const tracking = await prisma.orderTracking.create({
      data: {
        orderId: data.orderId,
        trackingNumber: data.trackingNumber,
        courier: data.courier,
        courierName: data.courier === "OTHER" ? data.courierName : null,
        status: "PENDING",
        estimatedDeliveryDate: data.estimatedDeliveryDate
          ? new Date(data.estimatedDeliveryDate)
          : null,
        shippingAddress: data.shippingAddress,
        notifyOnStatusChange: data.notifyOnStatusChange,
        notifyViaTelegram: data.notifyViaTelegram,
        notifyViaSms: data.notifyViaSms,
        statusHistory: {
          create: {
            status: "PENDING",
            notes: "Tracking created",
          },
        },
      },
      include: {
        order: {
          include: {
            customer: true,
          },
        },
        statusHistory: {
          orderBy: { createdAt: "desc" },
        },
      },
    })

    return NextResponse.json(tracking, { status: 201 })
  } catch (error) {
    console.error("Create tracking error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/tracking - Update tracking info or status
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    const result = trackingUpdateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { id, status, location, notes, estimatedDeliveryDate, ...updateData } = result.data

    // Check if tracking exists
    const existingTracking = await prisma.orderTracking.findUnique({
      where: { id },
      include: { order: { include: { customer: true } } },
    })

    if (!existingTracking) {
      return NextResponse.json({ error: "Tracking not found" }, { status: 404 })
    }

    // Build update data
    const trackingUpdate: Record<string, unknown> = { ...updateData }

    if (estimatedDeliveryDate !== undefined) {
      trackingUpdate.estimatedDeliveryDate = estimatedDeliveryDate
        ? new Date(estimatedDeliveryDate)
        : null
    }

    // Update status if provided and changed
    if (status && status !== existingTracking.status) {
      trackingUpdate.status = status

      // Set actual delivery date if delivered
      if (status === "DELIVERED") {
        trackingUpdate.actualDeliveryDate = new Date()
      }
    }

    // Update tracking and create status history if status changed
    const tracking = await prisma.$transaction(async (tx) => {
      // Update tracking record
      const updated = await tx.orderTracking.update({
        where: { id },
        data: trackingUpdate,
        include: {
          order: {
            include: {
              customer: true,
              items: {
                include: {
                  product: true,
                },
              },
            },
          },
          statusHistory: {
            orderBy: { createdAt: "desc" },
          },
        },
      })

      // Create status history entry if status changed
      if (status && status !== existingTracking.status) {
        await tx.trackingStatusHistory.create({
          data: {
            trackingId: id,
            status,
            location,
            notes,
            notificationSent: false,
          },
        })

        // Send notification if enabled
        if (updated.notifyOnStatusChange) {
          // TODO: Integrate with notification service (Telegram/SMS)
          // For now, mark as notification sent
          await tx.trackingStatusHistory.updateMany({
            where: {
              trackingId: id,
              status,
              notificationSent: false,
            },
            data: { notificationSent: true },
          })
        }
      }

      return updated
    })

    // Refetch with updated history
    const updatedTracking = await prisma.orderTracking.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            customer: true,
            items: {
              include: {
                product: true,
              },
            },
          },
        },
        statusHistory: {
          orderBy: { createdAt: "desc" },
        },
      },
    })

    return NextResponse.json(updatedTracking)
  } catch (error) {
    console.error("Update tracking error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
