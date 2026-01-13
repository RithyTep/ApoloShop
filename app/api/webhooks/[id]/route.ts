import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { testWebhook, getWebhookDeliveryLogs } from "@/lib/webhook-service"

// Helper to check admin access
async function isAdmin(request: NextRequest): Promise<boolean> {
  const adminKey = request.headers.get("x-admin-key")
  const expectedKey = process.env.SUPER_ADMIN_KEY

  if (expectedKey) {
    return adminKey === expectedKey
  }

  const session = request.cookies.get("session")?.value
  if (session) {
    try {
      const user = await prisma.user.findFirst({
        where: {
          sessions: { some: { id: session, expiresAt: { gt: new Date() } } },
        },
        include: { role: true },
      })
      return !!user && ["super_admin", "admin"].includes(user.role.name)
    } catch {
      return false
    }
  }

  return process.env.NODE_ENV === "development"
}

// GET /api/webhooks/[id] - Get webhook details and delivery logs
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      )
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const logsLimit = parseInt(searchParams.get("logsLimit") || "50")

    const webhook = await prisma.webhook.findUnique({
      where: { id },
      include: {
        client: {
          select: { id: true, name: true, slug: true },
        },
      },
    })

    if (!webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 })
    }

    // Get delivery logs
    const deliveryLogs = await getWebhookDeliveryLogs(id, logsLimit)

    // Calculate success rate
    const totalDeliveries = webhook.successCount + webhook.failureCount
    const successRate = totalDeliveries > 0
      ? ((webhook.successCount / totalDeliveries) * 100).toFixed(1)
      : "N/A"

    // Mask secret
    const maskedSecret = `${webhook.secret.substring(0, 8)}...${webhook.secret.substring(webhook.secret.length - 4)}`

    return NextResponse.json({
      webhook: {
        ...webhook,
        secret: maskedSecret,
      },
      stats: {
        totalDeliveries,
        successCount: webhook.successCount,
        failureCount: webhook.failureCount,
        successRate,
        lastTriggeredAt: webhook.lastTriggeredAt,
      },
      deliveryLogs,
    })
  } catch (error) {
    console.error("Error fetching webhook:", error)
    return NextResponse.json(
      { error: "Failed to fetch webhook" },
      { status: 500 }
    )
  }
}

// POST /api/webhooks/[id] - Test webhook
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      )
    }

    const { id } = await params

    // Check webhook exists
    const webhook = await prisma.webhook.findUnique({
      where: { id },
    })

    if (!webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 })
    }

    if (!webhook.isActive) {
      return NextResponse.json(
        { error: "Cannot test inactive webhook" },
        { status: 400 }
      )
    }

    // Send test webhook
    const result = await testWebhook(id)

    if (!result) {
      return NextResponse.json(
        { error: "Failed to send test webhook" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? "Test webhook delivered successfully"
        : "Test webhook delivery failed",
      deliveryLogId: result.deliveryLogId,
      httpStatus: result.httpStatus,
      error: result.error,
      durationMs: result.durationMs,
    })
  } catch (error) {
    console.error("Error testing webhook:", error)
    return NextResponse.json(
      { error: "Failed to test webhook" },
      { status: 500 }
    )
  }
}
