import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import {
  checkAndCreateStockAlerts,
  sendStockAlertNotifications,
  calculateSalesVelocity,
  getStockAlertsSummary,
} from "@/lib/stock-alert-service"

// GET /api/stock-alerts - Get all stock alerts with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") as "PENDING" | "ACKNOWLEDGED" | "RESOLVED" | null
    const type = searchParams.get("type") as "LOW_STOCK" | "OUT_OF_STOCK" | "REORDER_CREATED" | null
    const includeSummary = searchParams.get("summary") === "true"
    const includeVelocity = searchParams.get("velocity") === "true"

    // Build where clause
    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (type) where.type = type

    const alerts = await prisma.stockAlert.findMany({
      where,
      include: {
        inventory: {
          include: {
            product: {
              select: {
                id: true,
                nameEn: true,
                nameKh: true,
                sku: true,
                imageUrl: true,
                priceUsd: true,
              },
            },
            supplier: {
              select: { id: true, name: true, phone: true, email: true },
            },
          },
        },
      },
      orderBy: [
        { status: "asc" }, // PENDING first
        { type: "asc" }, // OUT_OF_STOCK before LOW_STOCK
        { createdAt: "desc" },
      ],
    })

    // Add sales velocity data if requested
    let alertsWithVelocity = alerts
    if (includeVelocity) {
      alertsWithVelocity = await Promise.all(
        alerts.map(async (alert) => {
          if (alert.inventory.product?.id) {
            const velocity = await calculateSalesVelocity(alert.inventory.product.id)
            return { ...alert, salesVelocity: velocity }
          }
          return alert
        })
      )
    }

    // Get summary if requested
    let summary = null
    if (includeSummary) {
      summary = await getStockAlertsSummary()
    }

    return NextResponse.json({
      alerts: alertsWithVelocity,
      summary,
    })
  } catch (error) {
    console.error("Get stock alerts error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/stock-alerts - Run stock check and create alerts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const action = body.action as string | undefined

    // Run stock check to create new alerts
    if (action === "check" || !action) {
      const results = await checkAndCreateStockAlerts()
      return NextResponse.json({
        message: `Created ${results.length} new alerts`,
        alerts: results,
      })
    }

    // Send notifications for pending alerts
    if (action === "notify") {
      const results = await sendStockAlertNotifications()
      return NextResponse.json({
        message: `Sent ${results.sent} notifications, ${results.failed} failed`,
        ...results,
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Stock alert action error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH /api/stock-alerts - Update alert status
const updateAlertSchema = z.object({
  alertId: z.string().min(1),
  status: z.enum(["PENDING", "ACKNOWLEDGED", "RESOLVED"]),
})

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const result = updateAlertSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { alertId, status } = result.data

    const updateData: Record<string, unknown> = { status }
    if (status === "RESOLVED") {
      updateData.resolvedAt = new Date()
    }

    const alert = await prisma.stockAlert.update({
      where: { id: alertId },
      data: updateData,
      include: {
        inventory: {
          include: {
            product: { select: { nameEn: true, sku: true } },
          },
        },
      },
    })

    return NextResponse.json(alert)
  } catch (error) {
    console.error("Update stock alert error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
