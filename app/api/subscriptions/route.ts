import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { SubscriptionFrequency, ProductSubscriptionStatus } from "@prisma/client"

// Helper to calculate next delivery date based on frequency
function calculateNextDeliveryDate(
  frequency: SubscriptionFrequency,
  customDays?: number | null,
  fromDate?: Date
): Date {
  const now = fromDate || new Date()
  const nextDate = new Date(now)

  switch (frequency) {
    case "WEEKLY":
      nextDate.setDate(nextDate.getDate() + 7)
      break
    case "BIWEEKLY":
      nextDate.setDate(nextDate.getDate() + 14)
      break
    case "MONTHLY":
      nextDate.setMonth(nextDate.getMonth() + 1)
      break
    case "BIMONTHLY":
      nextDate.setMonth(nextDate.getMonth() + 2)
      break
    case "QUARTERLY":
      nextDate.setMonth(nextDate.getMonth() + 3)
      break
    default:
      // Fallback to monthly
      nextDate.setMonth(nextDate.getMonth() + 1)
  }

  return nextDate
}

// GET /api/subscriptions - Get subscriptions for a customer
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const customerId = searchParams.get("customerId")
    const status = searchParams.get("status") as ProductSubscriptionStatus | null
    const productId = searchParams.get("productId")

    if (!customerId) {
      return NextResponse.json(
        { error: "customerId is required" },
        { status: 400 }
      )
    }

    const whereClause: {
      customerId: string
      status?: ProductSubscriptionStatus
      productId?: string
    } = { customerId }

    if (status) {
      whereClause.status = status
    }

    if (productId) {
      whereClause.productId = productId
    }

    const subscriptions = await prisma.productSubscription.findMany({
      where: whereClause,
      include: {
        product: {
          include: {
            category: {
              select: {
                id: true,
                nameEn: true,
                nameKh: true,
                slug: true,
              },
            },
            inventory: {
              select: {
                quantity: true,
              },
            },
          },
        },
        variant: true,
        deliveries: {
          orderBy: {
            scheduledAt: "desc",
          },
          take: 5,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json({
      subscriptions: subscriptions.map((s) => ({
        id: s.id,
        productId: s.productId,
        variantId: s.variantId,
        quantity: s.quantity,
        frequency: s.frequency,
        customDays: s.customDays,
        discountPercent: s.discountPercent,
        nextDeliveryAt: s.nextDeliveryAt.toISOString(),
        lastDeliveryAt: s.lastDeliveryAt?.toISOString() || null,
        status: s.status,
        pausedAt: s.pausedAt?.toISOString() || null,
        pausedUntil: s.pausedUntil?.toISOString() || null,
        cancelledAt: s.cancelledAt?.toISOString() || null,
        cancelReason: s.cancelReason,
        totalOrders: s.totalOrders,
        totalSpentUsd: Number(s.totalSpentUsd),
        createdAt: s.createdAt.toISOString(),
        product: {
          id: s.product.id,
          nameEn: s.product.nameEn,
          nameKh: s.product.nameKh,
          priceUsd: Number(s.product.priceUsd),
          priceKhr: s.product.priceKhr,
          imageUrl: s.product.imageUrl,
          category: s.product.category,
          inventory: s.product.inventory,
        },
        variant: s.variant
          ? {
              id: s.variant.id,
              sku: s.variant.sku,
              options: s.variant.options,
              priceUsd: s.variant.priceUsd ? Number(s.variant.priceUsd) : null,
              priceKhr: s.variant.priceKhr,
              stock: s.variant.stock,
              imageUrl: s.variant.imageUrl,
            }
          : null,
        recentDeliveries: s.deliveries.map((d) => ({
          id: d.id,
          scheduledAt: d.scheduledAt.toISOString(),
          processedAt: d.processedAt?.toISOString() || null,
          status: d.status,
          priceUsd: Number(d.priceUsd),
          finalPriceUsd: Number(d.finalPriceUsd),
        })),
      })),
      total: subscriptions.length,
    })
  } catch (error) {
    console.error("Error fetching subscriptions:", error)
    return NextResponse.json(
      { error: "Failed to fetch subscriptions" },
      { status: 500 }
    )
  }
}

// POST /api/subscriptions - Create a new product subscription
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      customerId,
      productId,
      variantId,
      quantity = 1,
      frequency = "MONTHLY",
      customDays,
      discountPercent = 10,
      shippingAddressId,
    } = body

    if (!customerId) {
      return NextResponse.json(
        { error: "customerId is required" },
        { status: 400 }
      )
    }

    if (!productId) {
      return NextResponse.json(
        { error: "productId is required" },
        { status: 400 }
      )
    }

    // Validate customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    })

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      )
    }

    // Validate product exists and is active
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        inventory: true,
        category: true,
      },
    })

    if (!product || !product.isActive) {
      return NextResponse.json(
        { error: "Product not found or not available" },
        { status: 404 }
      )
    }

    // Validate variant if provided
    let variant = null
    if (variantId) {
      variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
      })

      if (!variant || !variant.isActive || variant.productId !== productId) {
        return NextResponse.json(
          { error: "Variant not found or not available for this product" },
          { status: 404 }
        )
      }
    }

    // Validate frequency
    const validFrequencies: SubscriptionFrequency[] = [
      "WEEKLY",
      "BIWEEKLY",
      "MONTHLY",
      "BIMONTHLY",
      "QUARTERLY",
    ]
    if (!validFrequencies.includes(frequency)) {
      return NextResponse.json(
        { error: "Invalid frequency" },
        { status: 400 }
      )
    }

    // Validate discount percent (0-50%)
    if (discountPercent < 0 || discountPercent > 50) {
      return NextResponse.json(
        { error: "Discount percent must be between 0 and 50" },
        { status: 400 }
      )
    }

    // Validate quantity
    if (quantity < 1 || quantity > 10) {
      return NextResponse.json(
        { error: "Quantity must be between 1 and 10" },
        { status: 400 }
      )
    }

    // Check if customer already has an active subscription for this product/variant
    const existingSubscription = await prisma.productSubscription.findFirst({
      where: {
        customerId,
        productId,
        variantId: variantId || null,
        status: "ACTIVE",
      },
    })

    if (existingSubscription) {
      return NextResponse.json(
        { error: "You already have an active subscription for this product" },
        { status: 409 }
      )
    }

    // Calculate first delivery date
    const nextDeliveryAt = calculateNextDeliveryDate(frequency, customDays)

    // Create the subscription
    const subscription = await prisma.productSubscription.create({
      data: {
        customerId,
        productId,
        variantId: variantId || null,
        quantity,
        frequency,
        customDays,
        discountPercent,
        nextDeliveryAt,
        shippingAddressId: shippingAddressId || null,
        status: "ACTIVE",
      },
      include: {
        product: {
          include: {
            category: {
              select: {
                id: true,
                nameEn: true,
                nameKh: true,
                slug: true,
              },
            },
            inventory: {
              select: {
                quantity: true,
              },
            },
          },
        },
        variant: true,
      },
    })

    // Calculate the discounted price
    const basePrice = variant?.priceUsd
      ? Number(variant.priceUsd)
      : Number(product.priceUsd)
    const finalPrice = basePrice * (1 - discountPercent / 100)

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        productId: subscription.productId,
        variantId: subscription.variantId,
        quantity: subscription.quantity,
        frequency: subscription.frequency,
        customDays: subscription.customDays,
        discountPercent: subscription.discountPercent,
        nextDeliveryAt: subscription.nextDeliveryAt.toISOString(),
        status: subscription.status,
        createdAt: subscription.createdAt.toISOString(),
        product: {
          id: subscription.product.id,
          nameEn: subscription.product.nameEn,
          nameKh: subscription.product.nameKh,
          priceUsd: Number(subscription.product.priceUsd),
          priceKhr: subscription.product.priceKhr,
          imageUrl: subscription.product.imageUrl,
          category: subscription.product.category,
          inventory: subscription.product.inventory,
        },
        variant: subscription.variant
          ? {
              id: subscription.variant.id,
              sku: subscription.variant.sku,
              options: subscription.variant.options,
              priceUsd: subscription.variant.priceUsd
                ? Number(subscription.variant.priceUsd)
                : null,
              priceKhr: subscription.variant.priceKhr,
              stock: subscription.variant.stock,
              imageUrl: subscription.variant.imageUrl,
            }
          : null,
        pricing: {
          originalPriceUsd: basePrice,
          discountPercent: subscription.discountPercent,
          finalPriceUsd: finalPrice,
          savingsUsd: basePrice - finalPrice,
        },
      },
    })
  } catch (error) {
    console.error("Error creating subscription:", error)
    return NextResponse.json(
      { error: "Failed to create subscription" },
      { status: 500 }
    )
  }
}

