import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import {
  createWebhook,
  updateWebhook,
  deleteWebhook,
  generateWebhookSecret,
  type WebhookEventType,
} from "@/lib/webhook-service"

// Valid webhook events
const webhookEvents = [
  "ORDER_CREATED",
  "ORDER_UPDATED",
  "PRODUCT_UPDATED",
  "CUSTOMER_CREATED",
] as const

// Validation schema for creating a webhook
const webhookCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  url: z.string().url("URL must be a valid URL"),
  events: z
    .array(z.enum(webhookEvents))
    .min(1, "At least one event is required"),
  description: z.string().max(500).optional(),
  headers: z.record(z.string()).optional(),
  clientId: z.string().optional(),
})

// Validation schema for updating a webhook
const webhookUpdateSchema = z.object({
  id: z.string().min(1, "Webhook ID is required"),
  name: z.string().min(1).max(100).optional(),
  url: z.string().url().optional(),
  events: z.array(z.enum(webhookEvents)).min(1).optional(),
  description: z.string().max(500).optional().nullable(),
  headers: z.record(z.string()).optional().nullable(),
  isActive: z.boolean().optional(),
  regenerateSecret: z.boolean().optional(),
})

// Helper to check admin access
async function isAdmin(request: NextRequest): Promise<boolean> {
  const adminKey = request.headers.get("x-admin-key")
  const expectedKey = process.env.SUPER_ADMIN_KEY

  if (expectedKey) {
    return adminKey === expectedKey
  }

  // Check for session cookie (simplified)
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

// GET /api/webhooks - List webhooks
export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get("clientId")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const isActive = searchParams.get("isActive")

    const where: Record<string, unknown> = {}

    if (clientId) {
      where.clientId = clientId
    }

    if (isActive !== null && isActive !== undefined && isActive !== "") {
      where.isActive = isActive === "true"
    }

    const [webhooks, total] = await Promise.all([
      prisma.webhook.findMany({
        where,
        include: {
          _count: {
            select: { deliveryLogs: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.webhook.count({ where }),
    ])

    // Hide secret from response (only show masked version)
    const safeWebhooks = webhooks.map((webhook) => ({
      ...webhook,
      secret: `${webhook.secret.substring(0, 8)}...${webhook.secret.substring(webhook.secret.length - 4)}`,
      _secretLength: webhook.secret.length,
    }))

    return NextResponse.json({
      webhooks: safeWebhooks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching webhooks:", error)
    return NextResponse.json(
      { error: "Failed to fetch webhooks" },
      { status: 500 }
    )
  }
}

// POST /api/webhooks - Create a new webhook
export async function POST(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validation = webhookCreateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.errors },
        { status: 400 }
      )
    }

    const data = validation.data

    // Check for duplicate URL+events combination
    const existing = await prisma.webhook.findFirst({
      where: {
        url: data.url,
        clientId: data.clientId || null,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: "A webhook with this URL already exists" },
        { status: 409 }
      )
    }

    const webhook = await createWebhook({
      name: data.name,
      url: data.url,
      events: data.events as WebhookEventType[],
      description: data.description,
      headers: data.headers,
      clientId: data.clientId,
    })

    return NextResponse.json(
      {
        webhook: {
          ...webhook,
          // Show full secret only on creation
          secretHint: "Save this secret - it won't be shown again in full",
        },
        message: "Webhook created successfully",
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating webhook:", error)
    return NextResponse.json(
      { error: "Failed to create webhook" },
      { status: 500 }
    )
  }
}

// PUT /api/webhooks - Update a webhook
export async function PUT(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validation = webhookUpdateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.errors },
        { status: 400 }
      )
    }

    const { id, regenerateSecret, ...data } = validation.data

    // Check webhook exists
    const existing = await prisma.webhook.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 })
    }

    // If URL changed, check for duplicates
    if (data.url && data.url !== existing.url) {
      const duplicate = await prisma.webhook.findFirst({
        where: {
          url: data.url,
          clientId: existing.clientId,
          id: { not: id },
        },
      })

      if (duplicate) {
        return NextResponse.json(
          { error: "A webhook with this URL already exists" },
          { status: 409 }
        )
      }
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.url !== undefined) updateData.url = data.url
    if (data.events !== undefined) updateData.events = data.events
    if (data.description !== undefined) updateData.description = data.description
    if (data.headers !== undefined) updateData.headers = data.headers
    if (data.isActive !== undefined) updateData.isActive = data.isActive

    // Regenerate secret if requested
    let newSecret: string | undefined
    if (regenerateSecret) {
      newSecret = generateWebhookSecret()
      updateData.secret = newSecret
    }

    const webhook = await updateWebhook(id, updateData as Parameters<typeof updateWebhook>[1])

    const response: Record<string, unknown> = {
      webhook: {
        ...webhook,
        secret: newSecret
          ? webhook.secret // Show full new secret
          : `${webhook.secret.substring(0, 8)}...${webhook.secret.substring(webhook.secret.length - 4)}`,
      },
      message: "Webhook updated successfully",
    }

    if (newSecret) {
      response.secretRegenerated = true
      response.secretHint = "Save this secret - it won't be shown again in full"
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error updating webhook:", error)
    return NextResponse.json(
      { error: "Failed to update webhook" },
      { status: 500 }
    )
  }
}

// DELETE /api/webhooks - Delete a webhook
export async function DELETE(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { error: "Webhook ID is required" },
        { status: 400 }
      )
    }

    // Check webhook exists
    const existing = await prisma.webhook.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 })
    }

    await deleteWebhook(id)

    return NextResponse.json({ message: "Webhook deleted successfully" })
  } catch (error) {
    console.error("Error deleting webhook:", error)
    return NextResponse.json(
      { error: "Failed to delete webhook" },
      { status: 500 }
    )
  }
}
