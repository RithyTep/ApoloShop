import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

interface CartItem {
  productId: string
  categoryId?: string
  priceUsd: number
  quantity: number
}

interface ApplyRequest {
  code: string
  cartItems: CartItem[]
  subtotalUsd: number
  shippingUsd?: number
  customerId?: string
  guestId?: string
}

// POST /api/coupons/apply - Apply a coupon and calculate discount
export async function POST(request: NextRequest) {
  try {
    const body: ApplyRequest = await request.json()

    const {
      code,
      cartItems,
      subtotalUsd,
      shippingUsd = 0,
      customerId,
      guestId,
    } = body

    if (!code || !cartItems || subtotalUsd === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: code, cartItems, subtotalUsd" },
        { status: 400 }
      )
    }

    // Find the coupon
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        usages:
          customerId || guestId
            ? {
                where: {
                  OR: [
                    ...(customerId ? [{ customerId }] : []),
                    ...(guestId ? [{ guestId }] : []),
                  ],
                },
              }
            : false,
      },
    })

    if (!coupon) {
      return NextResponse.json(
        { success: false, error: "Coupon not found" },
        { status: 404 }
      )
    }

    // Validate coupon status
    if (!coupon.isActive) {
      return NextResponse.json(
        { success: false, error: "Coupon is not active" },
        { status: 400 }
      )
    }

    const now = new Date()

    if (coupon.startsAt > now) {
      return NextResponse.json(
        { success: false, error: "Coupon is not yet valid" },
        { status: 400 }
      )
    }

    if (coupon.expiresAt < now) {
      return NextResponse.json(
        { success: false, error: "Coupon has expired" },
        { status: 400 }
      )
    }

    // Check total usage limit
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json(
        { success: false, error: "Coupon usage limit reached" },
        { status: 400 }
      )
    }

    // Check per-customer usage limit
    if (
      coupon.maxUsesPerCustomer !== null &&
      coupon.usages &&
      Array.isArray(coupon.usages) &&
      coupon.usages.length >= coupon.maxUsesPerCustomer
    ) {
      return NextResponse.json(
        { success: false, error: "You have already used this coupon the maximum number of times" },
        { status: 400 }
      )
    }

    // Check minimum order value
    if (coupon.minOrderUsd !== null && subtotalUsd < Number(coupon.minOrderUsd)) {
      const minOrder = Number(coupon.minOrderUsd).toFixed(2)
      return NextResponse.json(
        {
          success: false,
          error: `Minimum order of $${minOrder} required`,
          minOrderRequired: Number(coupon.minOrderUsd),
        },
        { status: 400 }
      )
    }

    // Filter cart items based on applicable products/categories
    let applicableItems = cartItems
    let applicableSubtotal = subtotalUsd

    const applicableProductIds = coupon.applicableProductIds as string[] | null
    const applicableCategoryIds = coupon.applicableCategoryIds as string[] | null

    if (applicableProductIds && applicableProductIds.length > 0) {
      applicableItems = cartItems.filter((item) =>
        applicableProductIds.includes(item.productId)
      )
      applicableSubtotal = applicableItems.reduce(
        (sum, item) => sum + item.priceUsd * item.quantity,
        0
      )
    } else if (applicableCategoryIds && applicableCategoryIds.length > 0) {
      applicableItems = cartItems.filter(
        (item) => item.categoryId && applicableCategoryIds.includes(item.categoryId)
      )
      applicableSubtotal = applicableItems.reduce(
        (sum, item) => sum + item.priceUsd * item.quantity,
        0
      )
    }

    // Calculate discount based on coupon type
    let discountUsd = 0
    let discountDescription = ""
    const couponValue = Number(coupon.value)

    switch (coupon.type) {
      case "PERCENTAGE":
        discountUsd = (applicableSubtotal * couponValue) / 100
        discountDescription = `${couponValue}% off`

        // Apply max discount cap if set
        if (coupon.maxDiscountUsd !== null) {
          const maxDiscount = Number(coupon.maxDiscountUsd)
          if (discountUsd > maxDiscount) {
            discountUsd = maxDiscount
            discountDescription = `${couponValue}% off (max $${maxDiscount.toFixed(2)})`
          }
        }
        break

      case "FIXED_AMOUNT":
        discountUsd = Math.min(couponValue, applicableSubtotal) // Can't exceed subtotal
        discountDescription = `$${couponValue.toFixed(2)} off`
        break

      case "FREE_SHIPPING":
        discountUsd = shippingUsd // Discount equals shipping cost
        discountDescription = "Free shipping"
        break

      case "BOGO":
        // Buy One Get One: Discount the cheapest applicable item
        if (applicableItems.length >= 2) {
          // Sort by price and find the cheapest item
          const sortedByPrice = [...applicableItems].sort(
            (a, b) => a.priceUsd - b.priceUsd
          )
          const cheapestItem = sortedByPrice[0]
          // Discount one quantity of the cheapest item
          const bogoDiscount = cheapestItem.priceUsd * (couponValue / 100)
          discountUsd = Math.min(bogoDiscount, cheapestItem.priceUsd)
          discountDescription = `BOGO: ${couponValue}% off cheapest item`
        } else {
          return NextResponse.json(
            {
              success: false,
              error: "BOGO requires at least 2 items in cart",
            },
            { status: 400 }
          )
        }
        break
    }

    // Round to 2 decimal places
    discountUsd = Math.round(discountUsd * 100) / 100

    // Calculate final totals
    const finalSubtotal = subtotalUsd - discountUsd
    const finalTotal = Math.max(0, finalSubtotal + (coupon.type === "FREE_SHIPPING" ? 0 : shippingUsd))

    // Convert to KHR (exchange rate: 1 USD = 4000 KHR)
    const KHR_RATE = 4000
    const discountKhr = Math.round(discountUsd * KHR_RATE)

    return NextResponse.json({
      success: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        description: discountDescription,
      },
      discount: {
        usd: discountUsd,
        khr: discountKhr,
        description: discountDescription,
      },
      totals: {
        subtotalUsd,
        discountUsd,
        shippingUsd: coupon.type === "FREE_SHIPPING" ? 0 : shippingUsd,
        totalUsd: finalTotal,
        totalKhr: Math.round(finalTotal * KHR_RATE),
      },
      applicableItemCount: applicableItems.length,
    })
  } catch (error) {
    console.error("Error applying coupon:", error)
    return NextResponse.json(
      { success: false, error: "Failed to apply coupon" },
      { status: 500 }
    )
  }
}