// PATCH /api/subscriptions - Update a subscription (pause, resume, skip, update frequency)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      subscriptionId,
      customerId,
      action,
      frequency,
      quantity,
      pauseUntil,
      skipReason,
    } = body

    if (!subscriptionId) {
      return NextResponse.json(
        { error: "subscriptionId is required" },
        { status: 400 }
      )
    }

    if (!customerId) {
      return NextResponse.json(
        { error: "customerId is required" },
        { status: 400 }
      )
    }

    // Find the subscription and verify ownership
    const subscription = await prisma.productSubscription.findFirst({
      where: {
        id: subscriptionId,
        customerId,
      },
      include: {
        product: true,
        variant: true,
      },
    })

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      )
    }

    // Handle different actions
    switch (action) {
      case "pause": {
        if (subscription.status !== "ACTIVE") {
          return NextResponse.json(
            { error: "Can only pause active subscriptions" },
            { status: 400 }
          )
        }

        const pausedUntil = pauseUntil ? new Date(pauseUntil) : null

        const updated = await prisma.productSubscription.update({
          where: { id: subscriptionId },
          data: {
            status: "PAUSED",
            pausedAt: new Date(),
            pausedUntil,
          },
        })

        return NextResponse.json({
          success: true,
          message: "Subscription paused",
          subscription: {
            id: updated.id,
            status: updated.status,
            pausedAt: updated.pausedAt?.toISOString(),
            pausedUntil: updated.pausedUntil?.toISOString(),
          },
        })
      }

      case "resume": {
        if (subscription.status !== "PAUSED") {
          return NextResponse.json(
            { error: "Can only resume paused subscriptions" },
            { status: 400 }
          )
        }

        // Calculate new next delivery date from now
        const nextDeliveryAt = calculateNextDeliveryDate(subscription.frequency)

        const updated = await prisma.productSubscription.update({
          where: { id: subscriptionId },
          data: {
            status: "ACTIVE",
            pausedAt: null,
            pausedUntil: null,
            nextDeliveryAt,
          },
        })

        return NextResponse.json({
          success: true,
          message: "Subscription resumed",
          subscription: {
            id: updated.id,
            status: updated.status,
            nextDeliveryAt: updated.nextDeliveryAt.toISOString(),
          },
        })
      }

      case "skip": {
        if (subscription.status !== "ACTIVE") {
          return NextResponse.json(
            { error: "Can only skip active subscriptions" },
            { status: 400 }
          )
        }

        // Create a skipped delivery record
        const basePrice = subscription.variant?.priceUsd
          ? Number(subscription.variant.priceUsd)
          : Number(subscription.product.priceUsd)
        const finalPrice = basePrice * (1 - subscription.discountPercent / 100)

        await prisma.subscriptionDelivery.create({
          data: {
            subscriptionId,
            scheduledAt: subscription.nextDeliveryAt,
            status: "skipped",
            skipReason: skipReason || "Customer requested skip",
            priceUsd: basePrice,
            discountPercent: subscription.discountPercent,
            finalPriceUsd: finalPrice,
          },
        })

        // Calculate new next delivery date
        const nextDeliveryAt = calculateNextDeliveryDate(
          subscription.frequency,
          subscription.customDays,
          subscription.nextDeliveryAt
        )

        const updated = await prisma.productSubscription.update({
          where: { id: subscriptionId },
          data: {
            nextDeliveryAt,
          },
        })

        return NextResponse.json({
          success: true,
          message: "Next delivery skipped",
          subscription: {
            id: updated.id,
            nextDeliveryAt: updated.nextDeliveryAt.toISOString(),
          },
        })
      }

      case "update": {
        const updateData: {
          frequency?: SubscriptionFrequency
          quantity?: number
        } = {}

        if (frequency) {
          const validFrequencies: SubscriptionFrequency[] = [
            "WEEKLY",
            "BIWEEKLY",
            "MONTHLY",
            "BIMONTHLY",
            "QUARTERLY",
          ]
          if (!validFrequencies.includes(frequency)) {
            return NextResponse.json(
              { error: "Invalid frequency" },
              { status: 400 }
            )
          }
          updateData.frequency = frequency
        }

        if (quantity !== undefined) {
          if (quantity < 1 || quantity > 10) {
            return NextResponse.json(
              { error: "Quantity must be between 1 and 10" },
              { status: 400 }
            )
          }
          updateData.quantity = quantity
        }

        if (Object.keys(updateData).length === 0) {
          return NextResponse.json(
            { error: "No updates provided" },
            { status: 400 }
          )
        }

        const updated = await prisma.productSubscription.update({
          where: { id: subscriptionId },
          data: updateData,
        })

        return NextResponse.json({
          success: true,
          message: "Subscription updated",
          subscription: {
            id: updated.id,
            frequency: updated.frequency,
            quantity: updated.quantity,
          },
        })
      }

      default:
        return NextResponse.json(
          { error: "Invalid action. Use: pause, resume, skip, or update" },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error("Error updating subscription:", error)
    return NextResponse.json(
      { error: "Failed to update subscription" },
      { status: 500 }
    )
  }
}

// DELETE /api/subscriptions - Cancel a subscription
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const subscriptionId = searchParams.get("id")
    const customerId = searchParams.get("customerId")
    const reason = searchParams.get("reason")

    if (!subscriptionId) {
      return NextResponse.json(
        { error: "Subscription id is required" },
        { status: 400 }
      )
    }

    if (!customerId) {
      return NextResponse.json(
        { error: "customerId is required" },
        { status: 400 }
      )
    }

    // Find the subscription and verify ownership
    const subscription = await prisma.productSubscription.findFirst({
      where: {
        id: subscriptionId,
        customerId,
      },
    })

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      )
    }

    if (subscription.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Subscription is already cancelled" },
        { status: 400 }
      )
    }

    // Cancel the subscription (soft delete - we keep the record)
    const updated = await prisma.productSubscription.update({
      where: { id: subscriptionId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelReason: reason || null,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Subscription cancelled",
      subscription: {
        id: updated.id,
        status: updated.status,
        cancelledAt: updated.cancelledAt?.toISOString(),
        cancelReason: updated.cancelReason,
      },
    })
  } catch (error) {
    console.error("Error cancelling subscription:", error)
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    )
  }
}
