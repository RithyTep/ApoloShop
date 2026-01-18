import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

// Schema for creating a gift wrap style
const giftWrapStyleSchema = z.object({
  nameEn: z.string().min(1, "English name is required"),
  nameKh: z.string().min(1, "Khmer name is required"),
  descriptionEn: z.string().nullable().optional(),
  descriptionKh: z.string().nullable().optional(),
  priceUsd: z.number().min(0, "Price must be non-negative"),
  priceKhr: z.number().int().min(0, "Price must be non-negative"),
  imageUrl: z.string().url().nullable().optional(),
  colorCode: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color").nullable().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
})

// Schema for updating a gift wrap style
const giftWrapStyleUpdateSchema = z.object({
  id: z.string().min(1, "Gift wrap style ID is required"),
  nameEn: z.string().min(1).optional(),
  nameKh: z.string().min(1).optional(),
  descriptionEn: z.string().nullable().optional(),
  descriptionKh: z.string().nullable().optional(),
  priceUsd: z.number().min(0).optional(),
  priceKhr: z.number().int().min(0).optional(),
  imageUrl: z.string().url().nullable().optional(),
  colorCode: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
})

// GET /api/gift-wraps - List all gift wrap styles
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const isActive = searchParams.get("isActive")

    const where: Record<string, unknown> = {}
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === "true"
    }

    const styles = await prisma.giftWrapStyle.findMany({
      where,
      include: {
        _count: {
          select: { giftWraps: true },
        },
      },
      orderBy: { sortOrder: "asc" },
    })

    return NextResponse.json({ styles })
  } catch (error) {
    console.error("Get gift wrap styles error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/gift-wraps - Create gift wrap style
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const result = giftWrapStyleSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const data = result.data

    const style = await prisma.giftWrapStyle.create({
      data: {
        nameEn: data.nameEn,
        nameKh: data.nameKh,
        descriptionEn: data.descriptionEn ?? null,
        descriptionKh: data.descriptionKh ?? null,
        priceUsd: data.priceUsd,
        priceKhr: data.priceKhr,
        imageUrl: data.imageUrl ?? null,
        colorCode: data.colorCode ?? null,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      },
    })

    return NextResponse.json(style, { status: 201 })
  } catch (error) {
    console.error("Create gift wrap style error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/gift-wraps - Update gift wrap style
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    const result = giftWrapStyleUpdateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { id, ...data } = result.data

    // Check if style exists
    const existing = await prisma.giftWrapStyle.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Gift wrap style not found" }, { status: 404 })
    }

    const style = await prisma.giftWrapStyle.update({
      where: { id },
      data,
      include: {
        _count: {
          select: { giftWraps: true },
        },
      },
    })

    return NextResponse.json(style)
  } catch (error) {
    console.error("Update gift wrap style error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/gift-wraps - Delete gift wrap style
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Gift wrap style ID is required" }, { status: 400 })
    }

    // Check if style exists and has wraps
    const existing = await prisma.giftWrapStyle.findUnique({
      where: { id },
      include: { _count: { select: { giftWraps: true } } },
    })

    if (!existing) {
      return NextResponse.json({ error: "Gift wrap style not found" }, { status: 404 })
    }

    // Prevent deletion if style has been used
    if (existing._count.giftWraps > 0) {
      return NextResponse.json(
        { error: "Cannot delete gift wrap style that has been used. Deactivate it instead." },
        { status: 409 }
      )
    }

    await prisma.giftWrapStyle.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete gift wrap style error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
