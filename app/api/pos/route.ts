/**
 * POS Integration API
 * GET /api/pos - List POS providers
 * POST /api/pos - Create/connect a POS provider
 * PUT /api/pos - Update a POS provider
 * DELETE /api/pos - Delete/disconnect a POS provider
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { encrypt } from "@/lib/encryption"
import {
  generateWebhookSecret,
  testPOSConnection,
} from "@/lib/pos-integration"

const createProviderSchema = z.object({
  name: z.string().min(1, "Provider name is required"),
  type: z.enum(["SQUARE", "LOYVERSE"]),
  accessToken: z.string().min(1, "Access token is required"),
  refreshToken: z.string().optional(),
  locationId: z.string().optional(),
  syncInventory: z.boolean().default(true),
  syncSales: z.boolean().default(true),
  syncCustomers: z.boolean().default(true),
  syncInterval: z.number().int().min(5).max(1440).default(15), // 5 min to 24 hours
})

const updateProviderSchema = z.object({
  id: z.string().min(1, "Provider ID is required"),
  name: z.string().min(1).optional(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  locationId: z.string().optional(),
  syncInventory: z.boolean().optional(),
  syncSales: z.boolean().optional(),
  syncCustomers: z.boolean().optional(),
  syncInterval: z.number().int().min(5).max(1440).optional(),
  isActive: z.boolean().optional(),
})

// GET /api/pos - List POS providers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get("clientId")
    const isActive = searchParams.get("isActive")

    const where: Record<string, unknown> = {}

    if (clientId) {
      where.clientId = clientId
    }

    if (isActive !== null) {
      where.isActive = isActive === "true"
    }

    const providers = await prisma.pOSProvider.findMany({
      where,
      include: {
        _count: {
          select: {
            syncs: true,
            sales: true,
            productMappings: true,
            customerMappings: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Don't expose tokens in response
    const safeProviders = providers.map((p) => ({
      id: p.id,
      clientId: p.clientId,
      name: p.name,
      type: p.type,
      locationId: p.locationId,
      merchantId: p.merchantId,
      syncInventory: p.syncInventory,
      syncSales: p.syncSales,
      syncCustomers: p.syncCustomers,
      syncInterval: p.syncInterval,
      lastSyncAt: p.lastSyncAt,
      isActive: p.isActive,
      connectionStatus: p.connectionStatus,
      lastError: p.lastError,
      webhookUrl: p.webhookUrl,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      hasAccessToken: !!p.accessToken,
      _count: p._count,
    }))

    return NextResponse.json({ providers: safeProviders })
  } catch (error) {
    console.error("Get POS providers error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/pos - Create/connect a POS provider
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const result = createProviderSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const data = result.data

    // Test connection before saving
    const connectionTest = await testPOSConnection(
      data.type,
      encrypt(data.accessToken),
      data.locationId
    )

    if (!connectionTest.success) {
      return NextResponse.json(
        { error: "Connection failed", details: connectionTest.error },
        { status: 400 }
      )
    }

    // Generate webhook secret and URL
    const webhookSecret = generateWebhookSecret()
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://shop.apoloshop.com"

    const provider = await prisma.pOSProvider.create({
      data: {
        name: data.name,
        type: data.type,
        accessToken: encrypt(data.accessToken),
        refreshToken: data.refreshToken ? encrypt(data.refreshToken) : null,
        locationId: data.locationId,
        merchantId: connectionTest.merchantId,
        syncInventory: data.syncInventory,
        syncSales: data.syncSales,
        syncCustomers: data.syncCustomers,
        syncInterval: data.syncInterval,
        webhookSecret,
        connectionStatus: "connected",
      },
    })

    // Set webhook URL after creating provider
    const webhookUrl = `${baseUrl}/api/pos/webhook/${data.type.toLowerCase()}?providerId=${provider.id}`
    await prisma.pOSProvider.update({
      where: { id: provider.id },
      data: { webhookUrl },
    })

    return NextResponse.json({
      success: true,
      provider: {
        id: provider.id,
        name: provider.name,
        type: provider.type,
        locationId: provider.locationId,
        merchantId: provider.merchantId,
        connectionStatus: provider.connectionStatus,
        webhookUrl,
      },
    })
  } catch (error) {
    console.error("Create POS provider error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/pos - Update a POS provider
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    const result = updateProviderSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { id, ...data } = result.data

    // Check provider exists
    const existing = await prisma.pOSProvider.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 })
    }

    // If updating token, test connection
    if (data.accessToken) {
      const connectionTest = await testPOSConnection(
        existing.type,
        encrypt(data.accessToken),
        data.locationId || existing.locationId || undefined
      )

      if (!connectionTest.success) {
        return NextResponse.json(
          { error: "Connection failed", details: connectionTest.error },
          { status: 400 }
        )
      }
    }

    const updateData: Record<string, unknown> = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.accessToken !== undefined) updateData.accessToken = encrypt(data.accessToken)
    if (data.refreshToken !== undefined) updateData.refreshToken = encrypt(data.refreshToken)
    if (data.locationId !== undefined) updateData.locationId = data.locationId
    if (data.syncInventory !== undefined) updateData.syncInventory = data.syncInventory
    if (data.syncSales !== undefined) updateData.syncSales = data.syncSales
    if (data.syncCustomers !== undefined) updateData.syncCustomers = data.syncCustomers
    if (data.syncInterval !== undefined) updateData.syncInterval = data.syncInterval
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive
      updateData.connectionStatus = data.isActive ? "connected" : "disconnected"
    }

    const provider = await prisma.pOSProvider.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      provider: {
        id: provider.id,
        name: provider.name,
        type: provider.type,
        isActive: provider.isActive,
        connectionStatus: provider.connectionStatus,
      },
    })
  } catch (error) {
    console.error("Update POS provider error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/pos - Delete/disconnect a POS provider
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Provider ID is required" }, { status: 400 })
    }

    // Check provider exists
    const existing = await prisma.pOSProvider.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 })
    }

    // Delete provider and related data (cascade)
    await prisma.pOSProvider.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete POS provider error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
