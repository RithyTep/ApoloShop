/**
 * Webhook Service for Event-Driven Integrations
 * Supports order, product, and customer events with HMAC signature verification
 */

import { prisma } from "@/lib/prisma"
import { createHmac } from "crypto"
import type { WebhookEvent, WebhookDeliveryStatus, Webhook, WebhookDeliveryLog } from "@prisma/client"

// Types
export type WebhookEventType = "ORDER_CREATED" | "ORDER_UPDATED" | "PRODUCT_UPDATED" | "CUSTOMER_CREATED"

export interface WebhookPayload {
  id: string
  event: WebhookEventType
  createdAt: string
  data: Record<string, unknown>
}

export interface WebhookDeliveryResult {
  success: boolean
  webhookId: string
  deliveryLogId: string
  httpStatus?: number
  error?: string
  durationMs?: number
}

export interface WebhookCreateInput {
  name: string
  url: string
  events: WebhookEventType[]
  secret?: string
  description?: string
  headers?: Record<string, string>
  clientId?: string
}

// Constants
const MAX_RESPONSE_LENGTH = 1000 // Truncate response body
const DEFAULT_TIMEOUT_MS = 10000 // 10 second timeout
const RETRY_DELAYS = [60000, 300000, 900000] // 1min, 5min, 15min

/**
 * Generate a secure random secret for webhook signing
 */
