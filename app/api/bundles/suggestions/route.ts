import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

const KHR_RATE = 4000 // 1 USD = 4000 KHR

// GET /api/bundles/suggestions - Get "frequently bought together" suggestions
// This analyzes order history to find products commonly purchased together
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const productId = searchParams.get("productId")
  const limit = parseInt(searchParams.get("limit") || "3")

  if (!productId) {
    return NextResponse.json(
      { error: "productId is required" },
      { status: 400 }
    )
  }

  try {
    // Get the current product
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        inventory: true,
        category: true,
      },
    })

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      )
    }

    // Find orders containing this product
    const ordersWithProduct = await prisma.orderItem.findMany({
      where: { productId },
      select: { orderId: true },
      take: 100, // Limit to recent orders for performance
    })

    const orderIds = [...new Set(ordersWithProduct.map((o) => o.orderId))]

    if (orderIds.length === 0) {
      // No order history, fall back to same-category products
      const sameCategoryProducts = await prisma.product.findMany({
        where: {
          categoryId: product.categoryId,
          id: { not: productId },
          isActive: true,
        },
        take: limit,
        include: {
          inventory: true,
          category: true,
        },
      })

      return NextResponse.json({
        suggestions: sameCategoryProducts.map((p) => ({
          product: {
            id: p.id,
            nameEn: p.nameEn,
            nameKh: p.nameKh,
            priceUsd: Number(p.priceUsd),
            priceKhr: p.priceKhr,
            imageUrl: p.imageUrl,
            category: p.category,
            inventory: p.inventory,
          },
          coOccurrenceCount: 0,
          source: "category",
        })),
        mainProduct: {
          id: product.id,
          nameEn: product.nameEn,
          nameKh: product.nameKh,
          priceUsd: Number(product.priceUsd),
          priceKhr: product.priceKhr,
          imageUrl: product.imageUrl,
        },
      })
    }

    // Find other products in those orders
    const coOccurringItems = await prisma.orderItem.findMany({
      where: {
        orderId: { in: orderIds },
        productId: { not: productId },
      },
      select: { productId: true },
    })

    // Count co-occurrences
    const coOccurrenceCounts = new Map<string, number>()
    for (const item of coOccurringItems) {
      const count = coOccurrenceCounts.get(item.productId) || 0
      coOccurrenceCounts.set(item.productId, count + 1)
    }

    // Sort by co-occurrence count and get top products
    const topCoOccurring = [...coOccurrenceCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id, count]) => ({ productId: id, count }))

    if (topCoOccurring.length === 0) {
      // No co-occurring products, fall back to same category
      const sameCategoryProducts = await prisma.product.findMany({
        where: {
          categoryId: product.categoryId,
          id: { not: productId },
          isActive: true,
        },
        take: limit,
        include: {
          inventory: true,
          category: true,
        },
      })

      return NextResponse.json({
        suggestions: sameCategoryProducts.map((p) => ({
          product: {
            id: p.id,
            nameEn: p.nameEn,
            nameKh: p.nameKh,
            priceUsd: Number(p.priceUsd),
            priceKhr: p.priceKhr,
            imageUrl: p.imageUrl,
            category: p.category,
            inventory: p.inventory,
          },
          coOccurrenceCount: 0,
          source: "category",
        })),
        mainProduct: {
          id: product.id,
          nameEn: product.nameEn,
          nameKh: product.nameKh,
          priceUsd: Number(product.priceUsd),
          priceKhr: product.priceKhr,
          imageUrl: product.imageUrl,
        },
      })
    }

    // Get product details for suggestions
    const suggestedProductIds = topCoOccurring.map((p) => p.productId)
    const suggestedProducts = await prisma.product.findMany({
      where: {
        id: { in: suggestedProductIds },
        isActive: true,
      },
      include: {
        inventory: true,
        category: true,
      },
    })

    const productMap = new Map(suggestedProducts.map((p) => [p.id, p]))

    // Build response with co-occurrence counts
    const suggestions = topCoOccurring
      .map(({ productId: pId, count }) => {
        const p = productMap.get(pId)
        if (!p) return null
        return {
          product: {
            id: p.id,
            nameEn: p.nameEn,
            nameKh: p.nameKh,
            priceUsd: Number(p.priceUsd),
            priceKhr: p.priceKhr,
            imageUrl: p.imageUrl,
            category: p.category,
            inventory: p.inventory,
          },
          coOccurrenceCount: count,
          source: "order_history" as const,
        }
      })
      .filter(Boolean)

    // Calculate potential bundle price (10% discount)
    const bundleProducts = [product, ...suggestedProducts.slice(0, limit)]
    const totalPrice = bundleProducts.reduce(
      (sum, p) => sum + Number(p.priceUsd),
      0
    )
    const suggestedBundlePrice = totalPrice * 0.9 // 10% bundle discount

    return NextResponse.json({
      suggestions,
      mainProduct: {
        id: product.id,
        nameEn: product.nameEn,
        nameKh: product.nameKh,
        priceUsd: Number(product.priceUsd),
        priceKhr: product.priceKhr,
        imageUrl: product.imageUrl,
      },
      suggestedBundle: {
        products: bundleProducts.map((p) => ({
          id: p.id,
          nameEn: p.nameEn,
          nameKh: p.nameKh,
          priceUsd: Number(p.priceUsd),
          priceKhr: p.priceKhr,
          imageUrl: p.imageUrl,
        })),
        originalPriceUsd: Math.round(totalPrice * 100) / 100,
        originalPriceKhr: Math.round(totalPrice * KHR_RATE),
        bundlePriceUsd: Math.round(suggestedBundlePrice * 100) / 100,
        bundlePriceKhr: Math.round(suggestedBundlePrice * KHR_RATE),
        savingsUsd: Math.round((totalPrice - suggestedBundlePrice) * 100) / 100,
        savingsPercent: 10,
      },
    })
  } catch (error) {
    console.error("Error fetching bundle suggestions:", error)
    return NextResponse.json(
      { error: "Failed to fetch bundle suggestions" },
      { status: 500 }
    )
  }
}
