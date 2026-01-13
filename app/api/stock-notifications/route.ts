import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

// GET /api/stock-notifications - Get notification subscriptions (admin) or check subscription status
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const productId = searchParams.get("productId")
    const email = searchParams.get("email")
    const isAdmin = searchParams.get("admin") === "true"

    // Admin view: Get all notifications with pagination
    if (isAdmin) {
      const page = parseInt(searchParams.get("page") || "1")
      const limit = parseInt(searchParams.get("limit") || "20")
      const status = searchParams.get("status") // "pending" | "notified" | "all"
      const skip = (page - 1) * limit

      const whereClause: Record<string, unknown> = {}
      if (status === "pending") {
        whereClause.notified = false
      } else if (status === "notified") {
        whereClause.notified = true
      }

      const [notifications, total] = await Promise.all([
        prisma.stockNotification.findMany({
          where: whereClause,
          include: {
            product: {
              select: {
                id: true,
                nameEn: true,
                nameKh: true,
                imageUrl: true,
                sku: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.stockNotification.count({ where: whereClause }),
      ])

      // Get summary stats
      const [pendingCount, notifiedCount] = await Promise.all([
        prisma.stockNotification.count({ where: { notified: false } }),
        prisma.stockNotification.count({ where: { notified: true } }),
      ])

      return NextResponse.json({
        notifications: notifications.map((n) => ({
          id: n.id,
          email: n.email,
          productId: n.productId,
          notified: n.notified,
          notifiedAt: n.notifiedAt?.toISOString() || null,
          createdAt: n.createdAt.toISOString(),
          product: n.product,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        summary: {
          pending: pendingCount,
          notified: notifiedCount,
          total: pendingCount + notifiedCount,
        },
      })
    }

    // Customer view: Check if subscribed to a specific product
    if (productId && email) {
      const notification = await prisma.stockNotification.findUnique({
        where: {
          productId_email: {
            productId,
            email,
          },
        },
      })

      return NextResponse.json({
        subscribed: !!notification,
        notified: notification?.notified || false,
        subscribedAt: notification?.createdAt.toISOString() || null,
      })
    }

    // Get all subscriptions for an email
    if (email) {
      const notifications = await prisma.stockNotification.findMany({
        where: { email, notified: false },
        include: {
          product: {
            select: {
              id: true,
              nameEn: true,
              nameKh: true,
              imageUrl: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      })

      return NextResponse.json({
        subscriptions: notifications.map((n) => ({
          id: n.id,
          productId: n.productId,
          createdAt: n.createdAt.toISOString(),
          product: n.product,
        })),
      })
    }

    return NextResponse.json(
      { error: "productId with email, or email alone, or admin=true is required" },
      { status: 400 }
    )
  } catch (error) {
    console.error("Error fetching stock notifications:", error)
    return NextResponse.json(
      { error: "Failed to fetch stock notifications" },
      { status: 500 }
    )
  }
}

// POST /api/stock-notifications - Subscribe to back-in-stock notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, email, customerId } = body

    if (!productId || !email) {
      return NextResponse.json(
        { error: "productId and email are required" },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        inventory: {
          select: { quantity: true },
        },
      },
    })

    if (!product || !product.isActive) {
      return NextResponse.json(
        { error: "Product not found or not available" },
        { status: 404 }
      )
    }

    // Check if product is already in stock
    const inStock = product.inventory ? product.inventory.quantity > 0 : false
    if (inStock) {
      return NextResponse.json(
        { error: "Product is currently in stock" },
        { status: 400 }
      )
    }

    // Check if already subscribed
    const existing = await prisma.stockNotification.findUnique({
      where: {
        productId_email: {
          productId,
          email,
        },
      },
    })

    if (existing) {
      // If already notified, allow re-subscription
      if (existing.notified) {
        await prisma.stockNotification.update({
          where: { id: existing.id },
          data: {
            notified: false,
            notifiedAt: null,
          },
        })
        return NextResponse.json({
          success: true,
          message: "Re-subscribed to back-in-stock notification",
          resubscribed: true,
        })
      }

      return NextResponse.json({
        success: true,
        message: "Already subscribed to back-in-stock notification",
        alreadySubscribed: true,
      })
    }

    // Create notification subscription
    const notification = await prisma.stockNotification.create({
      data: {
        productId,
        email: email.toLowerCase(),
        customerId: customerId || null,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Subscribed to back-in-stock notification",
      notificationId: notification.id,
    })
  } catch (error) {
    console.error("Error subscribing to stock notification:", error)
    return NextResponse.json(
      { error: "Failed to subscribe to stock notification" },
      { status: 500 }
    )
  }
}

// DELETE /api/stock-notifications - Unsubscribe from notification
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const productId = searchParams.get("productId")
    const email = searchParams.get("email")
    const id = searchParams.get("id")

    // Delete by notification ID directly
    if (id) {
      await prisma.stockNotification.delete({
        where: { id },
      })
      return NextResponse.json({
        success: true,
        message: "Unsubscribed from back-in-stock notification",
      })
    }

    // Delete by product ID and email
    if (!productId || !email) {
      return NextResponse.json(
        { error: "Either id or both productId and email are required" },
        { status: 400 }
      )
    }

    const notification = await prisma.stockNotification.findUnique({
      where: {
        productId_email: {
          productId,
          email,
        },
      },
    })

    if (!notification) {
      return NextResponse.json(
        { error: "Notification subscription not found" },
        { status: 404 }
      )
    }

    await prisma.stockNotification.delete({
      where: { id: notification.id },
    })

    return NextResponse.json({
      success: true,
      message: "Unsubscribed from back-in-stock notification",
    })
  } catch (error) {
    console.error("Error unsubscribing from stock notification:", error)
    return NextResponse.json(
      { error: "Failed to unsubscribe from stock notification" },
      { status: 500 }
    )
  }
}
