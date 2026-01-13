/**
 * Split Shipment Service
 * Handles split shipment detection, creation, and management
 */

import { prisma } from "@/lib/prisma"
import type { Prisma, ShipmentStatus, ShipmentType, CourierProvider } from "@prisma/client"

// Types
export type AvailabilityStatus = "in_stock" | "low_stock" | "backordered" | "preorder" | "out_of_stock"

export interface CartItemAvailability {
  productId: string
  productName: string
  productSku?: string
  quantity: number
  availableQuantity: number
  availabilityStatus: AvailabilityStatus
  expectedAvailableDate?: Date | null
  canShipNow: boolean
}

export interface SplitShipmentOption {
  canSplit: boolean
  reason?: string
  immediateShipment: {
    items: CartItemAvailability[]
    estimatedShipDate: Date
    shippingCharge: number
  }
  delayedShipment: {
    items: CartItemAvailability[]
    estimatedShipDate: Date
    shippingCharge: number
  }
  combinedShipment: {
    items: CartItemAvailability[]
    estimatedShipDate: Date
    shippingCharge: number
    savings: number
  }
}

export interface CreateShipmentInput {
  orderId: string
  type: ShipmentType
  items: {
    orderItemId: string
    productId?: string
    productName: string
    productSku?: string
    quantity: number
    availabilityStatus?: string
    expectedAvailableDate?: Date
  }[]
  shippingAddress?: Prisma.JsonValue
  shippingChargeUsd?: number
  shippingChargeKhr?: number
  estimatedShipDate?: Date
  estimatedDeliveryDate?: Date
  customerConsent?: boolean
  notes?: string
}

/**
 * Check availability status for cart items
 * Returns availability info for each item
 */
export async function checkCartAvailability(
  items: { productId: string; quantity: number }[]
): Promise<CartItemAvailability[]> {
  const productIds = items.map(item => item.productId)

  // Fetch products with inventory info
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: {
      inventory: true,
    },
  })

  const productMap = new Map(products.map(p => [p.id, p]))

  return items.map(item => {
    const product = productMap.get(item.productId)
    const inventory = product?.inventory
    const stockQty = inventory?.quantity ?? 0
    const isPreOrder = product?.isPreOrder ?? false
    const preOrderReleaseDate = product?.preOrderReleaseDate

    let availabilityStatus: AvailabilityStatus = "out_of_stock"
    let expectedAvailableDate: Date | null = null
    let canShipNow = false

    if (isPreOrder) {
      availabilityStatus = "preorder"
      expectedAvailableDate = preOrderReleaseDate ?? null
      canShipNow = false
    } else if (stockQty >= item.quantity) {
      availabilityStatus = "in_stock"
      canShipNow = true
    } else if (stockQty > 0) {
      availabilityStatus = "low_stock"
      canShipNow = true // Can ship what's available
    } else {
      availabilityStatus = "out_of_stock"
      canShipNow = false
      // Estimate restock date based on supplier lead time or default 7 days
      expectedAvailableDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }

    return {
      productId: item.productId,
      productName: product?.nameEn ?? "Unknown Product",
      productSku: product?.sku ?? undefined,
      quantity: item.quantity,
      availableQuantity: Math.min(stockQty, item.quantity),
      availabilityStatus,
      expectedAvailableDate,
      canShipNow,
    }
  })
}

/**
 * Determine split shipment options for an order
 * Returns options for immediate, delayed, and combined shipping
 */
