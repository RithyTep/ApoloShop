import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/reports/inventory - Get comprehensive inventory status report
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lowStockThreshold = searchParams.get("threshold")
    const categoryId = searchParams.get("categoryId")

    // Default threshold is 10 (same as minLevel default in Inventory model)
    const threshold = lowStockThreshold ? parseInt(lowStockThreshold, 10) : undefined

    // Build where clause for products
    const productWhereClause: Parameters<typeof prisma.product.findMany>[0]["where"] = {
      isActive: true,
    }
    if (categoryId) {
      productWhereClause.categoryId = categoryId
    }

    // Fetch all products with inventory
    const products = await prisma.product.findMany({
      where: productWhereClause,
      include: {
        inventory: true,
        category: {
          select: {
            id: true,
            nameEn: true,
            nameKh: true,
          },
        },
      },
      orderBy: { nameEn: "asc" },
    })

    // Categorize products by stock status
    const lowStockProducts: {
      id: string
      nameEn: string
      nameKh: string
      sku: string
      imageUrl: string | null
      category: { id: string; nameEn: string; nameKh: string } | null
      currentStock: number
      minLevel: number
      priceUsd: number
      stockValue: number
      status: "low" | "critical"
    }[] = []

    const outOfStockProducts: {
      id: string
      nameEn: string
      nameKh: string
      sku: string
      imageUrl: string | null
      category: { id: string; nameEn: string; nameKh: string } | null
      priceUsd: number
      lastUpdated: string | null
    }[] = []

    const healthyStockProducts: {
      id: string
      nameEn: string
      nameKh: string
      sku: string
      currentStock: number
      minLevel: number
      priceUsd: number
      stockValue: number
    }[] = []

    let totalInventoryValue = 0
    let totalProducts = 0
    let productsWithInventory = 0
    let productsWithoutInventory = 0

    for (const product of products) {
      totalProducts++
      const inventory = product.inventory
      const priceUsd = Number(product.priceUsd)

      if (!inventory) {
        // Product without inventory record
        productsWithoutInventory++
        outOfStockProducts.push({
          id: product.id,
          nameEn: product.nameEn,
          nameKh: product.nameKh,
          sku: product.sku,
          imageUrl: product.imageUrl,
          category: product.category,
          priceUsd,
          lastUpdated: null,
        })
        continue
      }

      productsWithInventory++
      const currentStock = inventory.quantity
      const minLevel = threshold !== undefined ? threshold : inventory.minLevel
      const stockValue = currentStock * priceUsd
      totalInventoryValue += stockValue

      if (currentStock === 0) {
        // Out of stock
        outOfStockProducts.push({
          id: product.id,
          nameEn: product.nameEn,
          nameKh: product.nameKh,
          sku: product.sku,
          imageUrl: product.imageUrl,
          category: product.category,
          priceUsd,
          lastUpdated: inventory.lastUpdated?.toISOString() || null,
        })
      } else if (currentStock <= minLevel) {
        // Low stock (critical if at 50% or below of minLevel)
        const isCritical = currentStock <= minLevel * 0.5
        lowStockProducts.push({
          id: product.id,
          nameEn: product.nameEn,
          nameKh: product.nameKh,
          sku: product.sku,
          imageUrl: product.imageUrl,
          category: product.category,
          currentStock,
          minLevel: inventory.minLevel,
          priceUsd,
          stockValue: Number(stockValue.toFixed(2)),
          status: isCritical ? "critical" : "low",
        })
      } else {
        // Healthy stock
        healthyStockProducts.push({
          id: product.id,
          nameEn: product.nameEn,
          nameKh: product.nameKh,
          sku: product.sku,
          currentStock,
          minLevel: inventory.minLevel,
          priceUsd,
          stockValue: Number(stockValue.toFixed(2)),
        })
      }
    }

    // Sort low stock by status (critical first), then by stock level
    lowStockProducts.sort((a, b) => {
      if (a.status === "critical" && b.status !== "critical") return -1
      if (a.status !== "critical" && b.status === "critical") return 1
      return a.currentStock - b.currentStock
    })

    // Calculate category breakdown
    const categoryStock = new Map<string, {
      id: string
      nameEn: string
      nameKh: string
      totalProducts: number
      lowStockCount: number
      outOfStockCount: number
      totalValue: number
    }>()

    for (const product of products) {
      const category = product.category
      if (!category) continue

      const existing = categoryStock.get(category.id) || {
        id: category.id,
        nameEn: category.nameEn,
        nameKh: category.nameKh,
        totalProducts: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        totalValue: 0,
      }

      existing.totalProducts++

      const inventory = product.inventory
      if (inventory) {
        const effectiveMinLevel = threshold !== undefined ? threshold : inventory.minLevel
        if (inventory.quantity === 0) {
          existing.outOfStockCount++
        } else if (inventory.quantity <= effectiveMinLevel) {
          existing.lowStockCount++
        }
        existing.totalValue += inventory.quantity * Number(product.priceUsd)
      } else {
        existing.outOfStockCount++
      }

      categoryStock.set(category.id, existing)
    }

    const stockByCategory = Array.from(categoryStock.values())
      .sort((a, b) => b.totalValue - a.totalValue)
      .map(cat => ({
        ...cat,
        totalValue: Number(cat.totalValue.toFixed(2)),
      }))

    // Calculate turnover metrics (based on recent orders)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentOrderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          status: {
            in: ["COMPLETED", "READY"],
          },
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
        productId: {
          not: null,
        },
      },
      select: {
        productId: true,
        quantity: true,
      },
    })

    // Aggregate sales by product
    const productSalesMap = new Map<string, number>()
    for (const item of recentOrderItems) {
      if (item.productId) {
        productSalesMap.set(
          item.productId,
          (productSalesMap.get(item.productId) || 0) + item.quantity
        )
      }
    }

    // Calculate fast-moving and slow-moving products
    const fastMovingProducts: {
      id: string
      nameEn: string
      nameKh: string
      sku: string
      currentStock: number
      soldLast30Days: number
      daysUntilStockout: number | null
    }[] = []

    const slowMovingProducts: {
      id: string
      nameEn: string
      nameKh: string
      sku: string
      currentStock: number
      soldLast30Days: number
      stockValue: number
    }[] = []

    for (const product of products) {
      if (!product.inventory) continue

      const soldLast30Days = productSalesMap.get(product.id) || 0
      const currentStock = product.inventory.quantity

      if (soldLast30Days > 0 && currentStock > 0) {
        // Calculate days until stockout based on velocity
        const dailySaleRate = soldLast30Days / 30
        const daysUntilStockout = dailySaleRate > 0 ? Math.floor(currentStock / dailySaleRate) : null

        if (soldLast30Days >= 10) {
          // Fast moving: sold at least 10 in last 30 days
          fastMovingProducts.push({
            id: product.id,
            nameEn: product.nameEn,
            nameKh: product.nameKh,
            sku: product.sku,
            currentStock,
            soldLast30Days,
            daysUntilStockout,
          })
        }
      } else if (currentStock > 0 && soldLast30Days === 0) {
        // Slow moving: has stock but no sales in 30 days
        slowMovingProducts.push({
          id: product.id,
          nameEn: product.nameEn,
          nameKh: product.nameKh,
          sku: product.sku,
          currentStock,
          soldLast30Days: 0,
          stockValue: Number((currentStock * Number(product.priceUsd)).toFixed(2)),
        })
      }
    }

    // Sort fast-moving by days until stockout (soonest first)
    fastMovingProducts.sort((a, b) => {
      if (a.daysUntilStockout === null) return 1
      if (b.daysUntilStockout === null) return -1
      return a.daysUntilStockout - b.daysUntilStockout
    })

    // Sort slow-moving by stock value (highest first)
    slowMovingProducts.sort((a, b) => b.stockValue - a.stockValue)

    // Prepare summary
    const summary = {
      totalProducts,
      productsWithInventory,
      productsWithoutInventory,
      lowStockCount: lowStockProducts.length,
      criticalStockCount: lowStockProducts.filter(p => p.status === "critical").length,
      outOfStockCount: outOfStockProducts.length,
      healthyStockCount: healthyStockProducts.length,
      totalInventoryValue: Number(totalInventoryValue.toFixed(2)),
      totalInventoryValueKhr: Math.round(totalInventoryValue * 4000),
    }

    return NextResponse.json({
      summary,
      lowStockProducts,
      outOfStockProducts,
      stockByCategory,
      fastMovingProducts: fastMovingProducts.slice(0, 10),
      slowMovingProducts: slowMovingProducts.slice(0, 10),
    })
  } catch (error) {
    console.error("GET /api/reports/inventory error:", error)
    return NextResponse.json({ error: "Failed to generate inventory report" }, { status: 500 })
  }
}
