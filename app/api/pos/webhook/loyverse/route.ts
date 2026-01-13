/**
 * Loyverse Webhook Handler
 * POST /api/pos/webhook/loyverse - Handle Loyverse webhook events
 *
 * Events handled:
 * - inventory.level_changed - Real-time inventory updates
 * - receipts.created - New sales
 * - customers.created / customers.updated - Customer changes
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  verifyLoyverseWebhook,
  handlePOSInventoryWebhook,
  createPOSSync,
  importSalesFromPOS,
  syncCustomersFromPOS,
} from "@/lib/pos-integration"

interface LoyverseWebhookEvent {
  type: string
  merchant_id: string
  created_at: string
  payload: {
    inventory?: {
      store_id: string
      variant_id: string
      in_stock: number
    }
    receipt?: {
      receipt_number: string
      store_id: string
      receipt_date: string
    }
    customer?: {
      id: string
      name: string
      phone_number?: string
      email?: string
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

    if (!provider || provider.type !== "LOYVERSE") {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 })
    }

    if (!provider.isActive) {
      return NextResponse.json({ error: "Provider is not active" }, { status: 400 })
    }

    // Get raw body for signature verification
    const body = await request.text()

    // Verify webhook signature
    const signature = request.headers.get("x-loyverse-signature")

    if (signature && provider.webhookSecret) {
      const isValid = verifyLoyverseWebhook(body, signature, provider.webhookSecret)
      if (!isValid) {
        console.warn("[POS/Loyverse Webhook] Invalid signature")
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
      }
    }

    // Parse event
    const event: LoyverseWebhookEvent = JSON.parse(body)
    console.log(`[POS/Loyverse Webhook] Received event: ${event.type}`)

    // Handle different event types
    switch (event.type) {
      case "inventory.level_changed": {
        // Real-time inventory update
        const inventory = event.payload.inventory
        if (inventory && inventory.store_id === provider.locationId) {
          await handlePOSInventoryWebhook(
            providerId,
            inventory.variant_id,
            inventory.in_stock
          )
        }
        break
      }

      case "receipts.created": {
        // Import the new receipt/sale
        if (provider.syncSales) {
          const receipt = event.payload.receipt

          if (receipt && receipt.store_id === provider.locationId) {
            // Create a sync for this single receipt
            const syncId = await createPOSSync(providerId, "INBOUND", "sales", "webhook")
            const receiptDate = new Date(receipt.receipt_date)
            const start = new Date(receiptDate.getTime() - 60000) // 1 minute before
            const end = new Date(receiptDate.getTime() + 60000) // 1 minute after

            // Run sync in background
            importSalesFromPOS(providerId, syncId, start, end).catch((err) => {
              console.error("[POS/Loyverse Webhook] Failed to import receipt:", err)
            })
          }
        }
        break
      }

      case "customers.created":
      case "customers.updated": {
        // Sync customer
        if (provider.syncCustomers) {
          const syncId = await createPOSSync(providerId, "INBOUND", "customers", "webhook")
          syncCustomersFromPOS(providerId, syncId).catch((err) => {
            console.error("[POS/Loyverse Webhook] Failed to sync customer:", err)
          })
        }
        break
      }

      default:
        console.log(`[POS/Loyverse Webhook] Unhandled event type: ${event.type}`)
    }

    // Update last sync time
    await prisma.pOSProvider.update({
      where: { id: providerId },
      data: { lastSyncAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Loyverse webhook error:", error)
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