export async function getSplitShipmentOptions(
  items: { productId: string; quantity: number }[],
  shippingZoneId?: string
): Promise<SplitShipmentOption> {
  const availability = await checkCartAvailability(items)

  const immediateItems = availability.filter(item => item.canShipNow && item.availableQuantity > 0)
  const delayedItems = availability.filter(item => !item.canShipNow || item.availableQuantity < item.quantity)

  // Items that need partial shipping (available qty < requested qty)
  const partialItems = availability.filter(
    item => item.canShipNow && item.availableQuantity > 0 && item.availableQuantity < item.quantity
  )

  const canSplit = immediateItems.length > 0 && delayedItems.length > 0

  // Calculate shipping charges based on zone or default rates
  const baseShippingCharge = 2.50 // Default $2.50 per shipment
  const splitShipmentSurcharge = 1.50 // Additional $1.50 for split shipments

  const now = new Date()
  const immediateShipDate = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000) // Tomorrow

  // Calculate delayed ship date based on latest expected available date
  const latestExpectedDate = delayedItems.reduce((latest, item) => {
    if (item.expectedAvailableDate && (!latest || item.expectedAvailableDate > latest)) {
      return item.expectedAvailableDate
    }
    return latest
  }, null as Date | null)

  const delayedShipDate = latestExpectedDate ?? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  // Create adjusted items for partial shipments
  const adjustedImmediateItems = availability.map(item => ({
    ...item,
    quantity: Math.min(item.availableQuantity, item.quantity),
  })).filter(item => item.quantity > 0 && item.canShipNow)

  const adjustedDelayedItems = availability.map(item => ({
    ...item,
    quantity: item.quantity - Math.min(item.availableQuantity, item.quantity),
  })).filter(item => item.quantity > 0)

  return {
    canSplit,
    reason: canSplit
      ? undefined
      : immediateItems.length === 0
        ? "No items available for immediate shipping"
        : "All items available for immediate shipping",
    immediateShipment: {
      items: adjustedImmediateItems,
      estimatedShipDate: immediateShipDate,
      shippingCharge: baseShippingCharge + splitShipmentSurcharge,
    },
    delayedShipment: {
      items: adjustedDelayedItems,
      estimatedShipDate: delayedShipDate,
      shippingCharge: baseShippingCharge + splitShipmentSurcharge,
    },
    combinedShipment: {
      items: availability,
      estimatedShipDate: delayedShipDate,
      shippingCharge: baseShippingCharge,
      savings: splitShipmentSurcharge * 2, // Save both split surcharges
    },
  }
}

/**
 * Generate unique shipment number
 */
export async function generateShipmentNumber(orderId: string, suffix?: string): Promise<string> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { orderNumber: true },
  })

  if (!order) throw new Error("Order not found")

  // Count existing shipments for this order
  const shipmentCount = await prisma.shipment.count({
    where: { orderId },
  })

  // Generate suffix: A, B, C, etc.
  const shipmentSuffix = suffix ?? String.fromCharCode(65 + shipmentCount) // A=65

  return `SHP-${order.orderNumber.replace("ORD-", "")}-${shipmentSuffix}`
}

/**
 * Create a new shipment
 */
export async function createShipment(input: CreateShipmentInput): Promise<{ id: string; shipmentNumber: string }> {
  const shipmentNumber = await generateShipmentNumber(input.orderId)

  const shipment = await prisma.shipment.create({
    data: {
      orderId: input.orderId,
      shipmentNumber,
      type: input.type,
      status: "PENDING",
      shippingAddress: input.shippingAddress ?? undefined,
      shippingChargeUsd: input.shippingChargeUsd,
      shippingChargeKhr: input.shippingChargeKhr,
      estimatedShipDate: input.estimatedShipDate,
      estimatedDeliveryDate: input.estimatedDeliveryDate,
      customerConsent: input.customerConsent ?? false,
      notes: input.notes,
      items: {
        create: input.items.map(item => ({
          orderItemId: item.orderItemId,
          productId: item.productId,
          productName: item.productName,
          productSku: item.productSku,
          quantity: item.quantity,
          availabilityStatus: item.availabilityStatus,
          expectedAvailableDate: item.expectedAvailableDate,
        })),
      },
      statusHistory: {
        create: {
          status: "PENDING",
          notes: "Shipment created",
        },
      },
    },
    select: { id: true, shipmentNumber: true },
  })

  return shipment
}

/**
 * Create split shipments for an order
 */
export async function createSplitShipments(
  orderId: string,
  options: SplitShipmentOption,
  shippingAddress: Prisma.JsonValue,
  orderItems: { id: string; productId: string }[]
): Promise<{ immediateShipment: string; delayedShipment: string }> {
  // Map product IDs to order item IDs
  const productToOrderItem = new Map(orderItems.map(item => [item.productId, item.id]))

  // Create immediate shipment
  const immediateShipment = await createShipment({
    orderId,
    type: "SPLIT",
    items: options.immediateShipment.items.map(item => ({
      orderItemId: productToOrderItem.get(item.productId) ?? "",
      productId: item.productId,
      productName: item.productName,
      productSku: item.productSku,
      quantity: item.quantity,
      availabilityStatus: item.availabilityStatus,
    })),
    shippingAddress,
    shippingChargeUsd: options.immediateShipment.shippingCharge,
    shippingChargeKhr: Math.round(options.immediateShipment.shippingCharge * 4000),
    estimatedShipDate: options.immediateShipment.estimatedShipDate,
    customerConsent: true,
    notes: "Split shipment - Immediate delivery for available items",
  })

  // Create delayed shipment
  const delayedShipment = await createShipment({
    orderId,
    type: "SPLIT",
    items: options.delayedShipment.items.map(item => ({
      orderItemId: productToOrderItem.get(item.productId) ?? "",
      productId: item.productId,
      productName: item.productName,
      productSku: item.productSku,
      quantity: item.quantity,
      availabilityStatus: item.availabilityStatus,
      expectedAvailableDate: item.expectedAvailableDate ?? undefined,
    })),
    shippingAddress,
    shippingChargeUsd: options.delayedShipment.shippingCharge,
    shippingChargeKhr: Math.round(options.delayedShipment.shippingCharge * 4000),
    estimatedShipDate: options.delayedShipment.estimatedShipDate,
    customerConsent: true,
    notes: "Split shipment - Delayed delivery for backordered/preorder items",
  })

  return {
    immediateShipment: immediateShipment.id,
    delayedShipment: delayedShipment.id,
  }
}

