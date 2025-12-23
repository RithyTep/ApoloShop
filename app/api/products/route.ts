import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

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

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error("Create product error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
