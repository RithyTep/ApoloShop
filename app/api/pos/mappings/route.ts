/**
 * POS Product/Customer Mappings API
 * GET /api/pos/mappings - List product and customer mappings
 * POST /api/pos/mappings - Create a mapping
 * PUT /api/pos/mappings - Update a mapping
 * DELETE /api/pos/mappings - Delete a mapping
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const productMappingSchema = z.object({
  type: z.literal("product"),
  providerId: z.string().min(1, "Provider ID is required"),
  productId: z.string().min(1, "Product ID is required"),
  posItemId: z.string().min(1, "POS item ID is required"),
  posVariationId: z.string().optional(),
  posSku: z.string().optional(),
  syncInventory: z.boolean().default(true),
  syncPrice: z.boolean().default(false),
})

const customerMappingSchema = z.object({
  type: z.literal("customer"),
  providerId: z.string().min(1, "Provider ID is required"),
  customerId: z.string().min(1, "Customer ID is required"),
  posCustomerId: z.string().min(1, "POS customer ID is required"),
})

const mappingSchema = z.discriminatedUnion("type", [
  productMappingSchema,
  customerMappingSchema,
])

// GET /api/pos/mappings - List mappings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const providerId = searchParams.get("providerId")
    const type = searchParams.get("type") // "product" | "customer"
    const search = searchParams.get("search")
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    if (!providerId) {
      return NextResponse.json({ error: "Provider ID is required" }, { status: 400 })
    }

    if (type === "product") {
      const where: Record<string, unknown> = { providerId }

      if (search) {
        where.OR = [
          { posItemId: { contains: search, mode: "insensitive" } },
          { posSku: { contains: search, mode: "insensitive" } },
        ]
      }

      const [mappings, total] = await Promise.all([
        prisma.pOSProductMapping.findMany({
          where,
          include: {
            provider: {
              select: { id: true, name: true, type: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
        }),
        prisma.pOSProductMapping.count({ where }),
      ])

      // Fetch product details for the mappings
      const productIds = mappings.map((m) => m.productId)
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          nameEn: true,
          nameKh: true,
          sku: true,
          imageUrl: true,
        },
      })

      const productMap = new Map(products.map((p) => [p.id, p]))

      const enrichedMappings = mappings.map((m) => ({
        ...m,
        product: productMap.get(m.productId) || null,
      }))

      return NextResponse.json({
        mappings: enrichedMappings,
        total,
        type: "product",
        pagination: {
          limit,
          offset,
          hasMore: offset + mappings.length < total,
        },
      })
    } else if (type === "customer") {
      const where: Record<string, unknown> = { providerId }

      if (search) {
        where.posCustomerId = { contains: search, mode: "insensitive" }
      }

      const [mappings, total] = await Promise.all([
        prisma.pOSCustomerMapping.findMany({
          where,
          include: {
            provider: {
              select: { id: true, name: true, type: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
        }),
        prisma.pOSCustomerMapping.count({ where }),
      ])

      // Fetch customer details for the mappings
      const customerIds = mappings.map((m) => m.customerId)
      const customers = await prisma.customer.findMany({
        where: { id: { in: customerIds } },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
        },
      })

      const customerMap = new Map(customers.map((c) => [c.id, c]))

      const enrichedMappings = mappings.map((m) => ({
        ...m,
        customer: customerMap.get(m.customerId) || null,
      }))

      return NextResponse.json({
        mappings: enrichedMappings,
        total,
        type: "customer",
        pagination: {
          limit,
          offset,
          hasMore: offset + mappings.length < total,
        },
      })
    } else {
      // Return both types summarized
      const [productCount, customerCount] = await Promise.all([
        prisma.pOSProductMapping.count({ where: { providerId } }),
        prisma.pOSCustomerMapping.count({ where: { providerId } }),
      ])

      return NextResponse.json({
        summary: {
          products: productCount,
          customers: customerCount,
        },
      })
    }
  } catch (error) {
    console.error("Get POS mappings error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/pos/mappings - Create a mapping
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const result = mappingSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const data = result.data

    // Verify provider exists
    const provider = await prisma.pOSProvider.findUnique({
      where: { id: data.providerId },
    })

    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 })
    }

    if (data.type === "product") {
      // Check if product exists
      const product = await prisma.product.findUnique({
        where: { id: data.productId },
      })

      if (!product) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 })
      }

      // Check for existing mapping
      const existing = await prisma.pOSProductMapping.findFirst({
        where: {
          providerId: data.providerId,
          OR: [
            { productId: data.productId },
            { posItemId: data.posItemId },
          ],
        },
      })

      if (existing) {
        return NextResponse.json(
          { error: "Mapping already exists for this product or POS item" },
          { status: 409 }
        )
      }

      const mapping = await prisma.pOSProductMapping.create({
        data: {
          providerId: data.providerId,
          productId: data.productId,
          posItemId: data.posItemId,
          posVariationId: data.posVariationId,
          posSku: data.posSku,
          syncInventory: data.syncInventory,
          syncPrice: data.syncPrice,
        },
      })

      return NextResponse.json({ success: true, mapping, type: "product" })
    } else {
      // Check if customer exists
      const customer = await prisma.customer.findUnique({
        where: { id: data.customerId },
      })

      if (!customer) {
        return NextResponse.json({ error: "Customer not found" }, { status: 404 })
      }

      // Check for existing mapping
      const existing = await prisma.pOSCustomerMapping.findFirst({
        where: {
          providerId: data.providerId,
          OR: [
            { customerId: data.customerId },
            { posCustomerId: data.posCustomerId },
          ],
        },
      })

      if (existing) {
        return NextResponse.json(
          { error: "Mapping already exists for this customer or POS customer" },
          { status: 409 }
        )
      }

      const mapping = await prisma.pOSCustomerMapping.create({
        data: {
          providerId: data.providerId,
          customerId: data.customerId,
          posCustomerId: data.posCustomerId,
        },
      })

      return NextResponse.json({ success: true, mapping, type: "customer" })
    }
  } catch (error) {
    console.error("Create POS mapping error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/pos/mappings - Update a mapping
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    const { id, type, ...updateData } = body

    if (!id || !type) {
      return NextResponse.json(
        { error: "Mapping ID and type are required" },
        { status: 400 }
      )
    }

    if (type === "product") {
      const mapping = await prisma.pOSProductMapping.update({
        where: { id },
        data: {
          syncInventory: updateData.syncInventory,
          syncPrice: updateData.syncPrice,
          posItemId: updateData.posItemId,
          posVariationId: updateData.posVariationId,
          posSku: updateData.posSku,
        },
      })

      return NextResponse.json({ success: true, mapping, type: "product" })
    } else if (type === "customer") {
      const mapping = await prisma.pOSCustomerMapping.update({
        where: { id },
        data: {
          posCustomerId: updateData.posCustomerId,
        },
      })

      return NextResponse.json({ success: true, mapping, type: "customer" })
    } else {
      return NextResponse.json({ error: "Invalid mapping type" }, { status: 400 })
    }
  } catch (error) {
    console.error("Update POS mapping error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/pos/mappings - Delete a mapping
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const type = searchParams.get("type")

    if (!id || !type) {
      return NextResponse.json(
        { error: "Mapping ID and type are required" },
        { status: 400 }
      )
    }

    if (type === "product") {
      await prisma.pOSProductMapping.delete({
        where: { id },
      })
    } else if (type === "customer") {
      await prisma.pOSCustomerMapping.delete({
        where: { id },
      })
    } else {
      return NextResponse.json({ error: "Invalid mapping type" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete POS mapping error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
