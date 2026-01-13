import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

// Helper to sanitize HTML content (prevent XSS)
function sanitizeHtml(html: string): string {
  // Basic sanitization - remove script tags and event handlers
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/on\w+\s*=\s*'[^']*'/gi, "")
}

// Helper to generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

// Helper to calculate reading time (average 200 words per minute)
function calculateReadingTime(content: string): number {
  const text = content.replace(/<[^>]*>/g, "") // Strip HTML
  const wordCount = text.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(wordCount / 200))
}

// Validation schemas
const blogPostCreateSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens").optional(),
  titleEn: z.string().min(1, "English title is required"),
  titleKh: z.string().min(1, "Khmer title is required"),
  contentEn: z.string().min(1, "English content is required"),
  contentKh: z.string().min(1, "Khmer content is required"),
  excerptEn: z.string().optional(),
  excerptKh: z.string().optional(),
  authorId: z.string().min(1, "Author is required"),
  featuredImage: z.string().optional(),
  featuredImageAlt: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "SCHEDULED", "ARCHIVED"]).default("DRAFT"),
  publishedAt: z.string().datetime().optional(),
  scheduledFor: z.string().datetime().optional(),
  categoryId: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  metaKeywords: z.string().optional(),
  canonicalUrl: z.string().url().optional().or(z.literal("")),
  ogImage: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  relatedProductIds: z.array(z.string()).optional(),
})

const blogPostUpdateSchema = blogPostCreateSchema.partial().extend({
  id: z.string().min(1, "Post ID is required"),
})

