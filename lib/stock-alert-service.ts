/**
 * Stock Alert Service
 * Handles stock monitoring, alerts, and reorder suggestions
 */

import { prisma } from "@/lib/prisma"
import { sendTelegramNotification, sendEmailNotification } from "@/lib/notification-service"

// Types
export type StockAlertType = "LOW_STOCK" | "OUT_OF_STOCK" | "REORDER_CREATED"
export type StockAlertStatus = "PENDING" | "ACKNOWLEDGED" | "RESOLVED"
export type PurchaseOrderStatus = "DRAFT" | "PENDING" | "PARTIAL" | "COMPLETED" | "CANCELLED"

export interface SalesVelocityData {
  productId: string
  avgDailySales: number
  totalSold30Days: number
  totalSold7Days: number
  daysUntilStockout: number | null
  suggestedReorderQty: number
}

export interface StockAlertResult {
  alertId: string
  productName: string
  type: StockAlertType
  currentStock: number
  reorderPoint: number
  suggestedQty: number
  notified: boolean
}

/**
 * Calculate sales velocity for a product based on recent order history
 * Uses weighted average: 70% recent week, 30% previous 3 weeks
 */
export async function calculateSalesVelocity(productId: string): Promise<SalesVelocityData> {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Get order items for this product in the last 30 days
  const orderItems = await prisma.orderItem.findMany({
    where: {
      productId,
      order: {
        status: { in: ["COMPLETED", "READY", "PREPARING", "CONFIRMED"] },
        createdAt: { gte: thirtyDaysAgo },
      },
    },
    include: {
      order: { select: { createdAt: true } },
    },
  })

  // Split into recent week and previous weeks
  const recentWeekSales = orderItems
    .filter(item => item.order.createdAt >= sevenDaysAgo)
    .reduce((sum, item) => sum + item.quantity, 0)

  const previousWeeksSales = orderItems
    .filter(item => item.order.createdAt < sevenDaysAgo)
    .reduce((sum, item) => sum + item.quantity, 0)

  const totalSold30Days = recentWeekSales + previousWeeksSales

  // Calculate weighted average daily sales
  // Recent week gets 70% weight, previous 3 weeks get 30% weight
  const recentDailyAvg = recentWeekSales / 7
  const previousDailyAvg = previousWeeksSales / 23 // 30 - 7 days
  const weightedDailyAvg = (recentDailyAvg * 0.7) + (previousDailyAvg * 0.3)

  // Get current inventory
  const inventory = await prisma.inventory.findUnique({
    where: { productId },
  })

  const currentStock = inventory?.quantity ?? 0
  const reorderPoint = inventory?.reorderPoint ?? 5

  // Calculate days until stockout (if sales velocity > 0)
  const daysUntilStockout = weightedDailyAvg > 0
    ? Math.floor(currentStock / weightedDailyAvg)
    : null

  // Calculate suggested reorder quantity
  // Target: 30 days of stock + safety buffer (7 days)
  // Also consider supplier lead time if available
  const targetDaysOfStock = 37 // 30 days + 7 day safety buffer
  const suggestedReorderQty = Math.max(
    inventory?.reorderQty ?? 10,
    Math.ceil(weightedDailyAvg * targetDaysOfStock)
  )

  return {
    productId,
    avgDailySales: Math.round(weightedDailyAvg * 100) / 100,
    totalSold30Days,
    totalSold7Days: recentWeekSales,
    daysUntilStockout,
    suggestedReorderQty,
  }
}

/**
 * Check all inventory items and create alerts for low stock
 */
