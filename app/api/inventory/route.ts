import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { pushInventoryToPOS } from "@/lib/pos-integration"
import { checkAndSendBackInStockNotifications } from "@/lib/notification-service"

const inventoryUpdateSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(0),
  minLevel: z.number().int().min(0).optional(),
  reorderPoint: z.number().int().min(0).optional(),
  reorderQty: z.number().int().min(1).optional(),
  supplierId: z.string().optional().nullable(),
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
        supplier: {
          select: { id: true, name: true, email: true, phone: true, leadTimeDays: true },
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

    const { productId, quantity, minLevel, reorderPoint, reorderQty, supplierId } = result.data

    // Get current inventory quantity for back-in-stock notification check
    const currentInventory = await prisma.inventory.findUnique({
      where: { productId },
      select: { quantity: true },
    })
    const previousQuantity = currentInventory?.quantity ?? 0

    const updateData: Record<string, unknown> = {
      quantity,
      lastUpdated: new Date(),
    }

    if (minLevel !== undefined) {
      updateData.minLevel = minLevel
    }
    if (reorderPoint !== undefined) {
      updateData.reorderPoint = reorderPoint
    }
    if (reorderQty !== undefined) {
      updateData.reorderQty = reorderQty
    }
    if (supplierId !== undefined) {
      updateData.supplierId = supplierId
    }

    const inventory = await prisma.inventory.update({
      where: { productId },
      data: updateData,
      include: {
        product: true,
        supplier: { select: { id: true, name: true } },
      },
    })

    // Check if product was restocked and send back-in-stock notifications
    // Fire and forget - runs in background
    checkAndSendBackInStockNotifications(productId, previousQuantity, quantity).catch((err) => {
      console.error(`[Inventory] Failed to check back-in-stock notifications:`, err)
    })

    // Push inventory update to connected POS systems (real-time sync)
    // This runs in the background and doesn't block the response
    const posProviders = await prisma.pOSProvider.findMany({
      where: {
        isActive: true,
        syncInventory: true,
        productMappings: {
          some: { productId, syncInventory: true },
        },
      },
      select: { id: true },
    })

    // Fire and forget - sync to all connected POS systems
    for (const provider of posProviders) {
      pushInventoryToPOS(provider.id, productId, quantity).catch((err) => {
        console.error(`[POS Sync] Failed to push inventory to ${provider.id}:`, err)
      })
    }

    return NextResponse.json(inventory)
  } catch (error) {
    console.error("Update inventory error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
