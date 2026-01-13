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
const categoryCreateSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens").optional(),
  nameEn: z.string().min(1, "English name is required"),
  nameKh: z.string().min(1, "Khmer name is required"),
  descriptionEn: z.string().optional(),
  descriptionKh: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  sortOrder: z.number().int().optional().default(0),
  parentId: z.string().optional(),
  isActive: z.boolean().optional().default(true),
})

const categoryUpdateSchema = categoryCreateSchema.partial().extend({
  id: z.string().min(1, "Category ID is required"),
})

// GET /api/blog/categories - List blog categories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get("activeOnly") === "true"
    const includeCount = searchParams.get("includeCount") === "true"
    const hierarchical = searchParams.get("hierarchical") === "true"

    const where: Record<string, unknown> = {}
    if (activeOnly) where.isActive = true

    const categories = await prisma.blogCategory.findMany({
      where,
      include: {
        parent: {
          select: { id: true, slug: true, nameEn: true, nameKh: true }
        },
        children: {
          select: { id: true, slug: true, nameEn: true, nameKh: true, sortOrder: true },
          orderBy: { sortOrder: "asc" }
        },
        ...(includeCount && {
          _count: {
            select: { posts: true }
          }
        }),
      },
      orderBy: [
        { sortOrder: "asc" },
        { nameEn: "asc" }
      ],
    })

    // If hierarchical, build tree structure
    if (hierarchical) {
      const categoryMap = new Map(categories.map(c => [c.id, { ...c, children: [] as typeof categories }]))
      const roots: typeof categories = []

      categories.forEach(category => {
        if (category.parentId && categoryMap.has(category.parentId)) {
          const parent = categoryMap.get(category.parentId)!
          parent.children.push(categoryMap.get(category.id)!)
        } else {
          roots.push(categoryMap.get(category.id)!)
        }
      })

      return NextResponse.json({ categories: roots })
    }

    return NextResponse.json({ categories })
  } catch (error) {
    console.error("Get blog categories error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/blog/categories - Create blog category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const result = categoryCreateSchema.safeParse(body)
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
    const existingSlug = await prisma.blogCategory.findUnique({
      where: { slug },
    })

    if (existingSlug) {
      return NextResponse.json({ error: "Slug already exists" }, { status: 409 })
    }

    // Verify parent exists if provided
    if (data.parentId) {
      const parent = await prisma.blogCategory.findUnique({
        where: { id: data.parentId }
      })
      if (!parent) {
        return NextResponse.json({ error: "Parent category not found" }, { status: 404 })
      }
    }

    const category = await prisma.blogCategory.create({
      data: {
        ...data,
        slug,
      },
      include: {
        parent: {
          select: { id: true, slug: true, nameEn: true, nameKh: true }
        },
      }
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error("Create blog category error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/blog/categories - Update blog category
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
    const existing = await prisma.blogCategory.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    // Check slug uniqueness if changed
    if (data.slug && data.slug !== existing.slug) {
      const existingSlug = await prisma.blogCategory.findUnique({
        where: { slug: data.slug },
      })
      if (existingSlug) {
        return NextResponse.json({ error: "Slug already exists" }, { status: 409 })
      }
    }

    // Prevent circular parent reference
    if (data.parentId === id) {
      return NextResponse.json({ error: "Category cannot be its own parent" }, { status: 400 })
    }

    // Verify parent exists if provided
    if (data.parentId) {
      const parent = await prisma.blogCategory.findUnique({
        where: { id: data.parentId }
      })
      if (!parent) {
        return NextResponse.json({ error: "Parent category not found" }, { status: 404 })
      }
    }

    const category = await prisma.blogCategory.update({
      where: { id },
      data,
      include: {
        parent: {
          select: { id: true, slug: true, nameEn: true, nameKh: true }
        },
      }
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error("Update blog category error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/blog/categories - Delete blog category
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Category ID is required" }, { status: 400 })
    }

    // Check if category exists
    const existing = await prisma.blogCategory.findUnique({
      where: { id },
      include: {
        _count: { select: { posts: true, children: true } }
      }
    })

    if (!existing) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    // Prevent deletion if category has posts
    if (existing._count.posts > 0) {
      return NextResponse.json(
        { error: `Cannot delete category with ${existing._count.posts} associated posts` },
        { status: 400 }
      )
    }

    // Prevent deletion if category has children
    if (existing._count.children > 0) {
      return NextResponse.json(
        { error: `Cannot delete category with ${existing._count.children} child categories` },
        { status: 400 }
      )
    }

    await prisma.blogCategory.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete blog category error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