/**
 * Update shipment status
 */
export async function updateShipmentStatus(
  shipmentId: string,
  status: ShipmentStatus,
  options?: {
    trackingNumber?: string
    courier?: CourierProvider
    courierName?: string
    location?: string
    notes?: string
    notifyCustomer?: boolean
  }
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Update shipment
    const updateData: Prisma.ShipmentUpdateInput = {
      status,
      trackingNumber: options?.trackingNumber,
      courier: options?.courier,
      courierName: options?.courierName,
    }

    if (status === "SHIPPED") {
      updateData.actualShipDate = new Date()
    } else if (status === "DELIVERED") {
      updateData.actualDeliveryDate = new Date()
    }

    await tx.shipment.update({
      where: { id: shipmentId },
      data: updateData,
    })

    // Add status history entry
    await tx.shipmentStatusHistory.create({
      data: {
        shipmentId,
        status,
        location: options?.location,
        notes: options?.notes,
        notificationSent: options?.notifyCustomer ?? false,
      },
    })
  })
}

/**
 * Get shipments for an order
 */
export async function getOrderShipments(orderId: string) {
  return prisma.shipment.findMany({
    where: { orderId },
    include: {
      items: true,
      statusHistory: {
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "asc" },
  })
}

/**
 * Get shipment details
 */
export async function getShipmentDetails(shipmentId: string) {
  return prisma.shipment.findUnique({
    where: { id: shipmentId },
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
            },
          },
        },
      },
      items: true,
      statusHistory: {
        orderBy: { createdAt: "desc" },
      },
    },
  })
}

/**
 * Get pending shipments for admin fulfillment
 */
export async function getPendingShipments(options?: {
  status?: ShipmentStatus[]
  type?: ShipmentType
  limit?: number
  offset?: number
}) {
  const where: Prisma.ShipmentWhereInput = {}

  if (options?.status && options.status.length > 0) {
    where.status = { in: options.status }
  } else {
    where.status = { in: ["PENDING", "PROCESSING"] }
  }

  if (options?.type) {
    where.type = options.type
  }

  const [shipments, total] = await Promise.all([
    prisma.shipment.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            customer: {
              select: { name: true, phone: true },
            },
          },
        },
        items: true,
      },
      orderBy: { createdAt: "asc" },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    }),
    prisma.shipment.count({ where }),
  ])

  return { shipments, total }
}

/**
 * Cancel a shipment
 */
export async function cancelShipment(shipmentId: string, reason?: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const shipment = await tx.shipment.findUnique({
      where: { id: shipmentId },
      select: { status: true },
    })

    if (!shipment) {
      throw new Error("Shipment not found")
    }

    if (shipment.status === "SHIPPED" || shipment.status === "DELIVERED") {
      throw new Error("Cannot cancel a shipment that has already been shipped or delivered")
    }

    await tx.shipment.update({
      where: { id: shipmentId },
      data: { status: "CANCELLED" },
    })

    await tx.shipmentStatusHistory.create({
      data: {
        shipmentId,
        status: "CANCELLED",
        notes: reason ?? "Shipment cancelled",
      },
    })
  })
}

/**
 * Check if all shipments for an order are complete
 */
export async function checkOrderShipmentsComplete(orderId: string): Promise<boolean> {
  const shipments = await prisma.shipment.findMany({
    where: {
      orderId,
      status: { not: "CANCELLED" },
    },
    select: { status: true },
  })

  if (shipments.length === 0) return false

  return shipments.every(s => s.status === "DELIVERED")
}
