import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const promotionSchema = z.object({
  code: z.string().min(1, "Promo code is required").toUpperCase(),
  type: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
  value: z.number().positive("Value must be positive"),
  minOrder: z.number().min(0).optional().default(0),
  maxUses: z.number().int().positive().optional().nullable(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  isActive: z.boolean().default(true),
})

// GET /api/promotions - List promotions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const isActive = searchParams.get("isActive")
    const code = searchParams.get("code")

    const where: Record<string, unknown> = {}
    if (isActive !== null) {
      where.isActive = isActive === "true"
    }
    if (code) {
      where.code = code.toUpperCase()
    }

    const promotions = await prisma.promotion.findMany({
      where,
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ promotions })
  } catch (error) {
    console.error("Get promotions error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/promotions - Create promotion
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const result = promotionSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const data = result.data

    // Check code uniqueness
    const existingCode = await prisma.promotion.findUnique({
      where: { code: data.code },
    })

    if (existingCode) {
      return NextResponse.json({ error: "Promo code already exists" }, { status: 409 })
    }

    // Validate dates
    const startDate = new Date(data.startDate)
    const endDate = new Date(data.endDate)
    if (endDate <= startDate) {
      return NextResponse.json({ error: "End date must be after start date" }, { status: 400 })
    }

    const promotion = await prisma.promotion.create({
      data: {
        code: data.code,
        type: data.type,
        value: data.value,
        minOrder: data.minOrder,
        maxUses: data.maxUses,
        usedCount: 0,
        startDate,
        endDate,
        isActive: data.isActive,
      },
    })

    return NextResponse.json(promotion, { status: 201 })
  } catch (error) {
    console.error("Create promotion error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

const promotionUpdateSchema = z.object({
  id: z.string().min(1, "Promotion ID is required"),
  code: z.string().min(1).toUpperCase().optional(),
  type: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]).optional(),
  value: z.number().positive().optional(),
  minOrder: z.number().min(0).optional(),
  maxUses: z.number().int().positive().optional().nullable(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
})

// PUT /api/promotions - Update promotion
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    const result = promotionUpdateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { id, ...data } = result.data

    // Check if promotion exists
    const existing = await prisma.promotion.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Promotion not found" }, { status: 404 })
    }

    // Check code uniqueness if changed
    if (data.code && data.code !== existing.code) {
      const existingCode = await prisma.promotion.findUnique({
        where: { code: data.code },
      })
      if (existingCode) {
        return NextResponse.json({ error: "Promo code already exists" }, { status: 409 })
      }
    }

    // Parse dates if provided
    const updateData: Record<string, unknown> = { ...data }
    if (data.startDate) updateData.startDate = new Date(data.startDate)
    if (data.endDate) updateData.endDate = new Date(data.endDate)

    const promotion = await prisma.promotion.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(promotion)
  } catch (error) {
    console.error("Update promotion error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/promotions - Delete promotion
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Promotion ID is required" }, { status: 400 })
    }

    // Check if promotion exists
    const existing = await prisma.promotion.findUnique({
      where: { id },
      include: { _count: { select: { orders: true } } },
    })

    if (!existing) {
      return NextResponse.json({ error: "Promotion not found" }, { status: 404 })
    }

    // If promotion was used, soft delete instead
    if (existing._count.orders > 0 || existing.usedCount > 0) {
      await prisma.promotion.update({
        where: { id },
        data: { isActive: false },
      })
      return NextResponse.json({ success: true, softDeleted: true })
    }

    await prisma.promotion.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete promotion error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
