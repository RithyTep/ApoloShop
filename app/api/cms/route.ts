import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const cmsContentSchema = z.object({
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens"),
  titleEn: z.string().min(1, "English title is required"),
  titleKh: z.string().min(1, "Khmer title is required"),
  contentEn: z.string().optional().default(""),
  contentKh: z.string().optional().default(""),
  type: z.enum(["PAGE", "BLOG", "BANNER", "FAQ"]),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
})

// GET /api/cms - List CMS content
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const status = searchParams.get("status")
    const slug = searchParams.get("slug")

    const where: Record<string, unknown> = {}
    if (type) where.type = type
    if (status) where.status = status
    if (slug) where.slug = slug

    const contents = await prisma.cMSContent.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    })

    return NextResponse.json({ contents })
  } catch (error) {
    console.error("Get CMS content error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/cms - Create CMS content
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const result = cmsContentSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const data = result.data

    // Check slug uniqueness
    const existingSlug = await prisma.cMSContent.findUnique({
      where: { slug: data.slug },
    })

    if (existingSlug) {
      return NextResponse.json({ error: "Slug already exists" }, { status: 409 })
    }

    const content = await prisma.cMSContent.create({
      data,
    })

    return NextResponse.json(content, { status: 201 })
  } catch (error) {
    console.error("Create CMS content error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

const cmsUpdateSchema = z.object({
  id: z.string().min(1, "Content ID is required"),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
  titleEn: z.string().min(1).optional(),
  titleKh: z.string().min(1).optional(),
  contentEn: z.string().optional(),
  contentKh: z.string().optional(),
  type: z.enum(["PAGE", "BLOG", "BANNER", "FAQ"]).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
})

// PUT /api/cms - Update CMS content
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    const result = cmsUpdateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { id, ...data } = result.data

    // Check if content exists
    const existing = await prisma.cMSContent.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 })
    }

    // Check slug uniqueness if changed
    if (data.slug && data.slug !== existing.slug) {
      const existingSlug = await prisma.cMSContent.findUnique({
        where: { slug: data.slug },
      })
      if (existingSlug) {
        return NextResponse.json({ error: "Slug already exists" }, { status: 409 })
      }
    }

    const content = await prisma.cMSContent.update({
      where: { id },
      data,
    })

    return NextResponse.json(content)
  } catch (error) {
    console.error("Update CMS content error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/cms - Delete CMS content
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Content ID is required" }, { status: 400 })
    }

    // Check if content exists
    const existing = await prisma.cMSContent.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 })
    }

    await prisma.cMSContent.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete CMS content error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
