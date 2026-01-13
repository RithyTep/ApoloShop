import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Types for multi-address checkout
interface ShipmentAddress {
  id?: string // Existing address ID or undefined for new
  fullName: string
  phone: string
  province: string
  district: string
  commune?: string
  addressLine: string
  landmark?: string
}

interface ShipmentItem {
  productId: string
  quantity: number
  priceUsd: number
  priceKhr: number
}

interface ShipmentGroup {
  address: ShipmentAddress
  items: ShipmentItem[]
  giftMessage?: string
  isGift?: boolean
  recipientName?: string
  recipientPhone?: string
  shippingCostUsd?: number
  shippingCostKhr?: number
}

interface MultiAddressCheckoutRequest {
  customerId?: string
  guestId?: string
  phone: string
  fullName: string
  email?: string
  shipments: ShipmentGroup[]
  paymentMethod: string
  currency: string
  note?: string
}

// POST /api/checkout/multi-address - Create order with multiple shipping addresses
export async function POST(request: NextRequest) {
  try {
    const body: MultiAddressCheckoutRequest = await request.json()

    // Validate required fields
    if (!body.shipments || body.shipments.length === 0) {
      return NextResponse.json(
        { error: "At least one shipment is required" },
        { status: 400 }
      )
    }

    if (!body.phone || !body.fullName) {
      return NextResponse.json(
        { error: "Phone and full name are required" },
        { status: 400 }
      )
    }

    // Validate each shipment has items and address
    for (let i = 0; i < body.shipments.length; i++) {
      const shipment = body.shipments[i]
      if (!shipment.items || shipment.items.length === 0) {
        return NextResponse.json(
          { error: `Shipment ${i + 1} must have at least one item` },
          { status: 400 }
        )
      }
      if (!shipment.address || !shipment.address.addressLine) {
        return NextResponse.json(
          { error: `Shipment ${i + 1} requires a valid address` },
          { status: 400 }
        )
      }
    }

    // Find or create customer
    let customer = body.customerId
      ? await prisma.customer.findUnique({ where: { id: body.customerId } })
      : await prisma.customer.findFirst({
          where: { phone: body.phone },
        })

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: body.fullName,
          phone: body.phone,
          email: body.email || null,
        },
      })
    }

    // Calculate totals
    let totalUsd = 0
    let totalKhr = 0
    let totalShippingUsd = 0
    let totalShippingKhr = 0

    for (const shipment of body.shipments) {
      for (const item of shipment.items) {
        totalUsd += item.priceUsd * item.quantity
        totalKhr += item.priceKhr * item.quantity
      }
      totalShippingUsd += shipment.shippingCostUsd || 0
      totalShippingKhr += shipment.shippingCostKhr || 0
    }

    totalUsd += totalShippingUsd
    totalKhr += totalShippingKhr

    // Generate order number
    const orderCount = await prisma.order.count()
    const orderNumber = `APS-${String(orderCount + 1).padStart(6, "0")}`

    // Create order with shipments in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create order
      const order = await tx.order.create({
        data: {
          orderNumber,
          customerId: customer!.id,
          status: "NEW",
          totalUsd,
          totalKhr,
          currency: body.currency === "KHR" ? "KHR" : "USD",
          channel: "WEBSITE",
          note: body.note || null,
          isEditable: true,
          editableUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
      })

      // Create all order items and shipments
      const shipmentResults = []

      for (let i = 0; i < body.shipments.length; i++) {
        const shipmentData = body.shipments[i]
        const shipmentNumber = `${orderNumber}-${String.fromCharCode(65 + i)}` // A, B, C...

        // Create order items for this shipment
        const orderItems = []
        for (const item of shipmentData.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          })

          const orderItem = await tx.orderItem.create({
            data: {
              orderId: order.id,
              productId: item.productId,
              productName: product?.nameEn || "Unknown Product",
              quantity: item.quantity,
              priceUsd: item.priceUsd,
              priceKhr: item.priceKhr,
            },
          })
          orderItems.push(orderItem)
        }

        // Create shipment with address snapshot
        const shipment = await tx.shipment.create({
          data: {
            orderId: order.id,
            shipmentNumber,
            type: body.shipments.length > 1 ? "SPLIT" : "STANDARD",
            status: "PENDING",
            shippingChargeUsd: shipmentData.shippingCostUsd || 0,
            shippingChargeKhr: shipmentData.shippingCostKhr || 0,
            customerConsent: true,
            isMultiAddress: body.shipments.length > 1,
            recipientName: shipmentData.recipientName || shipmentData.address.fullName,
            recipientPhone: shipmentData.recipientPhone || shipmentData.address.phone,
            giftMessage: shipmentData.giftMessage || null,
            isGift: shipmentData.isGift || false,
            hideItemPrices: shipmentData.isGift || false,
            shippingAddress: {
              fullName: shipmentData.address.fullName,
              phone: shipmentData.address.phone,
              province: shipmentData.address.province,
              district: shipmentData.address.district,
              commune: shipmentData.address.commune || "",
              addressLine: shipmentData.address.addressLine,
              landmark: shipmentData.address.landmark || "",
            },
          },
        })

        // Create shipment items
        for (const orderItem of orderItems) {
          await tx.shipmentItem.create({
            data: {
              shipmentId: shipment.id,
              orderItemId: orderItem.id,
              productId: orderItem.productId,
              productName: orderItem.productName,
              quantity: orderItem.quantity,
            },
          })
        }

        // Create initial status history
        await tx.shipmentStatusHistory.create({
          data: {
            shipmentId: shipment.id,
            status: "PENDING",
            notes: "Order placed - awaiting processing",
          },
        })

        shipmentResults.push({
          shipmentId: shipment.id,
          shipmentNumber: shipment.shipmentNumber,
          trackingUrl: `/shop/track?shipment=${shipment.shipmentNumber}`,
          address: shipmentData.address,
          itemCount: shipmentData.items.length,
          shippingCost: {
            usd: shipmentData.shippingCostUsd || 0,
            khr: shipmentData.shippingCostKhr || 0,
          },
        })
      }

      return { order, shipments: shipmentResults }
    })

    return NextResponse.json({
      success: true,
      orderNumber: result.order.orderNumber,
      orderId: result.order.id,
      shipments: result.shipments,
      totals: {
        subtotalUsd: totalUsd - totalShippingUsd,
        subtotalKhr: totalKhr - totalShippingKhr,
        shippingUsd: totalShippingUsd,
        shippingKhr: totalShippingKhr,
        totalUsd,
        totalKhr,
      },
    })
  } catch (error) {
    console.error("Multi-address checkout error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// GET /api/checkout/multi-address/calculate - Calculate shipping for multiple addresses
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action")

  if (action === "calculate-shipping") {
    // Parse shipment addresses from query params
    const shipmentsJson = searchParams.get("shipments")
    if (!shipmentsJson) {
      return NextResponse.json(
        { error: "Shipments data required" },
        { status: 400 }
      )
    }

    try {
      const shipments = JSON.parse(shipmentsJson) as Array<{
        region: string
        cartTotalUsd: number
        weightKg?: number
      }>

      // Get all shipping zones
      const zones = await prisma.shippingZone.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }],
      })

      // Calculate shipping for each destination
      const results = shipments.map((shipment) => {
        const matchingZones = zones.filter((zone) => {
          const regions = zone.regions as string[]
          return Array.isArray(regions) && regions.includes(shipment.region)
        })

        if (matchingZones.length === 0) {
          return {
            region: shipment.region,
            available: false,
            error: "Shipping not available for this region",
          }
        }

        // Calculate cost for cheapest zone
        const zone = matchingZones[0]
        let shippingCostUsd = 0
        let shippingCostKhr = 0
        let isFree = false

        // Check free shipping threshold
        if (zone.freeThresholdUsd && shipment.cartTotalUsd >= Number(zone.freeThresholdUsd)) {
          isFree = true
        }

        if (!isFree) {
          switch (zone.rateType) {
            case "FREE":
              isFree = true
              break
            case "FLAT_RATE":
              shippingCostUsd = zone.flatRateUsd ? Number(zone.flatRateUsd) : 0
              shippingCostKhr = zone.flatRateKhr || 0
              break
            case "WEIGHT_BASED":
              const weight = shipment.weightKg || 0
              const baseWeight = zone.baseWeightKg ? Number(zone.baseWeightKg) : 0
              const chargeableWeight = Math.max(0, weight - baseWeight)
              if (zone.pricePerKgUsd) {
                shippingCostUsd = chargeableWeight * Number(zone.pricePerKgUsd)
              }
              if (zone.pricePerKgKhr) {
                shippingCostKhr = Math.round(chargeableWeight * zone.pricePerKgKhr)
              }
              break
          }
        }

        return {
          region: shipment.region,
          available: true,
          zoneName: { en: zone.nameEn, kh: zone.nameKh },
          shippingCostUsd: isFree ? 0 : shippingCostUsd,
          shippingCostKhr: isFree ? 0 : shippingCostKhr,
          isFree,
          estimatedDelivery: {
            minDays: zone.minDeliveryDays,
            maxDays: zone.maxDeliveryDays,
          },
        }
      })

      // Calculate combined total
      const totalShippingUsd = results.reduce(
        (sum, r) => sum + (r.available ? r.shippingCostUsd || 0 : 0),
        0
      )
      const totalShippingKhr = results.reduce(
        (sum, r) => sum + (r.available ? r.shippingCostKhr || 0 : 0),
        0
      )

      return NextResponse.json({
        shipments: results,
        totals: {
          shippingUsd: totalShippingUsd,
          shippingKhr: totalShippingKhr,
        },
        allAvailable: results.every((r) => r.available),
      })
    } catch {
      return NextResponse.json(
        { error: "Invalid shipments data" },
        { status: 400 }
      )
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}
