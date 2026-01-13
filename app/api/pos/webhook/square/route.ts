/**
 * Square Webhook Handler
 * POST /api/pos/webhook/square - Handle Square webhook events
 *
 * Events handled:
 * - inventory.count.updated - Real-time inventory updates
 * - order.created - New sales
 * - customer.created / customer.updated - Customer changes
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  verifySquareWebhook,
  handlePOSInventoryWebhook,
  createPOSSync,
  importSalesFromPOS,
  syncCustomersFromPOS,
} from "@/lib/pos-integration"

interface SquareWebhookEvent {
  merchant_id: string
  type: string
  event_id: string
  created_at: string
  data: {
    type: string
    id: string
    object?: {
      inventory_counts?: Array<{
        catalog_object_id: string
        location_id: string
        quantity: string
        state: string
      }>
      order?: {
        id: string
        location_id: string
        created_at: string
      }
      customer?: {
        id: string
        given_name?: string
        family_name?: string
        phone_number?: string
        email_address?: string
      }
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const providerId = searchParams.get("providerId")

    if (!providerId) {
      return NextResponse.json({ error: "Provider ID is required" }, { status: 400 })
    }

    // Get provider and webhook secret
    const provider = await prisma.pOSProvider.findUnique({
      where: { id: providerId },
    })

    if (!provider || provider.type !== "SQUARE") {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 })
    }

    if (!provider.isActive) {
      return NextResponse.json({ error: "Provider is not active" }, { status: 400 })
    }

    // Get raw body for signature verification
    const body = await request.text()

    // Verify webhook signature
    const signature = request.headers.get("x-square-hmacsha256-signature")
    const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY

    if (signature && signatureKey && provider.webhookSecret) {
      const isValid = verifySquareWebhook(body, signature, provider.webhookSecret, signatureKey)
      if (!isValid) {
        console.warn("[POS/Square Webhook] Invalid signature")
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
      }
    }

    // Parse event
    const event: SquareWebhookEvent = JSON.parse(body)
    console.log(`[POS/Square Webhook] Received event: ${event.type}`)

    // Handle different event types
    switch (event.type) {
      case "inventory.count.updated": {
        // Real-time inventory update
        const counts = event.data.object?.inventory_counts || []
        for (const count of counts) {
          if (count.location_id === provider.locationId) {
            const quantity = parseInt(count.quantity) || 0
            await handlePOSInventoryWebhook(providerId, count.catalog_object_id, quantity)
          }
        }
        break
      }

      case "order.created":
      case "order.completed": {
        // Import the new order
        if (provider.syncSales) {
          const orderId = event.data.object?.order?.id
          const orderDate = event.data.object?.order?.created_at

          if (orderId && orderDate) {
            // Create a sync for this single order
            const syncId = await createPOSSync(providerId, "INBOUND", "sales", "webhook")
            const start = new Date(orderDate)
            const end = new Date(start.getTime() + 60000) // 1 minute window

            // Run sync in background
            importSalesFromPOS(providerId, syncId, start, end).catch((err) => {
              console.error("[POS/Square Webhook] Failed to import order:", err)
            })
          }
        }
        break
      }

      case "customer.created":
      case "customer.updated": {
        // Sync customer
        if (provider.syncCustomers) {
          const syncId = await createPOSSync(providerId, "INBOUND", "customers", "webhook")
          syncCustomersFromPOS(providerId, syncId).catch((err) => {
            console.error("[POS/Square Webhook] Failed to sync customer:", err)
          })
        }
        break
      }

      default:
        console.log(`[POS/Square Webhook] Unhandled event type: ${event.type}`)
    }

    // Update last sync time
    await prisma.pOSProvider.update({
      where: { id: providerId },
      data: { lastSyncAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Square webhook error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Return 200 for HEAD/GET for webhook verification
export async function GET() {
  return NextResponse.json({ status: "ok" })
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}