export async function checkAndCreateStockAlerts(): Promise<StockAlertResult[]> {
  const results: StockAlertResult[] = []

  // Get all inventory items with product info
  const inventoryItems = await prisma.inventory.findMany({
    include: {
      product: { select: { id: true, nameEn: true, nameKh: true, sku: true } },
    },
  })

  for (const item of inventoryItems) {
    // Skip if no product linked
    if (!item.product) continue

    // Check if stock is at or below reorder point
    const isLowStock = item.quantity <= item.reorderPoint && item.quantity > 0
    const isOutOfStock = item.quantity === 0

    if (!isLowStock && !isOutOfStock) continue

    // Check if there's already a pending alert for this inventory
    const existingAlert = await prisma.stockAlert.findFirst({
      where: {
        inventoryId: item.id,
        status: "PENDING",
        type: isOutOfStock ? "OUT_OF_STOCK" : "LOW_STOCK",
      },
    })

    if (existingAlert) continue

    // Calculate sales velocity for suggested quantity
    const velocity = await calculateSalesVelocity(item.product.id)

    // Create new alert
    const alert = await prisma.stockAlert.create({
      data: {
        inventoryId: item.id,
        type: isOutOfStock ? "OUT_OF_STOCK" : "LOW_STOCK",
        quantity: item.quantity,
        reorderPoint: item.reorderPoint,
        suggestedQty: velocity.suggestedReorderQty,
      },
    })

    results.push({
      alertId: alert.id,
      productName: item.product.nameEn,
      type: alert.type,
      currentStock: item.quantity,
      reorderPoint: item.reorderPoint,
      suggestedQty: velocity.suggestedReorderQty,
      notified: false,
    })
  }

  return results
}

/**
 * Send notifications for pending stock alerts
 */
