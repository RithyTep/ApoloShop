import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import {
  checkCartAvailability,
  getSplitShipmentOptions,
  createShipment,
  createSplitShipments,
  getOrderShipments,
  getPendingShipments,
  updateShipmentStatus,
  cancelShipment,
} from "@/lib/split-shipment-service"

// Validation schemas
const checkAvailabilitySchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().positive(),
  })),
})

const createShipmentSchema = z.object({
  orderId: z.string(),
  type: z.enum(["STANDARD", "SPLIT", "PARTIAL"]).default("STANDARD"),
  items: z.array(z.object({
    orderItemId: z.string(),
    productId: z.string().optional(),
    productName: z.string(),
    productSku: z.string().optional(),
    quantity: z.number().int().positive(),
    availabilityStatus: z.string().optional(),
    expectedAvailableDate: z.string().datetime().optional(),
  })),
  shippingAddress: z.any().optional(),
  shippingChargeUsd: z.number().optional(),
  shippingChargeKhr: z.number().optional(),
  estimatedShipDate: z.string().datetime().optional(),
  estimatedDeliveryDate: z.string().datetime().optional(),
  customerConsent: z.boolean().optional(),
  notes: z.string().optional(),
})

const createSplitShipmentsSchema = z.object({
  orderId: z.string(),
  splitOption: z.enum(["split", "combined"]),
  shippingAddress: z.any(),
})

const updateStatusSchema = z.object({
  status: z.enum(["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]),
  trackingNumber: z.string().optional(),
  courier: z.enum(["JT_EXPRESS", "NINJA_VAN", "WING_DELIVERY", "OTHER"]).optional(),
  courierName: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  notifyCustomer: z.boolean().optional(),
})

// GET /api/shipments - List shipments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")
    const orderId = searchParams.get("orderId")
    const shipmentId = searchParams.get("id")
    const status = searchParams.get("status")
    const type = searchParams.get("type")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")

    // Check availability for cart items
    if (action === "check-availability") {
      const itemsParam = searchParams.get("items")
      if (!itemsParam) {
        return NextResponse.json({ error: "Items parameter required" }, { status: 400 })
      }
      try {
        const items = JSON.parse(itemsParam)
        const availability = await checkCartAvailability(items)
        return NextResponse.json({ availability })
      } catch {
        return NextResponse.json({ error: "Invalid items format" }, { status: 400 })
      }
    }

    // Get split shipment options
    if (action === "split-options") {
      const itemsParam = searchParams.get("items")
      if (!itemsParam) {
        return NextResponse.json({ error: "Items parameter required" }, { status: 400 })
      }
      try {
        const items = JSON.parse(itemsParam)
        const options = await getSplitShipmentOptions(items)
        return NextResponse.json({ options })
      } catch {
        return NextResponse.json({ error: "Invalid items format" }, { status: 400 })
      }
    }

    // Get shipments for a specific order
    if (orderId) {
      const shipments = await getOrderShipments(orderId)
      return NextResponse.json({ shipments })
    }

    // Get specific shipment details
    if (shipmentId) {
      const shipment = await prisma.shipment.findUnique({
        where: { id: shipmentId },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              customer: {
                select: { id: true, name: true, phone: true, email: true },
              },
            },
          },
          items: true,
          statusHistory: {
            orderBy: { createdAt: "desc" },
          },
        },
      })

      if (!shipment) {
        return NextResponse.json({ error: "Shipment not found" }, { status: 404 })
      }

      return NextResponse.json({ shipment })
    }

    // Get pending shipments for admin fulfillment (default)
    const statusFilter = status ? status.split(",") as ("PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED")[] : undefined
    const typeFilter = type as "STANDARD" | "SPLIT" | "PARTIAL" | undefined

    const { shipments, total } = await getPendingShipments({
      status: statusFilter,
      type: typeFilter,
      limit,
      offset: (page - 1) * limit,
    })

    return NextResponse.json({
      shipments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Get shipments error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/shipments - Create shipment(s)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")

    // Create split shipments
    if (action === "create-split") {
      const result = createSplitShipmentsSchema.safeParse(body)
      if (!result.success) {
        return NextResponse.json(
          { error: "Validation failed", details: result.error.flatten() },
          { status: 400 }
        )
      }

      const { orderId, splitOption, shippingAddress } = result.data

      // Get order with items
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            select: { id: true, productId: true, quantity: true },
          },
        },
      })

      if (!order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 })
      }

      // Get cart items for availability check
      const cartItems = order.items
        .filter(item => item.productId)
        .map(item => ({
          productId: item.productId!,
          quantity: item.quantity,
        }))

      const options = await getSplitShipmentOptions(cartItems)

      if (splitOption === "split" && options.canSplit) {
        // Create split shipments
        const orderItems = order.items
          .filter(item => item.productId)
          .map(item => ({
            id: item.id,
            productId: item.productId!,
          }))

        const shipmentIds = await createSplitShipments(
          orderId,
          options,
          shippingAddress,
          orderItems
        )

        return NextResponse.json({
          success: true,
          shipments: shipmentIds,
          message: "Split shipments created successfully",
        })
      } else {
        // Create single combined shipment
        const shipment = await createShipment({
          orderId,
          type: "STANDARD",
          items: order.items.map(item => ({
            orderItemId: item.id,
            productId: item.productId ?? undefined,
            productName: "Product",
            quantity: item.quantity,
          })),
          shippingAddress,
          shippingChargeUsd: options.combinedShipment.shippingCharge,
          shippingChargeKhr: Math.round(options.combinedShipment.shippingCharge * 4000),
          estimatedShipDate: options.combinedShipment.estimatedShipDate,
          customerConsent: false,
        })

        return NextResponse.json({
          success: true,
          shipment,
          message: "Combined shipment created successfully",
        })
      }
    }

    // Create a single shipment
    const result = createShipmentSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const data = result.data
    const shipment = await createShipment({
      ...data,
      items: data.items.map(item => ({
        ...item,
        expectedAvailableDate: item.expectedAvailableDate ? new Date(item.expectedAvailableDate) : undefined,
      })),
      estimatedShipDate: data.estimatedShipDate ? new Date(data.estimatedShipDate) : undefined,
      estimatedDeliveryDate: data.estimatedDeliveryDate ? new Date(data.estimatedDeliveryDate) : undefined,
    })

    return NextResponse.json({
      success: true,
      shipment,
    })
  } catch (error) {
    console.error("Create shipment error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH /api/shipments - Update shipment status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const shipmentId = searchParams.get("id")

    if (!shipmentId) {
      return NextResponse.json({ error: "Shipment ID required" }, { status: 400 })
    }

    const result = updateStatusSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    await updateShipmentStatus(shipmentId, result.data.status, {
      trackingNumber: result.data.trackingNumber,
      courier: result.data.courier,
      courierName: result.data.courierName,
      location: result.data.location,
      notes: result.data.notes,
      notifyCustomer: result.data.notifyCustomer,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Update shipment error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/shipments - Cancel shipment
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shipmentId = searchParams.get("id")
    const reason = searchParams.get("reason")

    if (!shipmentId) {
      return NextResponse.json({ error: "Shipment ID required" }, { status: 400 })
    }

    await cancelShipment(shipmentId, reason ?? undefined)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Cancel shipment error:", error)
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
