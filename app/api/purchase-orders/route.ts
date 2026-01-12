import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { createPurchaseOrder, receiveStock } from "@/lib/stock-alert-service"

// GET /api/purchase-orders - Get all purchase orders
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") as "DRAFT" | "PENDING" | "PARTIAL" | "COMPLETED" | "CANCELLED" | null
    const supplierId = searchParams.get("supplierId")

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (supplierId) where.supplierId = supplierId

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where,
      include: {
        inventory: {
          include: {
            product: {
              select: { id: true, nameEn: true, nameKh: true, sku: true, imageUrl: true },
            },
          },
        },
        supplier: {
          select: { id: true, name: true, phone: true, email: true, leadTimeDays: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Get summary counts
    const summary = await prisma.purchaseOrder.groupBy({
      by: ["status"],
      _count: { id: true },
    })

    const summaryMap = summary.reduce(
      (acc, item) => {
        acc[item.status] = item._count.id
        return acc
      },
      {} as Record<string, number>
    )

    return NextResponse.json({
      purchaseOrders,
      summary: {
        draft: summaryMap.DRAFT ?? 0,
        pending: summaryMap.PENDING ?? 0,
        partial: summaryMap.PARTIAL ?? 0,
        completed: summaryMap.COMPLETED ?? 0,
        cancelled: summaryMap.CANCELLED ?? 0,
        total: purchaseOrders.length,
      },
    })
  } catch (error) {
    console.error("Get purchase orders error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/purchase-orders - Create a purchase order
const createPOSchema = z.object({
  // Option 1: Create from stock alert
  alertId: z.string().optional(),
  // Option 2: Create directly
  inventoryId: z.string().optional(),
  supplierId: z.string().optional(),
  quantity: z.number().int().min(1).optional(),
  unitCostUsd: z.number().min(0).optional(),
  notes: z.string().optional(),
  expectedDate: z.string().datetime().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = createPOSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { alertId, inventoryId, supplierId, quantity, unitCostUsd, notes, expectedDate } = result.data

    // If alertId is provided, use the stock alert service
    if (alertId) {
      const poResult = await createPurchaseOrder(alertId, quantity, notes)
      if (!poResult.success) {
        return NextResponse.json({ error: poResult.error }, { status: 400 })
      }
      return NextResponse.json({
        message: "Purchase order created",
        orderId: poResult.orderId,
        orderNumber: poResult.orderNumber,
      }, { status: 201 })
    }

    // Otherwise, create directly
    if (!inventoryId || !quantity) {
      return NextResponse.json(
        { error: "inventoryId and quantity required when not creating from alert" },
        { status: 400 }
      )
    }

    // Get inventory to validate and get supplier info
    const inventory = await prisma.inventory.findUnique({
      where: { id: inventoryId },
      include: { supplier: true },
    })

    if (!inventory) {
      return NextResponse.json({ error: "Inventory not found" }, { status: 404 })
    }

    // Generate PO number
    const year = new Date().getFullYear()
    const prefix = `PO-${year}-`
    const latestOrder = await prisma.purchaseOrder.findFirst({
      where: { orderNumber: { startsWith: prefix } },
      orderBy: { orderNumber: "desc" },
    })
    let sequence = 1
    if (latestOrder) {
      const lastSequence = parseInt(latestOrder.orderNumber.replace(prefix, ""), 10)
      if (!isNaN(lastSequence)) sequence = lastSequence + 1
    }
    const orderNumber = `${prefix}${sequence.toString().padStart(4, "0")}`

    // Calculate expected date
    const leadTimeDays = inventory.supplier?.leadTimeDays ?? 7
    const defaultExpectedDate = new Date()
    defaultExpectedDate.setDate(defaultExpectedDate.getDate() + leadTimeDays)

    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        orderNumber,
        inventoryId,
        supplierId: supplierId ?? inventory.supplierId,
        quantity,
        unitCostUsd: unitCostUsd ?? undefined,
        totalCostUsd: unitCostUsd ? unitCostUsd * quantity : undefined,
        status: "DRAFT",
        notes,
        expectedDate: expectedDate ? new Date(expectedDate) : defaultExpectedDate,
      },
      include: {
        inventory: {
          include: {
            product: { select: { nameEn: true, sku: true } },
          },
        },
        supplier: { select: { name: true } },
      },
    })

    return NextResponse.json(purchaseOrder, { status: 201 })
  } catch (error) {
    console.error("Create purchase order error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH /api/purchase-orders - Update purchase order
const updatePOSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["DRAFT", "PENDING", "PARTIAL", "COMPLETED", "CANCELLED"]).optional(),
  quantity: z.number().int().min(1).optional(),
  unitCostUsd: z.number().min(0).optional(),
  notes: z.string().optional(),
  expectedDate: z.string().datetime().optional(),
  // For receiving stock
  receiveQty: z.number().int().min(1).optional(),
})

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const result = updatePOSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { id, receiveQty, ...updateFields } = result.data

    // Handle receiving stock
    if (receiveQty !== undefined) {
      const receiveResult = await receiveStock(id, receiveQty)
      if (!receiveResult.success) {
        return NextResponse.json({ error: receiveResult.error }, { status: 400 })
      }
      // Return updated PO
      const updatedPO = await prisma.purchaseOrder.findUnique({
        where: { id },
        include: {
          inventory: {
            include: {
              product: { select: { nameEn: true, sku: true } },
            },
          },
        },
      })
      return NextResponse.json({
        message: `Received ${receiveQty} units`,
        purchaseOrder: updatedPO,
      })
    }

    // Handle regular updates
    const updateData: Record<string, unknown> = {}
    if (updateFields.status) updateData.status = updateFields.status
    if (updateFields.quantity) {
      updateData.quantity = updateFields.quantity
      // Recalculate total if unit cost exists
      const existing = await prisma.purchaseOrder.findUnique({ where: { id } })
      if (existing?.unitCostUsd) {
        updateData.totalCostUsd = Number(existing.unitCostUsd) * updateFields.quantity
      }
    }
    if (updateFields.unitCostUsd !== undefined) {
      updateData.unitCostUsd = updateFields.unitCostUsd
      // Recalculate total
      const existing = await prisma.purchaseOrder.findUnique({ where: { id } })
      if (existing) {
        updateData.totalCostUsd = updateFields.unitCostUsd * (updateFields.quantity ?? existing.quantity)
      }
    }
    if (updateFields.notes !== undefined) updateData.notes = updateFields.notes
    if (updateFields.expectedDate) updateData.expectedDate = new Date(updateFields.expectedDate)

    const purchaseOrder = await prisma.purchaseOrder.update({
      where: { id },
      data: updateData,
      include: {
        inventory: {
          include: {
            product: { select: { nameEn: true, sku: true } },
          },
        },
        supplier: { select: { name: true } },
      },
    })

    return NextResponse.json(purchaseOrder)
  } catch (error) {
    console.error("Update purchase order error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/purchase-orders - Cancel/delete a purchase order
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Purchase order ID required" }, { status: 400 })
    }

    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
    })

    if (!purchaseOrder) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 })
    }

    // Only allow deletion/cancellation of DRAFT orders
    // Others should be marked as CANCELLED
    if (purchaseOrder.status === "DRAFT") {
      await prisma.purchaseOrder.delete({ where: { id } })
      return NextResponse.json({ message: "Purchase order deleted" })
    }

    // Cancel the order instead
    await prisma.purchaseOrder.update({
      where: { id },
      data: { status: "CANCELLED" },
    })

    return NextResponse.json({ message: "Purchase order cancelled" })
  } catch (error) {
    console.error("Delete purchase order error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
