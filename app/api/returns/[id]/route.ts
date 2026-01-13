import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

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
  processedBy: z.string().optional(),
})

// GET /api/returns/[id] - Get single return
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const returnRecord = await prisma.return.findUnique({
      where: { id },
    })

    if (!returnRecord) {
      return NextResponse.json({ error: "Return not found" }, { status: 404 })
    }

    // Fetch related data
    const [order, customer] = await Promise.all([
      prisma.order.findUnique({
        where: { id: returnRecord.orderId },
        include: {
          items: { include: { product: true } },
          payments: true,
        },
      }),
      prisma.customer.findUnique({
        where: { id: returnRecord.customerId },
      }),
    ])

    return NextResponse.json({
      ...returnRecord,
      order,
      customer,
    })
  } catch (error) {
    console.error("Get return error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH /api/returns/[id] - Update return (admin workflow)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

// DELETE /api/returns/[id] - Cancel return (customer-initiated)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existingReturn = await prisma.return.findUnique({ where: { id } })

    if (!existingReturn) {
      return NextResponse.json({ error: "Return not found" }, { status: 404 })
    }

    // Only allow cancellation of pending returns
    if (existingReturn.status !== "PENDING") {
      return NextResponse.json(
        { error: "Can only cancel pending return requests" },
        { status: 400 }
      )
    }

    const updatedReturn = await prisma.return.update({
      where: { id },
      data: { status: "CANCELLED" },
    })

    return NextResponse.json(updatedReturn)
  } catch (error) {
    console.error("Cancel return error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
