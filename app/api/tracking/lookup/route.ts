import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/tracking/lookup?orderNumber=xxx or ?trackingNumber=xxx
// Public endpoint for customers to track their orders
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderNumber = searchParams.get("orderNumber")
    const trackingNumber = searchParams.get("trackingNumber")

    if (!orderNumber && !trackingNumber) {
      return NextResponse.json(
        { error: "Either orderNumber or trackingNumber is required" },
        { status: 400 }
      )
    }

    let tracking

    if (trackingNumber) {
      // Look up by tracking number
      tracking = await prisma.orderTracking.findFirst({
        where: { trackingNumber },
        include: {
          order: {
            select: {
              orderNumber: true,
              status: true,
              createdAt: true,
              totalUsd: true,
              totalKhr: true,
              currency: true,
              items: {
                select: {
                  quantity: true,
                  product: {
                    select: {
                      nameEn: true,
                      nameKh: true,
                    },
                  },
                },
              },
            },
          },
          statusHistory: {
            orderBy: { createdAt: "desc" },
            select: {
              status: true,
              location: true,
              notes: true,
              createdAt: true,
            },
          },
        },
      })
    } else if (orderNumber) {
      // Look up by order number
      const order = await prisma.order.findUnique({
        where: { orderNumber },
        select: { id: true },
      })

      if (!order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 })
      }

      tracking = await prisma.orderTracking.findUnique({
        where: { orderId: order.id },
        include: {
          order: {
            select: {
              orderNumber: true,
              status: true,
              createdAt: true,
              totalUsd: true,
              totalKhr: true,
              currency: true,
              items: {
                select: {
                  quantity: true,
                  product: {
                    select: {
                      nameEn: true,
                      nameKh: true,
                    },
                  },
                },
              },
            },
          },
          statusHistory: {
            orderBy: { createdAt: "desc" },
            select: {
              status: true,
              location: true,
              notes: true,
              createdAt: true,
            },
          },
        },
      })
    }

    if (!tracking) {
      return NextResponse.json({ error: "Tracking not found" }, { status: 404 })
    }

    // Return a simplified public view (don't expose internal IDs or sensitive data)
    const publicTracking = {
      trackingNumber: tracking.trackingNumber,
      courier: tracking.courier,
      courierName: tracking.courierName,
      status: tracking.status,
      estimatedDeliveryDate: tracking.estimatedDeliveryDate,
      actualDeliveryDate: tracking.actualDeliveryDate,
      order: {
        orderNumber: tracking.order.orderNumber,
        status: tracking.order.status,
        createdAt: tracking.order.createdAt,
        itemCount: tracking.order.items.reduce((sum, item) => sum + item.quantity, 0),
        items: tracking.order.items.map((item) => ({
          name: item.product?.nameEn || "Product",
          nameKh: item.product?.nameKh,
          quantity: item.quantity,
        })),
      },
      statusHistory: tracking.statusHistory.map((h) => ({
        status: h.status,
        location: h.location,
        notes: h.notes,
        timestamp: h.createdAt,
      })),
      createdAt: tracking.createdAt,
      updatedAt: tracking.updatedAt,
    }

    return NextResponse.json(publicTracking)
  } catch (error) {
    console.error("Tracking lookup error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
