import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const categorySchema = z.object({
  nameEn: z.string().min(1, "English name is required"),
  nameKh: z.string().min(1, "Khmer name is required"),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens"),
  description: z.string().optional(),
  sortOrder: z.number().int().default(0),
  iconName: z.string().optional(),
  isActive: z.boolean().default(true),
})

// GET /api/help/categories - List all help categories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get("activeOnly") === "true"
    const withArticles = searchParams.get("withArticles") === "true"

    const where: Record<string, unknown> = {}
    if (activeOnly) {
      where.isActive = true
    }

    const categories = await prisma.helpCategory.findMany({
      where,
      include: withArticles
        ? {
            articles: {
              where: { status: "PUBLISHED" },
              orderBy: { sortOrder: "asc" },
              select: {
                id: true,
                titleEn: true,
                titleKh: true,
                slug: true,
                viewCount: true,
                isFeatured: true,
              },
            },
            _count: {
              select: { articles: true },
            },
          }
        : {
            _count: {
              select: { articles: true },
            },
          },
      orderBy: { sortOrder: "asc" },
    })

    return NextResponse.json({ categories })
  } catch (error) {
    console.error("Get help categories error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/help/categories - Create a new help category
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
    const existingSlug = await prisma.helpCategory.findUnique({
      where: { slug: data.slug },
    })

    if (existingSlug) {
      return NextResponse.json({ error: "Slug already exists" }, { status: 409 })
    }

    const category = await prisma.helpCategory.create({
      data,
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error("Create help category error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

const categoryUpdateSchema = z.object({
  id: z.string().min(1, "Category ID is required"),
  nameEn: z.string().min(1).optional(),
  nameKh: z.string().min(1).optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().optional(),
  sortOrder: z.number().int().optional(),
  iconName: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
})

// PUT /api/help/categories - Update a help category
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    const result = categoryUpdateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { id, ...data } = result.data

    // Check if category exists
    const existing = await prisma.helpCategory.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    // Check slug uniqueness if changed
    if (data.slug && data.slug !== existing.slug) {
      const existingSlug = await prisma.helpCategory.findUnique({
        where: { slug: data.slug },
      })
      if (existingSlug) {
        return NextResponse.json({ error: "Slug already exists" }, { status: 409 })
      }
    }

    const category = await prisma.helpCategory.update({
      where: { id },
      data,
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error("Update help category error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/help/categories - Delete a help category
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Category ID is required" }, { status: 400 })
    }

    // Check if category exists
    const existing = await prisma.helpCategory.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    // Delete category (cascade will delete articles)
    await prisma.helpCategory.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete help category error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
