import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { logOrderAudit } from "@/lib/audit-service"

// Time window for order editing (in hours)
const ORDER_EDIT_WINDOW_HOURS = 24

// Order statuses that allow editing
const EDITABLE_STATUSES = ["NEW", "CONFIRMED"]

// ============================================
// VALIDATION SCHEMAS
// ============================================

const quantityChangeSchema = z.object({
  type: z.literal("QUANTITY_CHANGE"),
  itemId: z.string().min(1, "Item ID is required"),
  newQuantity: z.number().int().min(0, "Quantity must be 0 or more"),
  reason: z.string().optional(),
})

const addItemSchema = z.object({
  type: z.literal("ITEM_ADDED"),
  productId: z.string().min(1, "Product ID is required"),
  quantity: z.number().int().positive("Quantity must be positive"),
  reason: z.string().optional(),
})

const cancelItemSchema = z.object({
  type: z.literal("ITEM_CANCELLED"),
  itemId: z.string().min(1, "Item ID is required"),
  reason: z.string().optional(),
})

const addressChangeSchema = z.object({
  type: z.literal("ADDRESS_CHANGE"),
  newAddress: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    province: z.string().optional(),
    postalCode: z.string().optional(),
    phone: z.string().optional(),
    recipientName: z.string().optional(),
  }),
  reason: z.string().optional(),
})

const orderEditSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  edits: z.array(
    z.union([quantityChangeSchema, addItemSchema, cancelItemSchema, addressChangeSchema])
  ).min(1, "At least one edit is required"),
})

// ============================================
// HELPER FUNCTIONS
// ============================================

function isOrderEditable(order: {
  status: string
  createdAt: Date
  isEditable: boolean
  editableUntil: Date | null
}): { editable: boolean; reason?: string } {
  // Check if editing is disabled
  if (!order.isEditable) {
    return { editable: false, reason: "Order editing has been disabled" }
  }

  // Check status
  if (!EDITABLE_STATUSES.includes(order.status)) {
    return { editable: false, reason: `Cannot edit orders with status: ${order.status}` }
  }

  // Check time window
  const now = new Date()
  if (order.editableUntil && now > order.editableUntil) {
    return { editable: false, reason: "Edit time window has expired" }
  }

  // Default time window check
  const orderAge = (now.getTime() - order.createdAt.getTime()) / (1000 * 60 * 60)
  if (orderAge > ORDER_EDIT_WINDOW_HOURS) {
    return { editable: false, reason: `Orders can only be edited within ${ORDER_EDIT_WINDOW_HOURS} hours of placement` }
  }

  return { editable: true }
}

function calculateTotalDifference(
  previousQty: number,
  newQty: number,
  priceUsd: number,
  priceKhr: number
): { diffUsd: number; diffKhr: number } {
  const qtyDiff = newQty - previousQty
  return {
    diffUsd: qtyDiff * priceUsd,
    diffKhr: qtyDiff * priceKhr,
  }
}

