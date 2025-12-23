import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const inventoryUpdateSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(0),
  minLevel: z.number().int().min(0).optional(),
})

// GET /api/inventory - Get inventory with low stock alerts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lowStockOnly = searchParams.get("lowStockOnly") === "true"
    const search = searchParams.get("search")

    const inventory = await prisma.inventory.findMany({
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
      orderBy: { lastUpdated: "desc" },
    })

    let filtered = inventory

    // Filter low stock
    if (lowStockOnly) {
      filtered = filtered.filter((item) => item.quantity <= item.minLevel)
    }

    // Search by product name or SKU
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(
        (item) =>
          item.product.nameEn.toLowerCase().includes(searchLower) ||
          item.product.nameKh.includes(search) ||
          item.product.sku.toLowerCase().includes(searchLower)
      )
    }

    // Add status to each item
    const inventoryWithStatus = filtered.map((item) => ({
      ...item,
      status:
        item.quantity === 0
          ? "OUT_OF_STOCK"
          : item.quantity <= item.minLevel
          ? "LOW"
          : "GOOD",
    }))

    // Count low stock items
    const lowStockCount = inventory.filter(
      (item) => item.quantity <= item.minLevel && item.quantity > 0
    ).length
    const outOfStockCount = inventory.filter((item) => item.quantity === 0).length

    return NextResponse.json({
      inventory: inventoryWithStatus,
      summary: {
        total: inventory.length,
        lowStock: lowStockCount,
        outOfStock: outOfStockCount,
      },
    })
  } catch (error) {
    console.error("Get inventory error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/inventory - Update inventory
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    const result = inventoryUpdateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { productId, quantity, minLevel } = result.data

    const updateData: Record<string, unknown> = {
      quantity,
      lastUpdated: new Date(),
    }

    if (minLevel !== undefined) {
      updateData.minLevel = minLevel
    }

    const inventory = await prisma.inventory.update({
      where: { productId },
      data: updateData,
      include: {
        product: true,
      },
    })

    return NextResponse.json(inventory)
  } catch (error) {
    console.error("Update inventory error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
