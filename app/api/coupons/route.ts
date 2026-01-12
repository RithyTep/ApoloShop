import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import type { CouponType } from "@prisma/client"

// GET /api/coupons - List all coupons (admin) or validate a single coupon (customer)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const validate = searchParams.get("validate") === "true"
  const orderTotal = searchParams.get("orderTotal")
  const customerId = searchParams.get("customerId")
  const guestId = searchParams.get("guestId")

  // If validating a specific coupon code
  if (code && validate) {
    try {
      const coupon = await prisma.coupon.findUnique({
        where: { code: code.toUpperCase() },
        include: {
          usages: customerId || guestId
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
          { valid: false, error: "Coupon not found" },
          { status: 404 }
        )
      }

      // Check if coupon is active
      if (!coupon.isActive) {
        return NextResponse.json(
          { valid: false, error: "Coupon is not active" },
          { status: 400 }
        )
      }

      const now = new Date()

      // Check if coupon has started
      if (coupon.startsAt > now) {
        return NextResponse.json(
          { valid: false, error: "Coupon is not yet valid" },
          { status: 400 }
        )
      }

      // Check if coupon has expired
      if (coupon.expiresAt < now) {
        return NextResponse.json(
          { valid: false, error: "Coupon has expired" },
          { status: 400 }
        )
      }

      // Check total usage limit
      if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
        return NextResponse.json(
          { valid: false, error: "Coupon usage limit reached" },
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
          { valid: false, error: "You have already used this coupon" },
          { status: 400 }
        )
      }

      // Check minimum order value
      if (coupon.minOrderUsd !== null && orderTotal) {
        const total = parseFloat(orderTotal)
        if (total < Number(coupon.minOrderUsd)) {
          return NextResponse.json(
            {
              valid: false,
              error: `Minimum order of $${Number(coupon.minOrderUsd).toFixed(2)} required`,
            },
            { status: 400 }
          )
        }
      }

      // Coupon is valid
      return NextResponse.json({
        valid: true,
        coupon: {
          id: coupon.id,
          code: coupon.code,
          type: coupon.type,
          value: Number(coupon.value),
          minOrderUsd: coupon.minOrderUsd ? Number(coupon.minOrderUsd) : null,
          maxDiscountUsd: coupon.maxDiscountUsd ? Number(coupon.maxDiscountUsd) : null,
          applicableProductIds: coupon.applicableProductIds,
          applicableCategoryIds: coupon.applicableCategoryIds,
          expiresAt: coupon.expiresAt,
        },
      })
    } catch (error) {
      console.error("Error validating coupon:", error)
      return NextResponse.json(
        { valid: false, error: "Failed to validate coupon" },
        { status: 500 }
      )
    }
  }

  // Admin: List all coupons with pagination
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "20")
  const search = searchParams.get("search") || ""
  const isActive = searchParams.get("isActive")
  const skip = (page - 1) * limit

  try {
    const where: Parameters<typeof prisma.coupon.findMany>[0]["where"] = {}

    if (search) {
      where.OR = [
        { code: { contains: search.toUpperCase() } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === "true"
    }

    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { usages: true },
          },
        },
      }),
      prisma.coupon.count({ where }),
    ])

    return NextResponse.json({
      coupons: coupons.map((c) => ({
        ...c,
        value: Number(c.value),
        minOrderUsd: c.minOrderUsd ? Number(c.minOrderUsd) : null,
        maxDiscountUsd: c.maxDiscountUsd ? Number(c.maxDiscountUsd) : null,
        usageCount: c._count.usages,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching coupons:", error)
    return NextResponse.json(
      { error: "Failed to fetch coupons" },
      { status: 500 }
    )
  }
}

// POST /api/coupons - Create a new coupon (admin only)
export async function POST(request: NextRequest) {
  try {
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
      isActive = true,
      applicableProductIds,
      applicableCategoryIds,
      description,
      createdBy,
    } = body

    // Validate required fields
    if (!code || !type || value === undefined || !startsAt || !expiresAt) {
      return NextResponse.json(
        { error: "Missing required fields: code, type, value, startsAt, expiresAt" },
        { status: 400 }
      )
    }

    // Validate coupon type
    const validTypes: CouponType[] = ["PERCENTAGE", "FIXED_AMOUNT", "FREE_SHIPPING", "BOGO"]
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid coupon type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      )
    }

    // Validate percentage value
    if (type === "PERCENTAGE" && (value < 0 || value > 100)) {
      return NextResponse.json(
        { error: "Percentage value must be between 0 and 100" },
        { status: 400 }
      )
    }

    // Validate dates
    const start = new Date(startsAt)
    const end = new Date(expiresAt)
    if (end <= start) {
      return NextResponse.json(
        { error: "Expiration date must be after start date" },
        { status: 400 }
      )
    }

    // Check for duplicate code
    const existing = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    })

    if (existing) {
      return NextResponse.json(
        { error: "A coupon with this code already exists" },
        { status: 409 }
      )
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        type,
        value,
        minOrderUsd,
        maxDiscountUsd,
        maxUses,
        maxUsesPerCustomer,
        startsAt: start,
        expiresAt: end,
        isActive,
        applicableProductIds: applicableProductIds || null,
        applicableCategoryIds: applicableCategoryIds || null,
        description,
        createdBy,
      },
    })

    return NextResponse.json({
      message: "Coupon created successfully",
      coupon: {
        ...coupon,
        value: Number(coupon.value),
        minOrderUsd: coupon.minOrderUsd ? Number(coupon.minOrderUsd) : null,
        maxDiscountUsd: coupon.maxDiscountUsd ? Number(coupon.maxDiscountUsd) : null,
      },
    }, { status: 201 })
  } catch (error) {
    console.error("Error creating coupon:", error)
    return NextResponse.json(
      { error: "Failed to create coupon" },
      { status: 500 }
    )
  }
}