// ============================================
// GET - Get order edit history
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get("orderId")
    const status = searchParams.get("status")

    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 })
    }

    const where: Record<string, unknown> = { orderId }
    if (status) where.status = status

    const edits = await prisma.orderEdit.findMany({
      where,
      orderBy: { createdAt: "desc" },
    })

    // Also get order editability status
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        createdAt: true,
        isEditable: true,
        editableUntil: true,
        shippingAddress: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const editability = isOrderEditable(order)

    return NextResponse.json({
      edits,
      order: {
        id: order.id,
        isEditable: editability.editable,
        editableReason: editability.reason,
        shippingAddress: order.shippingAddress,
      },
    })
  } catch (error) {
    console.error("Get order edits error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ============================================
// POST - Apply edits to order
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const result = orderEditSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { orderId, edits } = result.data

    // Get the order with items
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: { product: true },
        },
        customer: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Check if order is editable
    const editability = isOrderEditable(order)
    if (!editability.editable) {
      return NextResponse.json({ error: editability.reason }, { status: 400 })
    }

    // Process edits in a transaction
    const editResults = await prisma.$transaction(async (tx) => {
      const createdEdits = []
      let totalDiffUsd = 0
      let totalDiffKhr = 0

      for (const edit of edits) {
        if (edit.type === "QUANTITY_CHANGE") {
          // Find the item
          const item = order.items.find((i) => i.id === edit.itemId)
          if (!item) {
            throw new Error(`Order item not found: ${edit.itemId}`)
          }

          if (item.isCancelled) {
            throw new Error(`Cannot modify cancelled item: ${edit.itemId}`)
          }

          const previousQty = item.quantity
          const newQty = edit.newQuantity
          const priceUsd = Number(item.priceUsd)
          const priceKhr = item.priceKhr

          const { diffUsd, diffKhr } = calculateTotalDifference(previousQty, newQty, priceUsd, priceKhr)
          totalDiffUsd += diffUsd
          totalDiffKhr += diffKhr

          // Update item quantity
          if (newQty === 0) {
            // Treat as cancellation
            await tx.orderItem.update({
              where: { id: edit.itemId },
              data: { isCancelled: true, cancelledAt: new Date() },
            })

            // Restore inventory
            if (item.productId) {
              await tx.inventory.updateMany({
                where: { productId: item.productId },
                data: { quantity: { increment: previousQty } },
              })
            }
          } else {
            await tx.orderItem.update({
              where: { id: edit.itemId },
              data: { quantity: newQty },
            })

            // Adjust inventory
            if (item.productId) {
              const qtyDiff = previousQty - newQty
              if (qtyDiff !== 0) {
                await tx.inventory.updateMany({
                  where: { productId: item.productId },
                  data: { quantity: { increment: qtyDiff } },
                })
              }
            }
          }

          // Create edit record
          const editRecord = await tx.orderEdit.create({
            data: {
              orderId,
              editType: newQty === 0 ? "ITEM_CANCELLED" : "QUANTITY_CHANGE",
              status: "APPROVED",
              itemId: edit.itemId,
              productId: item.productId,
              productName: item.product?.nameEn || item.productName,
              previousQuantity: previousQty,
              newQuantity: newQty,
              unitPriceUsd: item.priceUsd,
              unitPriceKhr: priceKhr,
              totalDifferenceUsd: diffUsd,
              totalDifferenceKhr: diffKhr,
              refundRequired: diffUsd < 0,
              refundAmount: diffUsd < 0 ? Math.abs(diffUsd) : null,
              refundCurrency: diffUsd < 0 ? order.currency : null,
              editReason: edit.reason,
              processedAt: new Date(),
            },
          })
          createdEdits.push(editRecord)
        } else if (edit.type === "ITEM_ADDED") {
          // Find product
          const product = await tx.product.findUnique({
            where: { id: edit.productId },
            select: { id: true, nameEn: true, priceUsd: true, priceKhr: true },
          })

          if (!product) {
            throw new Error(`Product not found: ${edit.productId}`)
          }

          const priceUsd = Number(product.priceUsd)
          const priceKhr = product.priceKhr
          const itemTotalUsd = priceUsd * edit.quantity
          const itemTotalKhr = priceKhr * edit.quantity

          totalDiffUsd += itemTotalUsd
          totalDiffKhr += itemTotalKhr

          // Create new order item
          const newItem = await tx.orderItem.create({
            data: {
              orderId,
              productId: product.id,
              productName: product.nameEn,
              quantity: edit.quantity,
              priceUsd: product.priceUsd,
              priceKhr: product.priceKhr,
            },
          })

          // Deduct inventory
          await tx.inventory.updateMany({
            where: { productId: edit.productId },
            data: { quantity: { decrement: edit.quantity } },
          })

          // Create edit record
          const editRecord = await tx.orderEdit.create({
            data: {
              orderId,
              editType: "ITEM_ADDED",
              status: "APPROVED",
              itemId: newItem.id,
              productId: product.id,
              productName: product.nameEn,
              newQuantity: edit.quantity,
              unitPriceUsd: product.priceUsd,
              unitPriceKhr: priceKhr,
              totalDifferenceUsd: itemTotalUsd,
              totalDifferenceKhr: itemTotalKhr,
              editReason: edit.reason,
              processedAt: new Date(),
            },
          })
          createdEdits.push(editRecord)
        } else if (edit.type === "ITEM_CANCELLED") {
          // Find the item
          const item = order.items.find((i) => i.id === edit.itemId)
          if (!item) {
            throw new Error(`Order item not found: ${edit.itemId}`)
          }

          if (item.isCancelled) {
            throw new Error(`Item already cancelled: ${edit.itemId}`)
          }

          const priceUsd = Number(item.priceUsd)
          const priceKhr = item.priceKhr
          const refundUsd = priceUsd * item.quantity
          const refundKhr = priceKhr * item.quantity

          totalDiffUsd -= refundUsd
          totalDiffKhr -= refundKhr

          // Cancel the item
          await tx.orderItem.update({
            where: { id: edit.itemId },
            data: { isCancelled: true, cancelledAt: new Date() },
          })

          // Restore inventory
          if (item.productId) {
            await tx.inventory.updateMany({
              where: { productId: item.productId },
              data: { quantity: { increment: item.quantity } },
            })
          }

          // Create edit record
          const editRecord = await tx.orderEdit.create({
            data: {
              orderId,
              editType: "ITEM_CANCELLED",
              status: "APPROVED",
              itemId: edit.itemId,
              productId: item.productId,
              productName: item.product?.nameEn || item.productName,
              previousQuantity: item.quantity,
              newQuantity: 0,
              unitPriceUsd: item.priceUsd,
              unitPriceKhr: priceKhr,
              totalDifferenceUsd: -refundUsd,
              totalDifferenceKhr: -refundKhr,
              refundRequired: true,
              refundAmount: refundUsd,
              refundCurrency: order.currency,
              editReason: edit.reason,
              processedAt: new Date(),
            },
          })
          createdEdits.push(editRecord)
        } else if (edit.type === "ADDRESS_CHANGE") {
          const previousAddress = order.shippingAddress

          // Update order shipping address
          await tx.order.update({
            where: { id: orderId },
            data: { shippingAddress: edit.newAddress },
          })

          // Create edit record
          const editRecord = await tx.orderEdit.create({
            data: {
              orderId,
              editType: "ADDRESS_CHANGE",
              status: "APPROVED",
              previousAddress: previousAddress ?? undefined,
              newAddress: edit.newAddress,
              editReason: edit.reason,
              processedAt: new Date(),
            },
          })
          createdEdits.push(editRecord)
        }
      }

      // Recalculate and update order totals
      const updatedItems = await tx.orderItem.findMany({
        where: { orderId, isCancelled: false },
      })

      const newTotalUsd = updatedItems.reduce(
        (sum, item) => sum + Number(item.priceUsd) * item.quantity,
        0
      )
      const newTotalKhr = updatedItems.reduce(
        (sum, item) => sum + item.priceKhr * item.quantity,
        0
      )

      await tx.order.update({
        where: { id: orderId },
        data: {
          totalUsd: newTotalUsd,
          totalKhr: newTotalKhr,
        },
      })

      // Create totals recalc record if there were price changes
      if (totalDiffUsd !== 0 || totalDiffKhr !== 0) {
        await tx.orderEdit.create({
          data: {
            orderId,
            editType: "TOTALS_RECALC",
            status: "APPROVED",
            totalDifferenceUsd: totalDiffUsd,
            totalDifferenceKhr: totalDiffKhr,
            refundRequired: totalDiffUsd < 0,
            refundAmount: totalDiffUsd < 0 ? Math.abs(totalDiffUsd) : null,
            refundCurrency: totalDiffUsd < 0 ? order.currency : null,
            processedAt: new Date(),
          },
        })
      }

      return {
        edits: createdEdits,
        newTotalUsd,
        newTotalKhr,
        totalDifferenceUsd: totalDiffUsd,
        totalDifferenceKhr: totalDiffKhr,
        refundRequired: totalDiffUsd < 0,
        refundAmount: totalDiffUsd < 0 ? Math.abs(totalDiffUsd) : 0,
      }
    })

    // Log audit (non-blocking)
    logOrderAudit("UPDATE", orderId, undefined, undefined, {
      orderNumber: order.orderNumber,
      editsApplied: edits.length,
      totalDifferenceUsd: editResults.totalDifferenceUsd,
      refundRequired: editResults.refundRequired,
    }, request)

    return NextResponse.json({
      success: true,
      ...editResults,
    })
  } catch (error) {
    console.error("Apply order edits error:", error)
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ============================================
// DELETE - Disable order editing
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get("orderId")

    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 })
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNumber: true },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { isEditable: false },
    })

    return NextResponse.json({
      success: true,
      message: "Order editing has been disabled",
    })
  } catch (error) {
    console.error("Disable order editing error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
