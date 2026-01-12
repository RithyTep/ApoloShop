import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

interface UseRequest {
  couponId: string
  orderId: string
  discountUsd: number
  customerId?: string
  guestId?: string
}

// POST /api/coupons/use - Record coupon usage after order placement
export async function POST(request: NextRequest) {
  try {
    const body: UseRequest = await request.json()

    const {
      couponId,
      orderId,
      discountUsd,
      customerId,
      guestId,
    } = body

    if (!couponId || !orderId || discountUsd === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: couponId, orderId, discountUsd" },
        { status: 400 }
      )
    }

    // Find the coupon
    const coupon = await prisma.coupon.findUnique({
      where: { id: couponId },
    })

    if (!coupon) {
      return NextResponse.json(
        { success: false, error: "Coupon not found" },
        { status: 404 }
      )
    }

    // Convert to KHR
    const KHR_RATE = 4000
    const discountKhr = Math.round(discountUsd * KHR_RATE)

    // Record usage and increment counter in a transaction
    const [usage] = await prisma.$transaction([
      prisma.couponUsage.create({
        data: {
          couponId,
          orderId,
          discountUsd,
          discountKhr,
          customerId: customerId || null,
          guestId: guestId || null,
        },
      }),
      prisma.coupon.update({
        where: { id: couponId },
        data: {
          usedCount: {
            increment: 1,
          },
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      usage: {
        id: usage.id,
        couponId: usage.couponId,
        orderId: usage.orderId,
        discountUsd: Number(usage.discountUsd),
        discountKhr: usage.discountKhr,
      },
    })
  } catch (error) {
    console.error("Error recording coupon usage:", error)
    return NextResponse.json(
      { success: false, error: "Failed to record coupon usage" },
      { status: 500 }
    )
  }
}
