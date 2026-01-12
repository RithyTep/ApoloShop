import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import {
  sendOrderStatusNotification,
  type OrderNotificationData,
  type OrderStatusType,
} from "@/lib/notification-service"

const orderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
})

const orderCreateSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerPhone: z.string().min(1, "Phone is required"),
  currency: z.enum(["USD", "KHR"]),
  channel: z.enum(["WEBSITE", "TELEGRAM", "MESSENGER", "PHONE", "WALK_IN"]),
  note: z.string().optional(),
  items: z.array(orderItemSchema).min(1, "Order must have at least one item"),
})

// Generate order number
function generateOrderNumber(): string {
  const now = new Date()
  const date = now.toISOString().slice(0, 10).replace(/-/g, "")
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0")
  return `ORD-${date}-${random}`
}

// GET /api/orders - List orders
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const status = searchParams.get("status")
    const channel = searchParams.get("channel")
    const customerId = searchParams.get("customerId")

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (channel) where.channel = channel
    if (customerId) where.customerId = customerId

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: true,
          items: {
            include: {
              product: true,
            },
          },
          payments: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.order.count({ where }),
    ])

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Get orders error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/orders - Create order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const result = orderCreateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const data = result.data

    // Fetch product prices from database
    const productIds = data.items.map((item) => item.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, priceUsd: true, priceKhr: true, nameEn: true },
    })

    // Create a map for quick lookup
    const productMap = new Map(products.map((p) => [p.id, p]))

    // Validate all products exist
    for (const item of data.items) {
      if (!productMap.has(item.productId)) {
        return NextResponse.json(
          { error: `Product not found: ${item.productId}` },
          { status: 400 }
        )
      }
    }

    // Build items with prices from database
    const itemsWithPrices = data.items.map((item) => {
      const product = productMap.get(item.productId)!
      return {
        productId: item.productId,
        quantity: item.quantity,
        priceUsd: Number(product.priceUsd),
        priceKhr: product.priceKhr,
      }
    })

    // Find or create customer
    let customer = await prisma.customer.findUnique({
      where: { phone: data.customerPhone },
    })

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: data.customerName,
          phone: data.customerPhone,
        },
      })
    }

    // Calculate totals
    const totalUsd = itemsWithPrices.reduce(
      (sum, item) => sum + item.priceUsd * item.quantity,
      0
    )
    const totalKhr = itemsWithPrices.reduce(
      (sum, item) => sum + item.priceKhr * item.quantity,
      0
    )

    // Create order with items
    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        customerId: customer.id,
        status: "NEW",
        totalUsd,
        totalKhr,
        currency: data.currency,
        channel: data.channel,
        note: data.note,
        items: {
          create: itemsWithPrices,
        },
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    })

    // Deduct inventory
    for (const item of data.items) {
      await prisma.inventory.updateMany({
        where: { productId: item.productId },
        data: {
          quantity: { decrement: item.quantity },
          lastUpdated: new Date(),
        },
      })
    }

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error("Create order error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

const orderUpdateSchema = z.object({
  id: z.string().min(1, "Order ID is required"),
  status: z.enum(["NEW", "CONFIRMED", "PREPARING", "READY", "COMPLETED", "CANCELLED"]).optional(),
  note: z.string().optional().nullable(),
})

// Valid status transitions
const statusTransitions: Record<string, string[]> = {
  NEW: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
}

// PUT /api/orders - Update order status
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    const result = orderUpdateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { id, status, note } = result.data

    // Check if order exists
    const existing = await prisma.order.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Validate status transition
    if (status && status !== existing.status) {
      const allowedTransitions = statusTransitions[existing.status] || []
      if (!allowedTransitions.includes(status)) {
        return NextResponse.json(
          { error: `Cannot transition from ${existing.status} to ${status}` },
          { status: 400 }
        )
      }
    }

    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status
    if (note !== undefined) updateData.note = note

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
        payments: true,
      },
    })

    // Send notification if status changed (non-blocking)
    if (status && status !== existing.status) {
      const notificationData: OrderNotificationData = {
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        customerName: order.customer.name,
        customerPhone: order.customer.phone,
        customerEmail: order.customer.email,
        status: status as OrderStatusType,
        totalUsd: Number(order.totalUsd),
        totalKhr: order.totalKhr,
        currency: order.currency as "USD" | "KHR",
        items: order.items.map((item) => ({
          productName: item.product?.nameEn || item.productName || "Unknown",
          quantity: item.quantity,
          priceUsd: Number(item.priceUsd),
          priceKhr: item.priceKhr,
        })),
      }

      // Fire and forget - don't block the response
      sendOrderStatusNotification(notificationData).catch((err) => {
        console.error("[Orders API] Failed to send notification:", err)
      })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error("Update order error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
