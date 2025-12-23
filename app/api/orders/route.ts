import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const orderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  priceUsd: z.number().positive(),
  priceKhr: z.number().int().positive(),
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
    const totalUsd = data.items.reduce(
      (sum, item) => sum + item.priceUsd * item.quantity,
      0
    )
    const totalKhr = data.items.reduce(
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
          create: data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            priceUsd: item.priceUsd,
            priceKhr: item.priceKhr,
          })),
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
