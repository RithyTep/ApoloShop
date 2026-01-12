import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

// Validation schema for creating a client
const clientCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  domain: z.string().url().optional().nullable(),
  settings: z
    .object({
      currency: z.enum(["USD", "KHR"]).optional(),
      language: z.enum(["EN", "KH"]).optional(),
      timezone: z.string().optional(),
    })
    .optional()
    .nullable(),
  isActive: z.boolean().default(true),
})

// Validation schema for updating a client
const clientUpdateSchema = z.object({
  id: z.string().min(1, "Client ID is required"),
  name: z.string().min(1).max(100).optional(),
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens")
    .optional(),
  domain: z.string().url().optional().nullable(),
  settings: z
    .object({
      currency: z.enum(["USD", "KHR"]).optional(),
      language: z.enum(["EN", "KH"]).optional(),
      timezone: z.string().optional(),
    })
    .optional()
    .nullable(),
  isActive: z.boolean().optional(),
})

// Helper to check super admin role
// In production, this would use actual authentication
async function isSuperAdmin(request: NextRequest): Promise<boolean> {
  // Check for super admin session/token
  // For now, check for x-admin-key header or session cookie
  const adminKey = request.headers.get("x-admin-key")
  const expectedKey = process.env.SUPER_ADMIN_KEY

  // If SUPER_ADMIN_KEY is set, require it
  if (expectedKey) {
    return adminKey === expectedKey
  }

  // In development without key, allow access (for testing)
  // In production, this should always require proper auth
  return process.env.NODE_ENV === "development"
}

// GET /api/clients - List all clients (super admin only)
export async function GET(request: NextRequest) {
  try {
    // Check super admin permission
    if (!(await isSuperAdmin(request))) {
      return NextResponse.json({ error: "Forbidden: Super admin access required" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const search = searchParams.get("search")
    const isActive = searchParams.get("isActive")

    const where: Record<string, unknown> = {}

    if (isActive !== null && isActive !== undefined && isActive !== "") {
      where.isActive = isActive === "true"
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
        { domain: { contains: search, mode: "insensitive" } },
      ]
    }

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        include: {
          _count: {
            select: {
              products: true,
              orders: true,
              customers: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.client.count({ where }),
    ])

    return NextResponse.json({
      clients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Get clients error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/clients - Create a new client (super admin only)
export async function POST(request: NextRequest) {
  try {
    // Check super admin permission
    if (!(await isSuperAdmin(request))) {
      return NextResponse.json({ error: "Forbidden: Super admin access required" }, { status: 403 })
    }

    const body = await request.json()

    const result = clientCreateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const data = result.data

    // Check slug uniqueness
    const existingSlug = await prisma.client.findUnique({
      where: { slug: data.slug },
    })

    if (existingSlug) {
      return NextResponse.json({ error: "Slug already exists" }, { status: 409 })
    }

    // Check domain uniqueness if provided
    if (data.domain) {
      const existingDomain = await prisma.client.findUnique({
        where: { domain: data.domain },
      })

      if (existingDomain) {
        return NextResponse.json({ error: "Domain already in use" }, { status: 409 })
      }
    }

    // Create client
    const client = await prisma.client.create({
      data: {
        name: data.name,
        slug: data.slug,
        domain: data.domain,
        settings: data.settings,
        isActive: data.isActive,
      },
      include: {
        _count: {
          select: {
            products: true,
            orders: true,
            customers: true,
          },
        },
      },
    })

    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    console.error("Create client error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/clients - Update a client (super admin only)
export async function PUT(request: NextRequest) {
  try {
    // Check super admin permission
    if (!(await isSuperAdmin(request))) {
      return NextResponse.json({ error: "Forbidden: Super admin access required" }, { status: 403 })
    }

    const body = await request.json()

    const result = clientUpdateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { id, ...data } = result.data

    // Check if client exists
    const existing = await prisma.client.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    // Check slug uniqueness if changed
    if (data.slug && data.slug !== existing.slug) {
      const existingSlug = await prisma.client.findUnique({
        where: { slug: data.slug },
      })
      if (existingSlug) {
        return NextResponse.json({ error: "Slug already exists" }, { status: 409 })
      }
    }

    // Check domain uniqueness if changed
    if (data.domain && data.domain !== existing.domain) {
      const existingDomain = await prisma.client.findUnique({
        where: { domain: data.domain },
      })
      if (existingDomain) {
        return NextResponse.json({ error: "Domain already in use" }, { status: 409 })
      }
    }

    const client = await prisma.client.update({
      where: { id },
      data,
      include: {
        _count: {
          select: {
            products: true,
            orders: true,
            customers: true,
          },
        },
      },
    })

    return NextResponse.json(client)
  } catch (error) {
    console.error("Update client error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/clients - Delete a client (super admin only)
export async function DELETE(request: NextRequest) {
  try {
    // Check super admin permission
    if (!(await isSuperAdmin(request))) {
      return NextResponse.json({ error: "Forbidden: Super admin access required" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const force = searchParams.get("force") === "true"

    if (!id) {
      return NextResponse.json({ error: "Client ID is required" }, { status: 400 })
    }

    // Check if client exists
    const existing = await prisma.client.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
            orders: true,
            customers: true,
          },
        },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    const hasData =
      existing._count.products > 0 || existing._count.orders > 0 || existing._count.customers > 0

    // If client has data and force is not set, soft delete instead
    if (hasData && !force) {
      await prisma.client.update({
        where: { id },
        data: { isActive: false },
      })
      return NextResponse.json({
        success: true,
        softDeleted: true,
        hasData: true,
        counts: existing._count,
      })
    }

    // Force delete or no data - hard delete
    // Cascade will delete related products, orders, customers
    await prisma.client.delete({ where: { id } })

    return NextResponse.json({
      success: true,
      forceDeleted: hasData,
      deletedCounts: existing._count,
    })
  } catch (error) {
    console.error("Delete client error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
