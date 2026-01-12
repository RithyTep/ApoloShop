import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { logProductAudit, createChangeDiff, extractRequestInfo } from "@/lib/audit-service"

const productCreateSchema = z.object({
  nameEn: z.string().min(1, "English name is required"),
  nameKh: z.string().min(1, "Khmer name is required"),
  descriptionEn: z.string().optional(),
  descriptionKh: z.string().optional(),
  priceUsd: z.number().positive("Price must be positive"),
  priceKhr: z.number().int().positive("KHR price must be positive"),
  categoryId: z.string().min(1, "Category is required"),
  sku: z.string().min(1, "SKU is required"),
  imageUrl: z.string().url().optional().nullable(),
  isActive: z.boolean().default(true),
})

// GET /api/products - List all products
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const categoryId = searchParams.get("categoryId")
    const isActive = searchParams.get("isActive")
    const search = searchParams.get("search")

    const where: Record<string, unknown> = {}

    if (categoryId) where.categoryId = categoryId
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === "true"
    }
    if (search) {
      where.OR = [
        { nameEn: { contains: search, mode: "insensitive" } },
        { nameKh: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ]
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          inventory: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.product.count({ where }),
    ])

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Get products error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/products - Create product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const result = productCreateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const data = result.data

    // Check SKU uniqueness
    const existingSku = await prisma.product.findUnique({
      where: { sku: data.sku },
    })

    if (existingSku) {
      return NextResponse.json({ error: "SKU already exists" }, { status: 409 })
    }

    // Create product with inventory
    const product = await prisma.product.create({
      data: {
        nameEn: data.nameEn,
        nameKh: data.nameKh,
        descriptionEn: data.descriptionEn,
        descriptionKh: data.descriptionKh,
        priceUsd: data.priceUsd,
        priceKhr: data.priceKhr,
        categoryId: data.categoryId,
        sku: data.sku,
        imageUrl: data.imageUrl,
        isActive: data.isActive,
        inventory: {
          create: {
            quantity: 0,
            minLevel: 10,
          },
        },
      },
      include: {
        category: true,
        inventory: true,
      },
    })

    // Log audit (non-blocking)
    logProductAudit("CREATE", product.id, undefined, undefined, {
      product: { nameEn: product.nameEn, sku: product.sku, priceUsd: Number(product.priceUsd) },
    }, request)

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error("Create product error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

const productUpdateSchema = z.object({
  id: z.string().min(1, "Product ID is required"),
  nameEn: z.string().min(1).optional(),
  nameKh: z.string().min(1).optional(),
  descriptionEn: z.string().optional().nullable(),
  descriptionKh: z.string().optional().nullable(),
  priceUsd: z.number().positive().optional(),
  priceKhr: z.number().int().positive().optional(),
  categoryId: z.string().min(1).optional(),
  sku: z.string().min(1).optional(),
  imageUrl: z.string().url().optional().nullable(),
  isActive: z.boolean().optional(),
})

// PUT /api/products - Update product
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    const result = productUpdateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { id, ...data } = result.data

    // Check if product exists
    const existing = await prisma.product.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Check SKU uniqueness if changed
    if (data.sku && data.sku !== existing.sku) {
      const existingSku = await prisma.product.findUnique({
        where: { sku: data.sku },
      })
      if (existingSku) {
        return NextResponse.json({ error: "SKU already exists" }, { status: 409 })
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data,
      include: {
        category: true,
        inventory: true,
      },
    })

    // Log audit with diff (non-blocking)
    const changes = createChangeDiff(
      existing as unknown as Record<string, unknown>,
      product as unknown as Record<string, unknown>
    )
    logProductAudit("UPDATE", id, undefined, undefined, {
      changes,
      sku: product.sku,
      name: product.nameEn,
    }, request)

    return NextResponse.json(product)
  } catch (error) {
    console.error("Update product error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/products - Delete product
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const force = searchParams.get("force") === "true"

    if (!id) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 })
    }

    // Check if product exists
    const existing = await prisma.product.findUnique({
      where: { id },
      include: { orderItems: true },
    })

    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const hasOrders = existing.orderItems.length > 0

    // If product has orders and force is not set, soft delete instead
    if (hasOrders && !force) {
      await prisma.product.update({
        where: { id },
        data: { isActive: false },
      })

      // Log soft delete audit
      logProductAudit("UPDATE", id, undefined, undefined, {
        action: "soft_delete",
        sku: existing.sku,
        name: existing.nameEn,
        reason: "Product has existing orders",
      }, request)

      return NextResponse.json({ success: true, softDeleted: true, hasOrders: true })
    }

    // Force delete or no orders - hard delete
    await prisma.$transaction(async (tx) => {
      // If has orders, preserve product name in order items before deletion
      if (hasOrders) {
        await tx.orderItem.updateMany({
          where: { productId: id },
          data: { productName: existing.nameEn },
        })
      }

      // Remove inventory
      await tx.inventory.deleteMany({ where: { productId: id } })

      // Delete product (orderItems.productId will be set to null via onDelete: SetNull)
      await tx.product.delete({ where: { id } })
    })

    // Log delete audit
    logProductAudit("DELETE", id, undefined, undefined, {
      sku: existing.sku,
      name: existing.nameEn,
      forceDelete: hasOrders,
      hadOrders: hasOrders,
    }, request)

    return NextResponse.json({ success: true, forceDeleted: hasOrders })
  } catch (error) {
    console.error("Delete product error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