// GET /api/blog - List blog posts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const categoryId = searchParams.get("categoryId")
    const authorId = searchParams.get("authorId")
    const tag = searchParams.get("tag")
    const slug = searchParams.get("slug")
    const search = searchParams.get("search")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const includeRelated = searchParams.get("includeRelated") === "true"
    const publicOnly = searchParams.get("publicOnly") === "true"

    // Build where clause
    const where: Record<string, unknown> = {}

    if (publicOnly) {
      // Only show published posts for public view
      where.status = "PUBLISHED"
      where.publishedAt = { lte: new Date() }
    } else if (status) {
      where.status = status
    }

    if (categoryId) where.categoryId = categoryId
    if (authorId) where.authorId = authorId
    if (slug) where.slug = slug

    if (tag) {
      where.tags = {
        some: {
          tag: { slug: tag }
        }
      }
    }

    if (search) {
      where.OR = [
        { titleEn: { contains: search, mode: "insensitive" } },
        { titleKh: { contains: search, mode: "insensitive" } },
        { contentEn: { contains: search, mode: "insensitive" } },
        { contentKh: { contains: search, mode: "insensitive" } },
      ]
    }

    // Get total count for pagination
    const total = await prisma.blogPost.count({ where })

    // Fetch posts with relations
    const posts = await prisma.blogPost.findMany({
      where,
      include: {
        author: {
          select: { id: true, name: true, email: true }
        },
        category: {
          select: { id: true, slug: true, nameEn: true, nameKh: true }
        },
        tags: {
          include: {
            tag: {
              select: { id: true, slug: true, nameEn: true, nameKh: true }
            }
          }
        },
        ...(includeRelated && {
          relatedProducts: {
            include: {
              product: {
                select: {
                  id: true,
                  nameEn: true,
                  nameKh: true,
                  slug: true,
                  priceUsd: true,
                  priceKhr: true,
                  imageUrl: true,
                }
              }
            },
            orderBy: { sortOrder: "asc" }
          }
        }),
      },
      orderBy: [
        { publishedAt: "desc" },
        { createdAt: "desc" }
      ],
      skip: (page - 1) * limit,
      take: limit,
    })

    // Transform posts to flatten tags
    const transformedPosts = posts.map(post => ({
      ...post,
      tags: post.tags.map(t => t.tag),
      relatedProducts: includeRelated
        ? (post.relatedProducts || []).map(rp => rp.product)
        : undefined,
    }))

    return NextResponse.json({
      posts: transformedPosts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    })
  } catch (error) {
    console.error("Get blog posts error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/blog - Create blog post
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const result = blogPostCreateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { tagIds, relatedProductIds, publishedAt, scheduledFor, canonicalUrl, ...data } = result.data

    // Generate slug if not provided
    const slug = data.slug || generateSlug(data.titleEn)

    // Check slug uniqueness
    const existingSlug = await prisma.blogPost.findUnique({
      where: { slug },
    })

    if (existingSlug) {
      return NextResponse.json({ error: "Slug already exists" }, { status: 409 })
    }

    // Verify author exists
    const author = await prisma.user.findUnique({
      where: { id: data.authorId }
    })

    if (!author) {
      return NextResponse.json({ error: "Author not found" }, { status: 404 })
    }

    // Sanitize HTML content
    const contentEn = sanitizeHtml(data.contentEn)
    const contentKh = sanitizeHtml(data.contentKh)

    // Calculate reading time
    const readingTimeMin = calculateReadingTime(contentEn)

    // Create post
    const post = await prisma.blogPost.create({
      data: {
        ...data,
        slug,
        contentEn,
        contentKh,
        readingTimeMin,
        publishedAt: publishedAt ? new Date(publishedAt) : (data.status === "PUBLISHED" ? new Date() : null),
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        canonicalUrl: canonicalUrl || null,
        // Create tag connections
        ...(tagIds && tagIds.length > 0 && {
          tags: {
            create: tagIds.map(tagId => ({ tagId }))
          }
        }),
        // Create related product connections
        ...(relatedProductIds && relatedProductIds.length > 0 && {
          relatedProducts: {
            create: relatedProductIds.map((productId, index) => ({
              productId,
              sortOrder: index
            }))
          }
        }),
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
        category: { select: { id: true, slug: true, nameEn: true, nameKh: true } },
        tags: {
          include: {
            tag: { select: { id: true, slug: true, nameEn: true, nameKh: true } }
          }
        },
        relatedProducts: {
          include: {
            product: {
              select: { id: true, nameEn: true, nameKh: true, slug: true, imageUrl: true }
            }
          }
        }
      }
    })

    // Update tag post counts
    if (tagIds && tagIds.length > 0) {
      await prisma.blogTag.updateMany({
        where: { id: { in: tagIds } },
        data: { postCount: { increment: 1 } }
      })
    }

    // Transform response
    const transformedPost = {
      ...post,
      tags: post.tags.map(t => t.tag),
      relatedProducts: post.relatedProducts.map(rp => rp.product),
    }

    return NextResponse.json(transformedPost, { status: 201 })
  } catch (error) {
    console.error("Create blog post error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/blog - Update blog post
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    const result = blogPostUpdateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { id, tagIds, relatedProductIds, publishedAt, scheduledFor, canonicalUrl, ...data } = result.data

    // Check if post exists
    const existing = await prisma.blogPost.findUnique({
      where: { id },
      include: { tags: true }
    })

    if (!existing) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    // Check slug uniqueness if changed
    if (data.slug && data.slug !== existing.slug) {
      const existingSlug = await prisma.blogPost.findUnique({
        where: { slug: data.slug },
      })
      if (existingSlug) {
        return NextResponse.json({ error: "Slug already exists" }, { status: 409 })
      }
    }

    // Sanitize HTML content if provided
    const updateData: Record<string, unknown> = { ...data }
    if (data.contentEn) {
      updateData.contentEn = sanitizeHtml(data.contentEn)
      updateData.readingTimeMin = calculateReadingTime(data.contentEn)
    }
    if (data.contentKh) {
      updateData.contentKh = sanitizeHtml(data.contentKh)
    }

    // Handle publication date
    if (publishedAt !== undefined) {
      updateData.publishedAt = publishedAt ? new Date(publishedAt) : null
    } else if (data.status === "PUBLISHED" && !existing.publishedAt) {
      updateData.publishedAt = new Date()
    }

    if (scheduledFor !== undefined) {
      updateData.scheduledFor = scheduledFor ? new Date(scheduledFor) : null
    }

    if (canonicalUrl !== undefined) {
      updateData.canonicalUrl = canonicalUrl || null
    }

    // Handle tags update
    const oldTagIds = existing.tags.map(t => t.tagId)
    const newTagIds = tagIds || []

    // Update post
    const post = await prisma.blogPost.update({
      where: { id },
      data: {
        ...updateData,
        // Update tag connections
        ...(tagIds !== undefined && {
          tags: {
            deleteMany: {},
            create: newTagIds.map(tagId => ({ tagId }))
          }
        }),
        // Update related product connections
        ...(relatedProductIds !== undefined && {
          relatedProducts: {
            deleteMany: {},
            create: relatedProductIds.map((productId, index) => ({
              productId,
              sortOrder: index
            }))
          }
        }),
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
        category: { select: { id: true, slug: true, nameEn: true, nameKh: true } },
        tags: {
          include: {
            tag: { select: { id: true, slug: true, nameEn: true, nameKh: true } }
          }
        },
        relatedProducts: {
          include: {
            product: {
              select: { id: true, nameEn: true, nameKh: true, slug: true, imageUrl: true }
            }
          }
        }
      }
    })

    // Update tag post counts
    if (tagIds !== undefined) {
      // Decrement count for removed tags
      const removedTagIds = oldTagIds.filter(id => !newTagIds.includes(id))
      if (removedTagIds.length > 0) {
        await prisma.blogTag.updateMany({
          where: { id: { in: removedTagIds } },
          data: { postCount: { decrement: 1 } }
        })
      }

      // Increment count for added tags
      const addedTagIds = newTagIds.filter(id => !oldTagIds.includes(id))
      if (addedTagIds.length > 0) {
        await prisma.blogTag.updateMany({
          where: { id: { in: addedTagIds } },
          data: { postCount: { increment: 1 } }
        })
      }
    }

    // Transform response
    const transformedPost = {
      ...post,
      tags: post.tags.map(t => t.tag),
      relatedProducts: post.relatedProducts.map(rp => rp.product),
    }

    return NextResponse.json(transformedPost)
  } catch (error) {
    console.error("Update blog post error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/blog - Delete blog post
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Post ID is required" }, { status: 400 })
    }

    // Check if post exists and get tag IDs
    const existing = await prisma.blogPost.findUnique({
      where: { id },
      include: { tags: true }
    })

    if (!existing) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    // Delete post (cascade deletes tags and products relations)
    await prisma.blogPost.delete({ where: { id } })

    // Decrement tag post counts
    const tagIds = existing.tags.map(t => t.tagId)
    if (tagIds.length > 0) {
      await prisma.blogTag.updateMany({
        where: { id: { in: tagIds } },
        data: { postCount: { decrement: 1 } }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete blog post error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
