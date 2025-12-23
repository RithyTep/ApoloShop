import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const categorySchema = z.object({
  nameEn: z.string().min(1, "English name is required"),
  nameKh: z.string().min(1, "Khmer name is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens"),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
})

// GET /api/categories - List all categories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const isActive = searchParams.get("isActive")

    const where: Record<string, unknown> = {}
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === "true"
    }

    const categories = await prisma.category.findMany({
      where,
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { sortOrder: "asc" },
    })

    return NextResponse.json({ categories })
  } catch (error) {
    console.error("Get categories error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/categories - Create category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const result = categorySchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const data = result.data

    // Check slug uniqueness
    const existingSlug = await prisma.category.findUnique({
      where: { slug: data.slug },
    })

    if (existingSlug) {
      return NextResponse.json({ error: "Slug already exists" }, { status: 409 })
    }

    const category = await prisma.category.create({
      data,
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error("Create category error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
