import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/products/[id]/recommendations - Get product recommendations
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get("limit") || "8"), 20)

    // Validate product ID
    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 })
    }

    // Get the current product with its category
    const currentProduct = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, categoryId: true },
    })

    if (!currentProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Strategy 1: "Customers also bought" - products frequently ordered together
    const customersAlsoBought = await getCustomersAlsoBoughtProducts(productId, limit)

    // Strategy 2: Same category products (excluding current and "also bought" products)
    const alreadyIncludedIds = new Set([productId, ...customersAlsoBought.map((p) => p.id)])
    const remainingSlots = limit - customersAlsoBought.length

    let sameCategoryProducts: typeof customersAlsoBought = []
    if (remainingSlots > 0) {
      sameCategoryProducts = await prisma.product.findMany({
        where: {
          id: { notIn: Array.from(alreadyIncludedIds) },
          categoryId: currentProduct.categoryId,
          isActive: true,
        },
        select: {
          id: true,
          nameEn: true,
          nameKh: true,
          priceUsd: true,
          priceKhr: true,
          imageUrl: true,
          category: {
            select: { id: true, nameEn: true, nameKh: true, slug: true },
          },
          inventory: {
            select: { quantity: true },
          },
        },
        take: remainingSlots,
        orderBy: { createdAt: "desc" },
      })
    }

    // Combine recommendations: "also bought" first, then same category
    const recommendations = [
      ...customersAlsoBought.map((p) => ({ ...p, recommendationType: "also_bought" as const })),
      ...sameCategoryProducts.map((p) => ({ ...p, recommendationType: "same_category" as const })),
    ]

    return NextResponse.json({
      productId,
      recommendations,
      meta: {
        total: recommendations.length,
        alsoBoughtCount: customersAlsoBought.length,
        sameCategoryCount: sameCategoryProducts.length,
      },
    })
  } catch (error) {
    console.error("Get recommendations error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * Find products that customers frequently ordered together with the given product
 * Uses order history to identify co-purchased products
 */
async function getCustomersAlsoBoughtProducts(productId: string, limit: number) {
  // Find all orders that contain the current product
  const ordersWithProduct = await prisma.orderItem.findMany({
    where: {
      productId,
      order: {
        status: { in: ["COMPLETED", "READY", "PREPARING", "CONFIRMED"] },
      },
    },
    select: { orderId: true },
    distinct: ["orderId"],
  })

  if (ordersWithProduct.length === 0) {
    return []
  }

  const orderIds = ordersWithProduct.map((o) => o.orderId)

  // Find other products in those same orders (excluding the current product)
  const coPurchasedItems = await prisma.orderItem.findMany({
    where: {
      orderId: { in: orderIds },
      productId: { not: productId },
      product: {
        isActive: true,
      },
    },
    select: {
      productId: true,
    },
  })

  // Count frequency of each co-purchased product
  const productFrequency = new Map<string, number>()
  for (const item of coPurchasedItems) {
    if (item.productId) {
      productFrequency.set(item.productId, (productFrequency.get(item.productId) || 0) + 1)
    }
  }

  // Sort by frequency and take top products
  const topProductIds = Array.from(productFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([productId]) => productId)

  if (topProductIds.length === 0) {
    return []
  }

  // Fetch full product details for the top co-purchased products
  const products = await prisma.product.findMany({
    where: {
      id: { in: topProductIds },
      isActive: true,
    },
    select: {
      id: true,
      nameEn: true,
      nameKh: true,
      priceUsd: true,
      priceKhr: true,
      imageUrl: true,
      category: {
        select: { id: true, nameEn: true, nameKh: true, slug: true },
      },
      inventory: {
        select: { quantity: true },
      },
    },
  })

  // Preserve the frequency-based order
  const productMap = new Map(products.map((p) => [p.id, p]))
  return topProductIds.map((id) => productMap.get(id)!).filter(Boolean)
}
