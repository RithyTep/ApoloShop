import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { Prisma, SegmentType } from "@prisma/client"

// ============================================
// RFM SCORING UTILITIES
// ============================================

interface RFMScore {
  recencyScore: number
  frequencyScore: number
  monetaryScore: number
  rfmTotal: number
  lastOrderDays: number
  totalOrders: number
  totalSpent: number
}

// Calculate RFM scores for a customer (1-5 scale)
async function calculateCustomerRFM(customerId: string): Promise<RFMScore | null> {
  const orders = await prisma.order.findMany({
    where: {
      customerId,
      status: { not: "CANCELLED" },
    },
    select: {
      createdAt: true,
      totalUsd: true,
    },
    orderBy: { createdAt: "desc" },
  })

  if (orders.length === 0) {
    return null
  }

  const now = new Date()
  const lastOrderDate = orders[0].createdAt
  const lastOrderDays = Math.floor((now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))
  const totalOrders = orders.length
  const totalSpent = orders.reduce((sum, o) => sum + Number(o.totalUsd), 0)

  // Calculate RFM scores (1-5 scale based on quintiles)
  // Recency: Lower days = higher score
  const recencyScore =
    lastOrderDays <= 7 ? 5 :
    lastOrderDays <= 30 ? 4 :
    lastOrderDays <= 60 ? 3 :
    lastOrderDays <= 90 ? 2 : 1

  // Frequency: More orders = higher score
  const frequencyScore =
    totalOrders >= 10 ? 5 :
    totalOrders >= 5 ? 4 :
    totalOrders >= 3 ? 3 :
    totalOrders >= 2 ? 2 : 1

  // Monetary: Higher spend = higher score (in USD)
  const monetaryScore =
    totalSpent >= 500 ? 5 :
    totalSpent >= 200 ? 4 :
    totalSpent >= 100 ? 3 :
    totalSpent >= 50 ? 2 : 1

  return {
    recencyScore,
    frequencyScore,
    monetaryScore,
    rfmTotal: recencyScore + frequencyScore + monetaryScore,
    lastOrderDays,
    totalOrders,
    totalSpent,
  }
}

// Determine auto-segment based on RFM scores
function determineAutoSegment(rfm: RFMScore): string {
  // VIP: High scores across all dimensions (R>=4, F>=4, M>=4)
  if (rfm.recencyScore >= 4 && rfm.frequencyScore >= 4 && rfm.monetaryScore >= 4) {
    return "VIP"
  }
  // At Risk: Was good customer but hasn't ordered recently (R<=2, F>=3, M>=3)
  if (rfm.recencyScore <= 2 && rfm.frequencyScore >= 3 && rfm.monetaryScore >= 3) {
    return "At Risk"
  }
  // Churned: Haven't ordered in a long time with low recent activity
  if (rfm.recencyScore <= 1 && rfm.lastOrderDays > 90) {
    return "Churned"
  }
  // New: Recent first purchase (R>=4, F=1)
  if (rfm.recencyScore >= 4 && rfm.frequencyScore === 1) {
    return "New"
  }
  // Active: Regular customers
  if (rfm.recencyScore >= 3) {
    return "Active"
  }
  // Default
  return "Inactive"
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

const segmentSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  nameKh: z.string().max(100).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  type: z.enum(["AUTO", "CUSTOM"]).default("CUSTOM"),
  rfmConfig: z.object({
    recencyDays: z.number().optional(),
    frequencyMin: z.number().optional(),
    monetaryMin: z.number().optional(),
  }).optional().nullable(),
  filterRules: z.array(z.object({
    field: z.string(),
    operator: z.enum(["equals", "notEquals", "gt", "lt", "gte", "lte", "contains", "startsWith"]),
    value: z.union([z.string(), z.number(), z.boolean()]),
  })).optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#3b82f6"),
  icon: z.string().max(50).optional().nullable(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
})

const updateSegmentSchema = segmentSchema.partial().extend({
  id: z.string().min(1, "Segment ID is required"),
})

