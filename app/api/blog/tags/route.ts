import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

// Helper to generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

// Validation schemas
const tagCreateSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens").optional(),
  nameEn: z.string().min(1, "English name is required"),
  nameKh: z.string().min(1, "Khmer name is required"),
})

const tagUpdateSchema = tagCreateSchema.partial().extend({
  id: z.string().min(1, "Tag ID is required"),
})

// GET /api/blog/tags - List blog tags
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const popular = searchParams.get("popular") === "true"
    const limit = parseInt(searchParams.get("limit") || "50")

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { nameEn: { contains: search, mode: "insensitive" } },
        { nameKh: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ]
    }

    const tags = await prisma.blogTag.findMany({
      where,
      orderBy: popular
        ? { postCount: "desc" }
        : { nameEn: "asc" },
      take: limit,
    })

    return NextResponse.json({ tags })
  } catch (error) {
    console.error("Get blog tags error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/blog/tags - Create blog tag
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const result = tagCreateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const data = result.data

    // Generate slug if not provided
    const slug = data.slug || generateSlug(data.nameEn)

    // Check slug uniqueness
    const existingSlug = await prisma.blogTag.findUnique({
      where: { slug },
    })

    if (existingSlug) {
      return NextResponse.json({ error: "Slug already exists" }, { status: 409 })
    }

    const tag = await prisma.blogTag.create({
      data: {
        ...data,
        slug,
      },
    })

    return NextResponse.json(tag, { status: 201 })
  } catch (error) {
    console.error("Create blog tag error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/blog/tags - Update blog tag
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    const result = tagUpdateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { id, ...data } = result.data

    // Check if tag exists
    const existing = await prisma.blogTag.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 })
    }

    // Check slug uniqueness if changed
    if (data.slug && data.slug !== existing.slug) {
      const existingSlug = await prisma.blogTag.findUnique({
        where: { slug: data.slug },
      })
      if (existingSlug) {
        return NextResponse.json({ error: "Slug already exists" }, { status: 409 })
      }
    }

    const tag = await prisma.blogTag.update({
      where: { id },
      data,
    })

    return NextResponse.json(tag)
  } catch (error) {
    console.error("Update blog tag error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/blog/tags - Delete blog tag
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Tag ID is required" }, { status: 400 })
    }

    // Check if tag exists
    const existing = await prisma.blogTag.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 })
    }

    // Delete tag (cascade deletes BlogPostTag relations)
    await prisma.blogTag.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete blog tag error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
