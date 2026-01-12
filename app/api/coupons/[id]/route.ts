import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import type { CouponType } from "@prisma/client"

// GET /api/coupons/[id] - Get a single coupon by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const coupon = await prisma.coupon.findUnique({
      where: { id },
      include: {
        _count: {
          select: { usages: true },
        },
        usages: {
          take: 10,
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!coupon) {
      return NextResponse.json(
        { error: "Coupon not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      coupon: {
        ...coupon,
        value: Number(coupon.value),
        minOrderUsd: coupon.minOrderUsd ? Number(coupon.minOrderUsd) : null,
        maxDiscountUsd: coupon.maxDiscountUsd ? Number(coupon.maxDiscountUsd) : null,
        usageCount: coupon._count.usages,
        recentUsages: coupon.usages.map((u) => ({
          ...u,
          discountUsd: Number(u.discountUsd),
        })),
      },
    })
  } catch (error) {
    console.error("Error fetching coupon:", error)
    return NextResponse.json(
      { error: "Failed to fetch coupon" },
      { status: 500 }
    )
  }
}

// PUT /api/coupons/[id] - Update a coupon
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const {
      code,
      type,
      value,
      minOrderUsd,
      maxDiscountUsd,
      maxUses,
      maxUsesPerCustomer,
      startsAt,
      expiresAt,
      isActive,
      applicableProductIds,
      applicableCategoryIds,
      description,
    } = body

    // Check if coupon exists
    const existing = await prisma.coupon.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Coupon not found" },
        { status: 404 }
      )
    }

    // If code is being changed, check for duplicates
    if (code && code.toUpperCase() !== existing.code) {
      const duplicate = await prisma.coupon.findUnique({
        where: { code: code.toUpperCase() },
      })

      if (duplicate) {
        return NextResponse.json(
          { error: "A coupon with this code already exists" },
          { status: 409 }
        )
      }
    }

    // Validate coupon type if provided
    if (type) {
      const validTypes: CouponType[] = ["PERCENTAGE", "FIXED_AMOUNT", "FREE_SHIPPING", "BOGO"]
      if (!validTypes.includes(type)) {
        return NextResponse.json(
          { error: `Invalid coupon type. Must be one of: ${validTypes.join(", ")}` },
          { status: 400 }
        )
      }
    }

    // Validate percentage value if provided
    if (type === "PERCENTAGE" && value !== undefined && (value < 0 || value > 100)) {
      return NextResponse.json(
        { error: "Percentage value must be between 0 and 100" },
        { status: 400 }
      )
    }

    // Validate dates if provided
    if (startsAt && expiresAt) {
      const start = new Date(startsAt)
      const end = new Date(expiresAt)
      if (end <= start) {
        return NextResponse.json(
          { error: "Expiration date must be after start date" },
          { status: 400 }
        )
      }
    }

    // Build update data
    const updateData: Parameters<typeof prisma.coupon.update>[0]["data"] = {}

    if (code !== undefined) updateData.code = code.toUpperCase()
    if (type !== undefined) updateData.type = type
    if (value !== undefined) updateData.value = value
    if (minOrderUsd !== undefined) updateData.minOrderUsd = minOrderUsd
    if (maxDiscountUsd !== undefined) updateData.maxDiscountUsd = maxDiscountUsd
    if (maxUses !== undefined) updateData.maxUses = maxUses
    if (maxUsesPerCustomer !== undefined) updateData.maxUsesPerCustomer = maxUsesPerCustomer
    if (startsAt !== undefined) updateData.startsAt = new Date(startsAt)
    if (expiresAt !== undefined) updateData.expiresAt = new Date(expiresAt)
    if (isActive !== undefined) updateData.isActive = isActive
    if (applicableProductIds !== undefined) updateData.applicableProductIds = applicableProductIds
    if (applicableCategoryIds !== undefined) updateData.applicableCategoryIds = applicableCategoryIds
    if (description !== undefined) updateData.description = description

    const coupon = await prisma.coupon.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      message: "Coupon updated successfully",
      coupon: {
        ...coupon,
        value: Number(coupon.value),
        minOrderUsd: coupon.minOrderUsd ? Number(coupon.minOrderUsd) : null,
        maxDiscountUsd: coupon.maxDiscountUsd ? Number(coupon.maxDiscountUsd) : null,
      },
    })
  } catch (error) {
    console.error("Error updating coupon:", error)
    return NextResponse.json(
      { error: "Failed to update coupon" },
      { status: 500 }
    )
  }
}

// DELETE /api/coupons/[id] - Delete a coupon
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if coupon exists
    const existing = await prisma.coupon.findUnique({
      where: { id },
      include: {
        _count: {
          select: { usages: true },
        },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Coupon not found" },
        { status: 404 }
      )
    }

    // If coupon has been used, soft delete by deactivating
    if (existing._count.usages > 0) {
      await prisma.coupon.update({
        where: { id },
        data: { isActive: false },
      })

      return NextResponse.json({
        message: "Coupon deactivated (has usage history)",
        softDeleted: true,
      })
    }

    // Hard delete if never used
    await prisma.coupon.delete({
      where: { id },
    })

    return NextResponse.json({
      message: "Coupon deleted successfully",
      softDeleted: false,
    })
  } catch (error) {
    console.error("Error deleting coupon:", error)
    return NextResponse.json(
      { error: "Failed to delete coupon" },
      { status: 500 }
    )
  }
}
