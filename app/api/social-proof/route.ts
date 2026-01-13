import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

// GET /api/social-proof - Get social proof data (recent purchases, config)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const productId = searchParams.get("productId")

  try {
    // Get social proof configuration (use first record or defaults)
    const config = await prisma.socialProofConfig.findFirst({
      where: { isActive: true },
    })

    const defaultConfig = {
      showRecentPurchases: true,
      purchaseDisplayDelay: 5,
      purchaseDisplayDuration: 5,
      purchaseTimeWindow: 24,
      showViewerCount: true,
      viewerCountMin: 5,
      viewerCountMax: 20,
      showSoldCount: true,
      showTrustBadges: true,
      enabledBadges: ["secure", "guarantee", "shipping"],
      notificationPosition: "bottom-left",
    }

    const activeConfig = config || defaultConfig

    // Get recent purchases within the time window
    const hoursAgo = new Date()
    hoursAgo.setHours(hoursAgo.getHours() - (config?.purchaseTimeWindow || 24))

    const recentPurchases = await prisma.order.findMany({
      where: {
        status: { in: ["COMPLETED", "CONFIRMED", "PREPARING", "READY"] },
        createdAt: { gte: hoursAgo },
      },
      select: {
        id: true,
        createdAt: true,
        customer: {
          select: {
            name: true,
          },
        },
        items: {
          select: {
            productId: true,
            productName: true,
            quantity: true,
            product: {
              select: {
                id: true,
                nameEn: true,
                nameKh: true,
                imageUrl: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20, // Get last 20 orders for rotation
    })

    // Transform purchases into notification format
    const purchaseNotifications = recentPurchases.flatMap((order) =>
      order.items
        .filter((item) => item.product) // Only include items with existing products
        .map((item) => ({
          id: `${order.id}-${item.productId}`,
          customerName: anonymizeName(order.customer?.name || "Someone"),
          productId: item.productId,
          productName: item.product?.nameEn || item.productName || "a product",
          productNameKh: item.product?.nameKh || item.productName || "ផលិតផល",
          productImage: item.product?.imageUrl || null,
          quantity: item.quantity,
          timeAgo: getTimeAgo(order.createdAt),
          createdAt: order.createdAt.toISOString(),
        }))
    )

    // If productId is specified, get sold count for that product
    let soldCount = 0
    let viewerCount = 0

    if (productId) {
      // Get total sold count for this product
      const soldResult = await prisma.orderItem.aggregate({
        where: {
          productId,
          order: {
            status: { in: ["COMPLETED", "CONFIRMED", "PREPARING", "READY"] },
          },
        },
        _sum: { quantity: true },
      })
      soldCount = soldResult._sum.quantity || 0

      // Generate simulated viewer count within configured range
      const min = config?.viewerCountMin || 5
      const max = config?.viewerCountMax || 20
      viewerCount = Math.floor(Math.random() * (max - min + 1)) + min
    }

    return NextResponse.json({
      config: {
        showRecentPurchases: activeConfig.showRecentPurchases,
        purchaseDisplayDelay: activeConfig.purchaseDisplayDelay,
        purchaseDisplayDuration: activeConfig.purchaseDisplayDuration,
        showViewerCount: activeConfig.showViewerCount,
        showSoldCount: activeConfig.showSoldCount,
        showTrustBadges: activeConfig.showTrustBadges,
        enabledBadges: activeConfig.enabledBadges,
        notificationPosition: activeConfig.notificationPosition,
      },
      recentPurchases: purchaseNotifications,
      productStats: productId
        ? {
            soldCount,
            viewerCount,
          }
        : null,
    })
  } catch (error) {
    console.error("Error fetching social proof data:", error)
    return NextResponse.json(
      { error: "Failed to fetch social proof data" },
      { status: 500 }
    )
  }
}

// POST /api/social-proof - Update social proof configuration (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      showRecentPurchases,
      purchaseDisplayDelay,
      purchaseDisplayDuration,
      purchaseTimeWindow,
      showViewerCount,
      viewerCountMin,
      viewerCountMax,
      showSoldCount,
      showTrustBadges,
      enabledBadges,
      notificationPosition,
      isActive,
    } = body

    // Check if config exists
    const existingConfig = await prisma.socialProofConfig.findFirst()

    if (existingConfig) {
      // Update existing config
      const updated = await prisma.socialProofConfig.update({
        where: { id: existingConfig.id },
        data: {
          showRecentPurchases:
            showRecentPurchases ?? existingConfig.showRecentPurchases,
          purchaseDisplayDelay:
            purchaseDisplayDelay ?? existingConfig.purchaseDisplayDelay,
          purchaseDisplayDuration:
            purchaseDisplayDuration ?? existingConfig.purchaseDisplayDuration,
          purchaseTimeWindow:
            purchaseTimeWindow ?? existingConfig.purchaseTimeWindow,
          showViewerCount: showViewerCount ?? existingConfig.showViewerCount,
          viewerCountMin: viewerCountMin ?? existingConfig.viewerCountMin,
          viewerCountMax: viewerCountMax ?? existingConfig.viewerCountMax,
          showSoldCount: showSoldCount ?? existingConfig.showSoldCount,
          showTrustBadges: showTrustBadges ?? existingConfig.showTrustBadges,
          enabledBadges: enabledBadges ?? existingConfig.enabledBadges,
          notificationPosition:
            notificationPosition ?? existingConfig.notificationPosition,
          isActive: isActive ?? existingConfig.isActive,
        },
      })

      return NextResponse.json({
        message: "Social proof configuration updated",
        config: updated,
      })
    } else {
      // Create new config
      const created = await prisma.socialProofConfig.create({
        data: {
          showRecentPurchases: showRecentPurchases ?? true,
          purchaseDisplayDelay: purchaseDisplayDelay ?? 5,
          purchaseDisplayDuration: purchaseDisplayDuration ?? 5,
          purchaseTimeWindow: purchaseTimeWindow ?? 24,
          showViewerCount: showViewerCount ?? true,
          viewerCountMin: viewerCountMin ?? 5,
          viewerCountMax: viewerCountMax ?? 20,
          showSoldCount: showSoldCount ?? true,
          showTrustBadges: showTrustBadges ?? true,
          enabledBadges: enabledBadges ?? ["secure", "guarantee", "shipping"],
          notificationPosition: notificationPosition ?? "bottom-left",
          isActive: isActive ?? true,
        },
      })

      return NextResponse.json(
        {
          message: "Social proof configuration created",
          config: created,
        },
        { status: 201 }
      )
    }
  } catch (error) {
    console.error("Error updating social proof config:", error)
    return NextResponse.json(
      { error: "Failed to update social proof configuration" },
      { status: 500 }
    )
  }
}

// Helper function to anonymize customer names for privacy
function anonymizeName(name: string): string {
  if (!name || name.trim().length === 0) return "Someone"

  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    // Single name: "John" -> "J***"
    return parts[0].charAt(0).toUpperCase() + "***"
  }

  // Multiple names: "John Doe" -> "John D."
  const firstName = parts[0]
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase()
  return `${firstName} ${lastInitial}.`
}

// Helper function to get human-readable time ago
function getTimeAgo(date: Date): { en: string; kh: string } {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)

  if (seconds < 60) {
    return { en: "just now", kh: "ទើបតែ" }
  }

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return {
      en: `${minutes} minute${minutes > 1 ? "s" : ""} ago`,
      kh: `${minutes} នាទីមុន`,
    }
  }

  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return {
      en: `${hours} hour${hours > 1 ? "s" : ""} ago`,
      kh: `${hours} ម៉ោងមុន`,
    }
  }

  const days = Math.floor(hours / 24)
  return {
    en: `${days} day${days > 1 ? "s" : ""} ago`,
    kh: `${days} ថ្ងៃមុន`,
  }
}
