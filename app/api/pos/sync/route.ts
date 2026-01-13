/**
 * POS Sync API
 * POST /api/pos/sync - Trigger a sync operation
 * GET /api/pos/sync - Get sync history
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import {
  createPOSSync,
  syncInventoryFromPOS,
  importSalesFromPOS,
  syncCustomersFromPOS,
  type POSSyncType,
  type POSSyncDirection,
} from "@/lib/pos-integration"

const syncRequestSchema = z.object({
  providerId: z.string().min(1, "Provider ID is required"),
  syncType: z.enum(["inventory", "sales", "customers", "products", "full"]),
  direction: z.enum(["INBOUND", "OUTBOUND", "BIDIRECTIONAL"]).default("INBOUND"),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

// POST /api/pos/sync - Trigger a sync operation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const result = syncRequestSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { providerId, syncType, direction, startDate, endDate } = result.data

    // Check provider exists and is active
    const provider = await prisma.pOSProvider.findUnique({
      where: { id: providerId },
    })

    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 })
    }

    if (!provider.isActive) {
      return NextResponse.json({ error: "Provider is not active" }, { status: 400 })
    }

    if (!provider.accessToken) {
      return NextResponse.json({ error: "Provider is not connected" }, { status: 400 })
    }

    // Check for existing in-progress sync
    const existingSync = await prisma.pOSSync.findFirst({
      where: {
        providerId,
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
    })

    if (existingSync) {
      return NextResponse.json(
        { error: "A sync is already in progress", syncId: existingSync.id },
        { status: 409 }
      )
    }

    // Create sync record
    const syncId = await createPOSSync(
      providerId,
      direction as POSSyncDirection,
      syncType as POSSyncType,
      "manual"
    )

    // Start sync in background
    const syncPromise = async () => {
      try {
        if (syncType === "inventory" || syncType === "full") {
          await syncInventoryFromPOS(providerId, syncId)
        }

        if (syncType === "sales" || syncType === "full") {
          const start = startDate ? new Date(startDate) : undefined
          const end = endDate ? new Date(endDate) : undefined
          await importSalesFromPOS(providerId, syncId, start, end)
        }

        if (syncType === "customers" || syncType === "full") {
          await syncCustomersFromPOS(providerId, syncId)
        }
      } catch (err) {
        console.error("[POS/Sync] Sync failed:", err)
        await prisma.pOSSync.update({
          where: { id: syncId },
          data: {
            status: "FAILED",
            errorDetails: err instanceof Error ? err.message : "Unknown error",
            completedAt: new Date(),
          },
        })
      }
    }

    // Run in background (don't await)
    syncPromise()

    return NextResponse.json({
      success: true,
      syncId,
      message: `Sync started for ${syncType}`,
    })
  } catch (error) {
    console.error("Trigger POS sync error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// GET /api/pos/sync - Get sync history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const providerId = searchParams.get("providerId")
    const syncId = searchParams.get("syncId")
    const status = searchParams.get("status")
    const limit = parseInt(searchParams.get("limit") || "20")
    const offset = parseInt(searchParams.get("offset") || "0")

    // If syncId is provided, return that specific sync
    if (syncId) {
      const sync = await prisma.pOSSync.findUnique({
        where: { id: syncId },
        include: {
          provider: {
            select: { id: true, name: true, type: true },
          },
        },
      })

      if (!sync) {
        return NextResponse.json({ error: "Sync not found" }, { status: 404 })
      }

      return NextResponse.json({ sync })
    }

    const where: Record<string, unknown> = {}

    if (providerId) {
      where.providerId = providerId
    }

    if (status) {
      where.status = status
    }

    const [syncs, total] = await Promise.all([
      prisma.pOSSync.findMany({
        where,
        include: {
          provider: {
            select: { id: true, name: true, type: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.pOSSync.count({ where }),
    ])

    // Get summary stats
    const stats = await prisma.pOSSync.groupBy({
      by: ["status"],
      where: providerId ? { providerId } : undefined,
      _count: true,
    })

    const statusCounts = stats.reduce(
      (acc, s) => {
        acc[s.status] = s._count
        return acc
      },
      {} as Record<string, number>
    )

    return NextResponse.json({
      syncs,
      total,
      stats: statusCounts,
      pagination: {
        limit,
        offset,
        hasMore: offset + syncs.length < total,
      },
    })
  } catch (error) {
    console.error("Get POS sync history error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
