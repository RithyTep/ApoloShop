import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const returnItemSchema = z.object({
  orderItemId: z.string().min(1),
  productId: z.string().min(1),
  productName: z.string().min(1),
  quantity: z.number().int().positive(),
  priceUsd: z.number().positive(),
})

const createReturnSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  customerId: z.string().min(1, "Customer ID is required"),
  reason: z.enum([
    "DEFECTIVE",
    "WRONG_ITEM",
    "NOT_AS_DESCRIBED",
    "CHANGED_MIND",
    "SIZE_FIT",
    "QUALITY",
    "LATE_DELIVERY",
    "OTHER",
  ]),
  reasonDetails: z.string().optional(),
  items: z.array(returnItemSchema).min(1, "At least one item is required"),
})

const updateReturnSchema = z.object({
  status: z
    .enum(["PENDING", "APPROVED", "RECEIVED", "REFUNDED", "REJECTED", "CANCELLED"])
    .optional(),
  refundAmountUsd: z.number().optional(),
  refundAmountKhr: z.number().int().optional(),
  refundMethod: z.enum(["ORIGINAL_PAYMENT", "STORE_CREDIT", "BANK_TRANSFER"]).optional(),
  shippingLabel: z.string().optional(),
  trackingNumber: z.string().optional(),
  adminNotes: z.string().optional(),
  rejectionReason: z.string().optional(),
})

// Generate return number
function generateReturnNumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0")
  return `RET-${year}-${random}`
}

// GET /api/returns - List returns
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const status = searchParams.get("status")
    const customerId = searchParams.get("customerId")
    const orderId = searchParams.get("orderId")

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (customerId) where.customerId = customerId
    if (orderId) where.orderId = orderId

    const [returns, total] = await Promise.all([
      prisma.return.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.return.count({ where }),
    ])

    // Fetch related order and customer data
    const orderIds = [...new Set(returns.map((r) => r.orderId))]
    const customerIds = [...new Set(returns.map((r) => r.customerId))]

    const [orders, customers] = await Promise.all([
      prisma.order.findMany({
        where: { id: { in: orderIds } },
        include: { items: { include: { product: true } } },
      }),
      prisma.customer.findMany({
        where: { id: { in: customerIds } },
      }),
    ])

    const ordersMap = new Map(orders.map((o) => [o.id, o]))
    const customersMap = new Map(customers.map((c) => [c.id, c]))

    const enrichedReturns = returns.map((ret) => ({
      ...ret,
      order: ordersMap.get(ret.orderId),
      customer: customersMap.get(ret.customerId),
    }))

    return NextResponse.json({
      returns: enrichedReturns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Get returns error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/returns - Create return request (customer-initiated)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const result = createReturnSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const data = result.data

    // Verify order exists and belongs to customer
    const order = await prisma.order.findFirst({
      where: {
        id: data.orderId,
        customerId: data.customerId,
        status: "COMPLETED", // Only allow returns for completed orders
      },
      include: { items: true },
    })

    if (!order) {
      return NextResponse.json(
        { error: "Order not found or not eligible for return" },
        { status: 404 }
      )
    }

    // Verify items belong to the order
    const orderItemIds = new Set(order.items.map((item) => item.id))
    for (const item of data.items) {
      if (!orderItemIds.has(item.orderItemId)) {
        return NextResponse.json(
          { error: `Item ${item.orderItemId} does not belong to this order` },
          { status: 400 }
        )
      }
    }

    // Check if return already exists for this order
    const existingReturn = await prisma.return.findFirst({
      where: {
        orderId: data.orderId,
        status: { notIn: ["REJECTED", "CANCELLED", "REFUNDED"] },
      },
    })

    if (existingReturn) {
      return NextResponse.json(
        { error: "A return request already exists for this order" },
        { status: 400 }
      )
    }

    // Calculate refund amount based on items
    const refundAmountUsd = data.items.reduce((sum, item) => sum + item.priceUsd * item.quantity, 0)
    const refundAmountKhr = Math.round(refundAmountUsd * 4000) // USD to KHR conversion

    // Create return record
    const returnRecord = await prisma.return.create({
      data: {
        returnNumber: generateReturnNumber(),
        orderId: data.orderId,
        customerId: data.customerId,
        status: "PENDING",
        reason: data.reason,
        reasonDetails: data.reasonDetails,
        items: data.items,
        refundAmountUsd,
        refundAmountKhr,
      },
    })

    return NextResponse.json(returnRecord, { status: 201 })
  } catch (error) {
    console.error("Create return error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH /api/returns - Update return (admin actions)
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Return ID is required" }, { status: 400 })
    }

    const body = await request.json()
    const result = updateReturnSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const data = result.data
    const existingReturn = await prisma.return.findUnique({ where: { id } })

    if (!existingReturn) {
      return NextResponse.json({ error: "Return not found" }, { status: 404 })
    }

    // Build update data with timestamps based on status
    const updateData: Record<string, unknown> = { ...data }

    if (data.status === "APPROVED" && existingReturn.status !== "APPROVED") {
      updateData.approvedAt = new Date()
    }
    if (data.status === "RECEIVED" && existingReturn.status !== "RECEIVED") {
      updateData.receivedAt = new Date()
    }
    if (data.status === "REFUNDED" && existingReturn.status !== "REFUNDED") {
      updateData.refundedAt = new Date()
    }
    if (data.status === "REJECTED" && existingReturn.status !== "REJECTED") {
      updateData.rejectedAt = new Date()
    }

    const updatedReturn = await prisma.return.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(updatedReturn)
  } catch (error) {
    console.error("Update return error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