export function generateWebhookSecret(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

/**
 * Create HMAC-SHA256 signature for webhook payload
 */
export function createWebhookSignature(payload: string, secret: string): string {
  const hmac = createHmac("sha256", secret)
  hmac.update(payload)
  return `sha256=${hmac.digest("hex")}`
}

/**
 * Verify webhook signature (for incoming webhooks from external services)
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = createWebhookSignature(payload, secret)
  // Use timing-safe comparison to prevent timing attacks
  if (signature.length !== expectedSignature.length) {
    return false
  }
  let result = 0
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i)
  }
  return result === 0
}

/**
 * Create a new webhook
 */
export async function createWebhook(input: WebhookCreateInput): Promise<Webhook> {
  const secret = input.secret || generateWebhookSecret()

  const webhook = await prisma.webhook.create({
    data: {
      name: input.name,
      url: input.url,
      events: input.events as WebhookEvent[],
      secret,
      description: input.description,
      headers: input.headers,
      clientId: input.clientId,
    },
  })

  return webhook
}

/**
 * Update webhook configuration
 */
export async function updateWebhook(
  webhookId: string,
  data: Partial<Omit<WebhookCreateInput, "clientId">> & { isActive?: boolean }
): Promise<Webhook> {
  const updateData: Record<string, unknown> = {}

  if (data.name !== undefined) updateData.name = data.name
  if (data.url !== undefined) updateData.url = data.url
  if (data.events !== undefined) updateData.events = data.events
  if (data.secret !== undefined) updateData.secret = data.secret
  if (data.description !== undefined) updateData.description = data.description
  if (data.headers !== undefined) updateData.headers = data.headers
  if (data.isActive !== undefined) updateData.isActive = data.isActive

  return prisma.webhook.update({
    where: { id: webhookId },
    data: updateData,
  })
}

/**
 * Delete a webhook
 */
export async function deleteWebhook(webhookId: string): Promise<void> {
  await prisma.webhook.delete({
    where: { id: webhookId },
  })
}

/**
 * Get webhooks for a client
 */
export async function getWebhooks(clientId?: string): Promise<Webhook[]> {
  return prisma.webhook.findMany({
    where: clientId ? { clientId } : {},
    orderBy: { createdAt: "desc" },
  })
}

/**
 * Get webhook by ID
 */
export async function getWebhookById(webhookId: string): Promise<Webhook | null> {
  return prisma.webhook.findUnique({
    where: { id: webhookId },
  })
}

/**
 * Get webhook delivery logs
 */
export async function getWebhookDeliveryLogs(
  webhookId: string,
  limit = 50
): Promise<WebhookDeliveryLog[]> {
  return prisma.webhookDeliveryLog.findMany({
    where: { webhookId },
    orderBy: { createdAt: "desc" },
    take: limit,
  })
}

/**
 * Build webhook payload
 */
function buildPayload(event: WebhookEventType, data: Record<string, unknown>): WebhookPayload {
  return {
    id: crypto.randomUUID(),
    event,
    createdAt: new Date().toISOString(),
    data,
  }
}

/**
 * Deliver webhook to a single endpoint
 */
async function deliverWebhook(
  webhook: Webhook,
  event: WebhookEventType,
  payload: WebhookPayload
): Promise<WebhookDeliveryResult> {
  const payloadString = JSON.stringify(payload)
  const signature = createWebhookSignature(payloadString, webhook.secret)

  // Create delivery log
  const deliveryLog = await prisma.webhookDeliveryLog.create({
    data: {
      webhookId: webhook.id,
      event: event as WebhookEvent,
      payload: payload as unknown as Record<string, unknown>,
      signature,
      status: "PENDING",
      sentAt: new Date(),
    },
  })

  const startTime = Date.now()

  try {
    // Build headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Webhook-Signature": signature,
      "X-Webhook-Event": event,
      "X-Webhook-Delivery": deliveryLog.id,
      "User-Agent": "ApoloShop-Webhook/1.0",
    }

    // Add custom headers if configured
    if (webhook.headers) {
      const customHeaders = webhook.headers as Record<string, string>
      Object.assign(headers, customHeaders)
    }

    // Send request
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

    const response = await fetch(webhook.url, {
      method: "POST",
      headers,
      body: payloadString,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const durationMs = Date.now() - startTime
    const responseText = await response.text().catch(() => "")
    const truncatedResponse = responseText.substring(0, MAX_RESPONSE_LENGTH)

    const success = response.ok
    const status: WebhookDeliveryStatus = success ? "SUCCESS" : "FAILED"

    // Update delivery log
    await prisma.webhookDeliveryLog.update({
      where: { id: deliveryLog.id },
      data: {
        status,
        httpStatus: response.status,
        response: truncatedResponse,
        completedAt: new Date(),
        durationMs,
      },
    })

    // Update webhook stats
    await prisma.webhook.update({
      where: { id: webhook.id },
      data: {
        lastTriggeredAt: new Date(),
        ...(success
          ? { successCount: { increment: 1 } }
          : { failureCount: { increment: 1 } }),
      },
    })

    return {
      success,
      webhookId: webhook.id,
      deliveryLogId: deliveryLog.id,
      httpStatus: response.status,
      durationMs,
      error: success ? undefined : `HTTP ${response.status}: ${truncatedResponse}`,
    }
  } catch (error) {
    const durationMs = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    // Calculate next retry time
    const attempt = deliveryLog.attempt
    const nextRetryAt = attempt < RETRY_DELAYS.length
      ? new Date(Date.now() + RETRY_DELAYS[attempt - 1])
      : null

    // Update delivery log
    await prisma.webhookDeliveryLog.update({
      where: { id: deliveryLog.id },
      data: {
        status: nextRetryAt ? "RETRYING" : "FAILED",
        errorMessage,
        completedAt: new Date(),
        durationMs,
        nextRetryAt,
      },
    })

    // Update webhook failure count
    await prisma.webhook.update({
      where: { id: webhook.id },
      data: {
        lastTriggeredAt: new Date(),
        failureCount: { increment: 1 },
      },
    })

    return {
      success: false,
      webhookId: webhook.id,
      deliveryLogId: deliveryLog.id,
      durationMs,
      error: errorMessage,
    }
  }
}

/**
 * Retry a failed webhook delivery
 */
export async function retryWebhookDelivery(deliveryLogId: string): Promise<WebhookDeliveryResult | null> {
  const deliveryLog = await prisma.webhookDeliveryLog.findUnique({
    where: { id: deliveryLogId },
    include: { webhook: true },
  })

  if (!deliveryLog || !deliveryLog.webhook.isActive) {
    return null
  }

  if (deliveryLog.attempt >= deliveryLog.maxAttempts) {
    return null
  }

  // Increment attempt counter
  await prisma.webhookDeliveryLog.update({
    where: { id: deliveryLogId },
    data: { attempt: { increment: 1 } },
  })

  const payload = deliveryLog.payload as unknown as WebhookPayload
  return deliverWebhook(deliveryLog.webhook, deliveryLog.event as WebhookEventType, payload)
}

/**
 * Process pending retries
 */
export async function processWebhookRetries(): Promise<number> {
  const now = new Date()

  const pendingRetries = await prisma.webhookDeliveryLog.findMany({
    where: {
      status: "RETRYING",
      nextRetryAt: { lte: now },
      attempt: { lt: prisma.webhookDeliveryLog.fields.maxAttempts },
    },
    include: { webhook: true },
    take: 100,
  })

  let processed = 0
  for (const log of pendingRetries) {
    if (log.webhook.isActive) {
      await retryWebhookDelivery(log.id)
      processed++
    }
  }

  return processed
}

/**
 * Trigger webhooks for an event
 */
export async function triggerWebhooks(
  event: WebhookEventType,
  data: Record<string, unknown>,
  clientId?: string
): Promise<WebhookDeliveryResult[]> {
  // Find active webhooks subscribed to this event
  const webhooks = await prisma.webhook.findMany({
    where: {
      isActive: true,
      events: { has: event as WebhookEvent },
      ...(clientId ? { clientId } : {}),
    },
  })

  if (webhooks.length === 0) {
    return []
  }

  const payload = buildPayload(event, data)

  // Deliver to all matching webhooks concurrently
  const results = await Promise.all(
    webhooks.map((webhook) => deliverWebhook(webhook, event, payload))
  )

  return results
}

/**
 * Test webhook by sending a test payload
 */
export async function testWebhook(webhookId: string): Promise<WebhookDeliveryResult | null> {
  const webhook = await prisma.webhook.findUnique({
    where: { id: webhookId },
  })

  if (!webhook) {
    return null
  }

  const testPayload = buildPayload("ORDER_CREATED", {
    test: true,
    message: "This is a test webhook delivery from ApoloShop",
    timestamp: new Date().toISOString(),
    webhook: {
      id: webhook.id,
      name: webhook.name,
      events: webhook.events,
    },
  })

  return deliverWebhook(webhook, "ORDER_CREATED", testPayload)
}

// Event trigger helpers for common use cases

/**
 * Trigger ORDER_CREATED webhook
 */
export async function onOrderCreated(order: {
  id: string
  orderNumber: string
  status: string
  totalUsd: number | string
  totalKhr: number | string
  customerId?: string
  customerName?: string
  items?: unknown[]
}, clientId?: string): Promise<WebhookDeliveryResult[]> {
  return triggerWebhooks("ORDER_CREATED", {
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalUsd: Number(order.totalUsd),
      totalKhr: Number(order.totalKhr),
      customerId: order.customerId,
      customerName: order.customerName,
      itemCount: order.items?.length || 0,
    },
  }, clientId)
}

/**
 * Trigger ORDER_UPDATED webhook
 */
export async function onOrderUpdated(order: {
  id: string
  orderNumber: string
  status: string
  previousStatus?: string
  totalUsd?: number | string
  totalKhr?: number | string
}, clientId?: string): Promise<WebhookDeliveryResult[]> {
  return triggerWebhooks("ORDER_UPDATED", {
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      previousStatus: order.previousStatus,
      ...(order.totalUsd !== undefined && { totalUsd: Number(order.totalUsd) }),
      ...(order.totalKhr !== undefined && { totalKhr: Number(order.totalKhr) }),
    },
  }, clientId)
}

/**
 * Trigger PRODUCT_UPDATED webhook
 */
export async function onProductUpdated(product: {
  id: string
  nameEn: string
  nameKh?: string
  sku?: string
  priceUsd?: number | string
  priceKhr?: number | string
  isActive?: boolean
  action: "created" | "updated" | "deleted"
}, clientId?: string): Promise<WebhookDeliveryResult[]> {
  return triggerWebhooks("PRODUCT_UPDATED", {
    product: {
      id: product.id,
      nameEn: product.nameEn,
      nameKh: product.nameKh,
      sku: product.sku,
      ...(product.priceUsd !== undefined && { priceUsd: Number(product.priceUsd) }),
      ...(product.priceKhr !== undefined && { priceKhr: Number(product.priceKhr) }),
      isActive: product.isActive,
    },
    action: product.action,
  }, clientId)
}

/**
 * Trigger CUSTOMER_CREATED webhook
 */
export async function onCustomerCreated(customer: {
  id: string
  name: string
  phone?: string
  email?: string | null
}, clientId?: string): Promise<WebhookDeliveryResult[]> {
  return triggerWebhooks("CUSTOMER_CREATED", {
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
    },
  }, clientId)
}
