import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const articleSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  titleEn: z.string().min(1, "English title is required"),
  titleKh: z.string().min(1, "Khmer title is required"),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens"),
  contentEn: z.string().min(1, "English content is required"),
  contentKh: z.string().min(1, "Khmer content is required"),
  metaTitleEn: z.string().optional(),
  metaTitleKh: z.string().optional(),
  metaDescEn: z.string().optional(),
  metaDescKh: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  sortOrder: z.number().int().default(0),
  isFeatured: z.boolean().default(false),
})

// GET /api/help/articles - List help articles
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get("categoryId")
    const status = searchParams.get("status")
    const slug = searchParams.get("slug")
    const search = searchParams.get("search")
    const featured = searchParams.get("featured")
    const limit = parseInt(searchParams.get("limit") || "50")

    const where: Record<string, unknown> = {}

    if (categoryId) where.categoryId = categoryId
    if (status) where.status = status
    if (slug) where.slug = slug
    if (featured === "true") where.isFeatured = true

    // Search in title and content
    if (search && search.length > 0) {
      where.OR = [
        { titleEn: { contains: search, mode: "insensitive" } },
        { titleKh: { contains: search, mode: "insensitive" } },
        { contentEn: { contains: search, mode: "insensitive" } },
        { contentKh: { contains: search, mode: "insensitive" } },
      ]
    }

    const articles = await prisma.helpArticle.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            nameEn: true,
            nameKh: true,
            slug: true,
            iconName: true,
          },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { viewCount: "desc" }],
      take: limit,
    })

    return NextResponse.json({ articles })
  } catch (error) {
    console.error("Get help articles error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/help/articles - Create a new help article
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const result = articleSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const data = result.data

    // Check slug uniqueness
    const existingSlug = await prisma.helpArticle.findUnique({
      where: { slug: data.slug },
    })

    if (existingSlug) {
      return NextResponse.json({ error: "Slug already exists" }, { status: 409 })
    }

    // Check category exists
    const category = await prisma.helpCategory.findUnique({
      where: { id: data.categoryId },
    })

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    const article = await prisma.helpArticle.create({
      data: {
        ...data,
        publishedAt: data.status === "PUBLISHED" ? new Date() : null,
      },
      include: {
        category: {
          select: {
            id: true,
            nameEn: true,
            nameKh: true,
            slug: true,
          },
        },
      },
    })

    return NextResponse.json(article, { status: 201 })
  } catch (error) {
    console.error("Create help article error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

const articleUpdateSchema = z.object({
  id: z.string().min(1, "Article ID is required"),
  categoryId: z.string().min(1).optional(),
  titleEn: z.string().min(1).optional(),
  titleKh: z.string().min(1).optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
  contentEn: z.string().min(1).optional(),
  contentKh: z.string().min(1).optional(),
  metaTitleEn: z.string().optional().nullable(),
  metaTitleKh: z.string().optional().nullable(),
  metaDescEn: z.string().optional().nullable(),
  metaDescKh: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  sortOrder: z.number().int().optional(),
  isFeatured: z.boolean().optional(),
})

// PUT /api/help/articles - Update a help article
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    const result = articleUpdateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { id, ...data } = result.data

    // Check if article exists
    const existing = await prisma.helpArticle.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 })
    }

    // Check slug uniqueness if changed
    if (data.slug && data.slug !== existing.slug) {
      const existingSlug = await prisma.helpArticle.findUnique({
        where: { slug: data.slug },
      })
      if (existingSlug) {
        return NextResponse.json({ error: "Slug already exists" }, { status: 409 })
      }
    }

    // Check category exists if changed
    if (data.categoryId) {
      const category = await prisma.helpCategory.findUnique({
        where: { id: data.categoryId },
      })
      if (!category) {
        return NextResponse.json({ error: "Category not found" }, { status: 404 })
      }
    }

    // Set publishedAt if publishing for first time
    const updateData: Record<string, unknown> = { ...data }
    if (data.status === "PUBLISHED" && !existing.publishedAt) {
      updateData.publishedAt = new Date()
    }

    const article = await prisma.helpArticle.update({
      where: { id },
      data: updateData,
      include: {
        category: {
          select: {
            id: true,
            nameEn: true,
            nameKh: true,
            slug: true,
          },
        },
      },
    })

    return NextResponse.json(article)
  } catch (error) {
    console.error("Update help article error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/help/articles - Delete a help article
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Article ID is required" }, { status: 400 })
    }

    // Check if article exists
    const existing = await prisma.helpArticle.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 })
    }

    await prisma.helpArticle.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete help article error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
