import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { retryWebhookDelivery } from "@/lib/webhook-service"

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

// POST /api/webhooks/[id]/retry - Retry a failed delivery
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

    const { id: deliveryLogId } = await params

    // Check delivery log exists
    const deliveryLog = await prisma.webhookDeliveryLog.findUnique({
      where: { id: deliveryLogId },
      include: { webhook: true },
    })

    if (!deliveryLog) {
      return NextResponse.json(
        { error: "Delivery log not found" },
        { status: 404 }
      )
    }

    if (deliveryLog.status === "SUCCESS") {
      return NextResponse.json(
        { error: "Cannot retry successful delivery" },
        { status: 400 }
      )
    }

    if (deliveryLog.attempt >= deliveryLog.maxAttempts) {
      return NextResponse.json(
        { error: "Maximum retry attempts reached" },
        { status: 400 }
      )
    }

    if (!deliveryLog.webhook.isActive) {
      return NextResponse.json(
        { error: "Cannot retry delivery for inactive webhook" },
        { status: 400 }
      )
    }

    // Retry delivery
    const result = await retryWebhookDelivery(deliveryLogId)

    if (!result) {
      return NextResponse.json(
        { error: "Failed to retry delivery" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? "Webhook delivery retried successfully"
        : "Webhook delivery retry failed",
      deliveryLogId: result.deliveryLogId,
      httpStatus: result.httpStatus,
      error: result.error,
      durationMs: result.durationMs,
    })
  } catch (error) {
    console.error("Error retrying webhook delivery:", error)
    return NextResponse.json(
      { error: "Failed to retry delivery" },
      { status: 500 }
    )
  }
}