// ============================================
// GET /api/segments - List segments with stats
// ============================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeMembers = searchParams.get("includeMembers") === "true"
    const type = searchParams.get("type") as SegmentType | null
    const action = searchParams.get("action")

    // Special action: Calculate and return segment trends over time
    if (action === "trends") {
      const days = parseInt(searchParams.get("days") || "30")
      const trends = await getSegmentTrends(days)
      return NextResponse.json(trends)
    }

    // Special action: Recalculate all segments
    if (action === "recalculate") {
      await recalculateAllSegments()
      return NextResponse.json({ success: true, message: "Segments recalculated" })
    }

    const where: Prisma.CustomerSegmentWhereInput = {}
    if (type) {
      where.type = type
    }

    const segments = await prisma.customerSegment.findMany({
      where,
      include: {
        memberships: includeMembers ? {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
          take: 100, // Limit members for performance
        } : false,
        _count: {
          select: { memberships: true },
        },
      },
      orderBy: [
        { sortOrder: "asc" },
        { name: "asc" },
      ],
    })

    // Calculate aggregate stats
    const totalCustomers = await prisma.customer.count()
    const segmentedCustomers = await prisma.customerSegmentMembership.groupBy({
      by: ["customerId"],
    })

    return NextResponse.json({
      segments: segments.map(s => ({
        ...s,
        customerCount: s._count.memberships,
        totalRevenue: Number(s.totalRevenue),
      })),
      stats: {
        totalSegments: segments.length,
        totalCustomers,
        segmentedCustomers: segmentedCustomers.length,
        unsegmentedCustomers: totalCustomers - segmentedCustomers.length,
      },
    })
  } catch (error) {
    console.error("Get segments error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ============================================
// POST /api/segments - Create segment or trigger actions
// ============================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Handle special actions
    if (body.action === "assign_customer") {
      return handleAssignCustomer(body)
    }
    if (body.action === "remove_customer") {
      return handleRemoveCustomer(body)
    }
    if (body.action === "calculate_rfm") {
      return handleCalculateRFM(body)
    }
    if (body.action === "seed_default_segments") {
      return handleSeedDefaultSegments()
    }

    // Create new segment
    const result = segmentSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const data = result.data

    // Check name uniqueness
    const existing = await prisma.customerSegment.findUnique({
      where: { name: data.name },
    })
    if (existing) {
      return NextResponse.json(
        { error: "Segment name already exists" },
        { status: 409 }
      )
    }

    const segment = await prisma.customerSegment.create({
      data: {
        name: data.name,
        nameKh: data.nameKh,
        description: data.description,
        type: data.type as SegmentType,
        rfmConfig: data.rfmConfig || undefined,
        filterRules: data.filterRules || undefined,
        color: data.color,
        icon: data.icon,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      },
    })

    return NextResponse.json(segment, { status: 201 })
  } catch (error) {
    console.error("Create segment error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ============================================
// PUT /api/segments - Update segment
// ============================================
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    const result = updateSegmentSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { id, ...data } = result.data

    const existing = await prisma.customerSegment.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Segment not found" }, { status: 404 })
    }

    // Check name uniqueness if changed
    if (data.name && data.name !== existing.name) {
      const nameExists = await prisma.customerSegment.findUnique({
        where: { name: data.name },
      })
      if (nameExists) {
        return NextResponse.json(
          { error: "Segment name already exists" },
          { status: 409 }
        )
      }
    }

    const segment = await prisma.customerSegment.update({
      where: { id },
      data: {
        ...data,
        type: data.type as SegmentType | undefined,
        rfmConfig: data.rfmConfig !== undefined ? data.rfmConfig || Prisma.DbNull : undefined,
        filterRules: data.filterRules !== undefined ? data.filterRules || Prisma.DbNull : undefined,
      },
    })

    return NextResponse.json(segment)
  } catch (error) {
    console.error("Update segment error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ============================================
// DELETE /api/segments - Delete segment
// ============================================
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Segment ID required" }, { status: 400 })
    }

    const existing = await prisma.customerSegment.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Segment not found" }, { status: 404 })
    }

    await prisma.customerSegment.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete segment error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function handleAssignCustomer(body: { customerId: string; segmentId: string }) {
  const { customerId, segmentId } = body

  if (!customerId || !segmentId) {
    return NextResponse.json({ error: "customerId and segmentId required" }, { status: 400 })
  }

  const rfm = await calculateCustomerRFM(customerId)

  await prisma.customerSegmentMembership.upsert({
    where: {
      customerId_segmentId: { customerId, segmentId },
    },
    create: {
      customerId,
      segmentId,
      recencyScore: rfm?.recencyScore,
      frequencyScore: rfm?.frequencyScore,
      monetaryScore: rfm?.monetaryScore,
      rfmTotal: rfm?.rfmTotal,
      lastOrderDays: rfm?.lastOrderDays,
      totalOrders: rfm?.totalOrders,
      totalSpent: rfm?.totalSpent,
      assignedBy: "manual",
    },
    update: {
      recencyScore: rfm?.recencyScore,
      frequencyScore: rfm?.frequencyScore,
      monetaryScore: rfm?.monetaryScore,
      rfmTotal: rfm?.rfmTotal,
      lastOrderDays: rfm?.lastOrderDays,
      totalOrders: rfm?.totalOrders,
      totalSpent: rfm?.totalSpent,
      assignedAt: new Date(),
    },
  })

  // Update segment stats
  await updateSegmentStats(segmentId)

  return NextResponse.json({ success: true })
}

async function handleRemoveCustomer(body: { customerId: string; segmentId: string }) {
  const { customerId, segmentId } = body

  if (!customerId || !segmentId) {
    return NextResponse.json({ error: "customerId and segmentId required" }, { status: 400 })
  }

  await prisma.customerSegmentMembership.deleteMany({
    where: { customerId, segmentId },
  })

  // Update segment stats
  await updateSegmentStats(segmentId)

  return NextResponse.json({ success: true })
}

async function handleCalculateRFM(body: { customerId?: string }) {
  if (body.customerId) {
    // Calculate for single customer
    const rfm = await calculateCustomerRFM(body.customerId)
    if (!rfm) {
      return NextResponse.json({ error: "No orders found for customer" }, { status: 404 })
    }
    const segmentName = determineAutoSegment(rfm)
    return NextResponse.json({ rfm, suggestedSegment: segmentName })
  }

  // Calculate for all customers and assign to auto-segments
  const customers = await prisma.customer.findMany({
    select: { id: true },
  })

  // Get or create auto segments
  const autoSegments = await ensureAutoSegmentsExist()
  const segmentMap = new Map(autoSegments.map(s => [s.name, s.id]))

  let processed = 0
  for (const customer of customers) {
    const rfm = await calculateCustomerRFM(customer.id)
    if (rfm) {
      const segmentName = determineAutoSegment(rfm)
      const segmentId = segmentMap.get(segmentName)

      if (segmentId) {
        await prisma.customerSegmentMembership.upsert({
          where: {
            customerId_segmentId: { customerId: customer.id, segmentId },
          },
          create: {
            customerId: customer.id,
            segmentId,
            recencyScore: rfm.recencyScore,
            frequencyScore: rfm.frequencyScore,
            monetaryScore: rfm.monetaryScore,
            rfmTotal: rfm.rfmTotal,
            lastOrderDays: rfm.lastOrderDays,
            totalOrders: rfm.totalOrders,
            totalSpent: rfm.totalSpent,
            assignedBy: "system",
          },
          update: {
            recencyScore: rfm.recencyScore,
            frequencyScore: rfm.frequencyScore,
            monetaryScore: rfm.monetaryScore,
            rfmTotal: rfm.rfmTotal,
            lastOrderDays: rfm.lastOrderDays,
            totalOrders: rfm.totalOrders,
            totalSpent: rfm.totalSpent,
            assignedAt: new Date(),
          },
        })
        processed++
      }
    }
  }

  // Update all segment stats
  for (const segment of autoSegments) {
    await updateSegmentStats(segment.id)
  }

  return NextResponse.json({ success: true, processed })
}

async function handleSeedDefaultSegments() {
  const segments = await ensureAutoSegmentsExist()
  return NextResponse.json({ success: true, segments })
}

async function ensureAutoSegmentsExist() {
  const defaultSegments = [
    { name: "VIP", nameKh: "អតិថិជនពិសេស", color: "#eab308", icon: "crown", sortOrder: 1 },
    { name: "Active", nameKh: "អតិថិជនសកម្ម", color: "#22c55e", icon: "activity", sortOrder: 2 },
    { name: "New", nameKh: "អតិថិជនថ្មី", color: "#3b82f6", icon: "user-plus", sortOrder: 3 },
    { name: "At Risk", nameKh: "អតិថិជនប្រឈម", color: "#f97316", icon: "alert-triangle", sortOrder: 4 },
    { name: "Churned", nameKh: "អតិថិជនបាត់បង់", color: "#ef4444", icon: "user-x", sortOrder: 5 },
    { name: "Inactive", nameKh: "អតិថិជនអសកម្ម", color: "#6b7280", icon: "pause", sortOrder: 6 },
  ]

  const results = []
  for (const seg of defaultSegments) {
    const segment = await prisma.customerSegment.upsert({
      where: { name: seg.name },
      create: {
        name: seg.name,
        nameKh: seg.nameKh,
        description: `Auto-generated ${seg.name} segment based on RFM analysis`,
        type: "AUTO",
        color: seg.color,
        icon: seg.icon,
        sortOrder: seg.sortOrder,
      },
      update: {},
    })
    results.push(segment)
  }

  return results
}

async function updateSegmentStats(segmentId: string) {
  const stats = await prisma.customerSegmentMembership.aggregate({
    where: { segmentId },
    _count: true,
    _sum: { totalSpent: true },
  })

  await prisma.customerSegment.update({
    where: { id: segmentId },
    data: {
      customerCount: stats._count,
      totalRevenue: stats._sum.totalSpent || 0,
      lastCalculatedAt: new Date(),
    },
  })
}

async function recalculateAllSegments() {
  const segments = await prisma.customerSegment.findMany({
    where: { isActive: true },
    select: { id: true },
  })

  for (const segment of segments) {
    await updateSegmentStats(segment.id)
  }
}

async function getSegmentTrends(days: number) {
  // Get membership history for trend analysis
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const memberships = await prisma.customerSegmentMembership.findMany({
    where: {
      assignedAt: { gte: startDate },
    },
    select: {
      segmentId: true,
      assignedAt: true,
      segment: {
        select: {
          name: true,
          color: true,
        },
      },
    },
  })

  // Group by date and segment
  const trendData: Record<string, Record<string, number>> = {}

  for (const m of memberships) {
    const dateKey = m.assignedAt.toISOString().split("T")[0]
    if (!trendData[dateKey]) {
      trendData[dateKey] = {}
    }
    const segmentName = m.segment.name
    trendData[dateKey][segmentName] = (trendData[dateKey][segmentName] || 0) + 1
  }

  // Convert to array format for charts
  const trend = Object.entries(trendData)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, segments]) => ({
      date,
      ...segments,
    }))

  return { trend }
}