export async function sendStockAlertNotifications(): Promise<{ sent: number; failed: number }> {
  let sent = 0
  let failed = 0

  // Get pending alerts that haven't been notified
  const pendingAlerts = await prisma.stockAlert.findMany({
    where: {
      status: "PENDING",
      notifiedAt: null,
    },
    include: {
      inventory: {
        include: {
          product: { select: { nameEn: true, nameKh: true, sku: true } },
          supplier: { select: { name: true, email: true, phone: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
    take: 50, // Process in batches
  })

  // Get admin notification settings
  const adminSettings = await prisma.settings.findFirst({
    where: { key: "stockAlertNotifications" },
  })

  const notifyConfig = (adminSettings?.value as {
    telegramChatId?: string
    email?: string
    enabled?: boolean
  }) ?? { enabled: false }

  if (!notifyConfig.enabled) {
    return { sent: 0, failed: 0 }
  }

  for (const alert of pendingAlerts) {
    const productName = alert.inventory.product?.nameEn ?? "Unknown Product"
    const sku = alert.inventory.product?.sku ?? "N/A"
    const supplierInfo = alert.inventory.supplier
      ? `\nSupplier: ${alert.inventory.supplier.name}`
      : ""

    const message = alert.type === "OUT_OF_STOCK"
      ? `🚨 OUT OF STOCK ALERT!\n\nProduct: ${productName}\nSKU: ${sku}\nCurrent Stock: 0\nSuggested Reorder: ${alert.suggestedQty} units${supplierInfo}`
      : `⚠️ LOW STOCK ALERT\n\nProduct: ${productName}\nSKU: ${sku}\nCurrent Stock: ${alert.quantity}\nReorder Point: ${alert.reorderPoint}\nSuggested Reorder: ${alert.suggestedQty} units${supplierInfo}`

    let notified = false

    // Send Telegram notification
    if (notifyConfig.telegramChatId) {
      const telegramResult = await sendTelegramNotification(notifyConfig.telegramChatId, message)
      if (telegramResult.success) notified = true
    }

    // Send Email notification
    if (notifyConfig.email) {
      const subject = alert.type === "OUT_OF_STOCK"
        ? `🚨 Out of Stock: ${productName}`
        : `⚠️ Low Stock Alert: ${productName}`
      const emailResult = await sendEmailNotification(notifyConfig.email, subject, message)
      if (emailResult.success) notified = true
    }

    // Update alert as notified
    if (notified) {
      await prisma.stockAlert.update({
        where: { id: alert.id },
        data: { notifiedAt: new Date() },
      })
      sent++
    } else {
      failed++
    }
  }

  return { sent, failed }
}

/**
 * Generate a purchase order number
 */
async function generatePurchaseOrderNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `PO-${year}-`

  // Find the latest order number for this year
  const latestOrder = await prisma.purchaseOrder.findFirst({
    where: { orderNumber: { startsWith: prefix } },
    orderBy: { orderNumber: "desc" },
  })

  let sequence = 1
  if (latestOrder) {
    const lastSequence = parseInt(latestOrder.orderNumber.replace(prefix, ""), 10)
    if (!isNaN(lastSequence)) {
      sequence = lastSequence + 1
    }
  }

  return `${prefix}${sequence.toString().padStart(4, "0")}`
}

/**
 * Create a purchase order from a stock alert
 */
export async function createPurchaseOrder(
  alertId: string,
  quantity?: number,
  notes?: string
): Promise<{ success: boolean; orderId?: string; orderNumber?: string; error?: string }> {
  try {
    // Get alert with inventory and supplier info
    const alert = await prisma.stockAlert.findUnique({
      where: { id: alertId },
      include: {
        inventory: {
          include: {
            product: true,
            supplier: true,
          },
        },
      },
    })

    if (!alert) {
      return { success: false, error: "Alert not found" }
    }

    const orderQty = quantity ?? alert.suggestedQty
    const orderNumber = await generatePurchaseOrderNumber()

    // Calculate expected delivery date based on supplier lead time
    const leadTimeDays = alert.inventory.supplier?.leadTimeDays ?? 7
    const expectedDate = new Date()
    expectedDate.setDate(expectedDate.getDate() + leadTimeDays)

    // Create purchase order
    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        orderNumber,
        inventoryId: alert.inventoryId,
        supplierId: alert.inventory.supplierId,
        quantity: orderQty,
        status: "DRAFT",
        expectedDate,
        notes: notes ?? `Auto-generated from stock alert ${alert.id}`,
      },
    })

    // Create a new alert of type REORDER_CREATED
    await prisma.stockAlert.create({
      data: {
        inventoryId: alert.inventoryId,
        type: "REORDER_CREATED",
        status: "RESOLVED",
        quantity: alert.quantity,
        reorderPoint: alert.reorderPoint,
        suggestedQty: orderQty,
        notifiedAt: new Date(),
        resolvedAt: new Date(),
      },
    })

    // Update original alert as acknowledged
    await prisma.stockAlert.update({
      where: { id: alertId },
      data: { status: "ACKNOWLEDGED" },
    })

    return {
      success: true,
      orderId: purchaseOrder.id,
      orderNumber: purchaseOrder.orderNumber,
    }
  } catch (error) {
    console.error("[StockAlertService] Create PO error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create purchase order",
    }
  }
}

/**
 * Mark stock as received and resolve alerts
 */
export async function receiveStock(
  purchaseOrderId: string,
  receivedQty: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: { inventory: true },
    })

    if (!purchaseOrder) {
      return { success: false, error: "Purchase order not found" }
    }

    // Update inventory quantity
    const newQuantity = purchaseOrder.inventory.quantity + receivedQty
    await prisma.inventory.update({
      where: { id: purchaseOrder.inventoryId },
      data: {
        quantity: newQuantity,
        lastUpdated: new Date(),
      },
    })

    // Update purchase order
    const totalReceived = purchaseOrder.receivedQty + receivedQty
    const isFullyReceived = totalReceived >= purchaseOrder.quantity

    await prisma.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: {
        receivedQty: totalReceived,
        status: isFullyReceived ? "COMPLETED" : "PARTIAL",
        receivedAt: isFullyReceived ? new Date() : undefined,
      },
    })

    // Resolve any pending alerts for this inventory if stock is above reorder point
    if (newQuantity > purchaseOrder.inventory.reorderPoint) {
      await prisma.stockAlert.updateMany({
        where: {
          inventoryId: purchaseOrder.inventoryId,
          status: { in: ["PENDING", "ACKNOWLEDGED"] },
        },
        data: {
          status: "RESOLVED",
          resolvedAt: new Date(),
        },
      })
    }

    return { success: true }
  } catch (error) {
    console.error("[StockAlertService] Receive stock error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to receive stock",
    }
  }
}

/**
 * Get stock alerts summary for dashboard
 */
export async function getStockAlertsSummary() {
  const [pendingAlerts, lowStockCount, outOfStockCount, pendingOrders] = await Promise.all([
    prisma.stockAlert.count({
      where: { status: "PENDING" },
    }),
    prisma.stockAlert.count({
      where: { status: "PENDING", type: "LOW_STOCK" },
    }),
    prisma.stockAlert.count({
      where: { status: "PENDING", type: "OUT_OF_STOCK" },
    }),
    prisma.purchaseOrder.count({
      where: { status: { in: ["DRAFT", "PENDING", "PARTIAL"] } },
    }),
  ])

  return {
    totalPendingAlerts: pendingAlerts,
    lowStockAlerts: lowStockCount,
    outOfStockAlerts: outOfStockCount,
    pendingPurchaseOrders: pendingOrders,
  }
}
