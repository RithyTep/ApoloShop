import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { ExperimentStatus, ExperimentType } from "@prisma/client"

// Validation schemas
const variantSchema = z.object({
  name: z.string().min(1, "Variant name is required"),
  description: z.string().optional(),
  isControl: z.boolean().default(false),
  trafficWeight: z.number().int().min(1).max(100).default(50),
  config: z.record(z.unknown()).optional(),
})

const createExperimentSchema = z.object({
  name: z.string().min(1, "Experiment name is required"),
  description: z.string().optional(),
  type: z.nativeEnum(ExperimentType).default(ExperimentType.CUSTOM),
  trafficPercent: z.number().int().min(1).max(100).default(100),
  goalType: z.string().default("conversion"),
  goalDescription: z.string().optional(),
  confidenceLevel: z.number().int().min(90).max(99).default(95),
  minSampleSize: z.number().int().min(10).default(100),
  autoEndEnabled: z.boolean().default(true),
  autoEndOnSignificance: z.boolean().default(true),
  scheduledStartAt: z.string().datetime().optional(),
  scheduledEndAt: z.string().datetime().optional(),
  variants: z.array(variantSchema).min(2, "At least 2 variants required"),
})

const updateExperimentSchema = z.object({
  id: z.string().min(1, "Experiment ID is required"),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  type: z.nativeEnum(ExperimentType).optional(),
  status: z.nativeEnum(ExperimentStatus).optional(),
  trafficPercent: z.number().int().min(1).max(100).optional(),
  goalType: z.string().optional(),
  goalDescription: z.string().optional(),
  confidenceLevel: z.number().int().min(90).max(99).optional(),
  minSampleSize: z.number().int().min(10).optional(),
  autoEndEnabled: z.boolean().optional(),
  autoEndOnSignificance: z.boolean().optional(),
  scheduledStartAt: z.string().datetime().optional().nullable(),
  scheduledEndAt: z.string().datetime().optional().nullable(),
})

// GET /api/experiments - List experiments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const type = searchParams.get("type")
    const id = searchParams.get("id")

    // Get single experiment by ID
    if (id) {
      const experiment = await prisma.experiment.findUnique({
        where: { id },
        include: {
          variants: {
            orderBy: { isControl: "desc" },
          },
        },
      })

      if (!experiment) {
        return NextResponse.json({ error: "Experiment not found" }, { status: 404 })
      }

      return NextResponse.json({ experiment })
    }

    // Build filter
    const where: Record<string, unknown> = {}
    if (status && Object.values(ExperimentStatus).includes(status as ExperimentStatus)) {
      where.status = status
    }
    if (type && Object.values(ExperimentType).includes(type as ExperimentType)) {
      where.type = type
    }

    const experiments = await prisma.experiment.findMany({
      where,
      include: {
        variants: {
          orderBy: { isControl: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ experiments })
  } catch (error) {
    console.error("Get experiments error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/experiments - Create experiment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const result = createExperimentSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const data = result.data

    // Validate traffic weights sum to 100
    const totalWeight = data.variants.reduce((sum, v) => sum + v.trafficWeight, 0)
    if (totalWeight !== 100) {
      return NextResponse.json(
        { error: `Variant traffic weights must sum to 100 (currently ${totalWeight})` },
        { status: 400 }
      )
    }

    // Validate exactly one control variant
    const controlCount = data.variants.filter((v) => v.isControl).length
    if (controlCount !== 1) {
      return NextResponse.json(
        { error: "Exactly one variant must be marked as control" },
        { status: 400 }
      )
    }

    // Create experiment with variants
    const experiment = await prisma.experiment.create({
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        trafficPercent: data.trafficPercent,
        goalType: data.goalType,
        goalDescription: data.goalDescription,
        confidenceLevel: data.confidenceLevel,
        minSampleSize: data.minSampleSize,
        autoEndEnabled: data.autoEndEnabled,
        autoEndOnSignificance: data.autoEndOnSignificance,
        scheduledStartAt: data.scheduledStartAt ? new Date(data.scheduledStartAt) : null,
        scheduledEndAt: data.scheduledEndAt ? new Date(data.scheduledEndAt) : null,
        variants: {
          create: data.variants.map((v) => ({
            name: v.name,
            description: v.description,
            isControl: v.isControl,
            trafficWeight: v.trafficWeight,
            config: v.config || {},
          })),
        },
      },
      include: {
        variants: true,
      },
    })

    return NextResponse.json(experiment, { status: 201 })
  } catch (error) {
    console.error("Create experiment error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/experiments - Update experiment
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    const result = updateExperimentSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { id, ...data } = result.data

    // Check if experiment exists
    const existing = await prisma.experiment.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Experiment not found" }, { status: 404 })
    }

    // Don't allow changing certain fields on running experiments
    if (existing.status === ExperimentStatus.RUNNING) {
      const restrictedFields = ["goalType", "confidenceLevel", "minSampleSize"]
      for (const field of restrictedFields) {
        if (data[field as keyof typeof data] !== undefined) {
          return NextResponse.json(
            { error: `Cannot change ${field} on a running experiment` },
            { status: 400 }
          )
        }
      }
    }

    // Handle status transitions
    const updateData: Record<string, unknown> = { ...data }

    if (data.status === ExperimentStatus.RUNNING && existing.status !== ExperimentStatus.RUNNING) {
      updateData.startedAt = new Date()
    }

    if (data.status === ExperimentStatus.COMPLETED && existing.status !== ExperimentStatus.COMPLETED) {
      updateData.endedAt = new Date()
    }

    // Parse dates if provided
    if (data.scheduledStartAt !== undefined) {
      updateData.scheduledStartAt = data.scheduledStartAt ? new Date(data.scheduledStartAt) : null
    }
    if (data.scheduledEndAt !== undefined) {
      updateData.scheduledEndAt = data.scheduledEndAt ? new Date(data.scheduledEndAt) : null
    }

    const experiment = await prisma.experiment.update({
      where: { id },
      data: updateData,
      include: {
        variants: true,
      },
    })

    return NextResponse.json(experiment)
  } catch (error) {
    console.error("Update experiment error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/experiments - Delete experiment
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Experiment ID is required" }, { status: 400 })
    }

    // Check if experiment exists
    const existing = await prisma.experiment.findUnique({
      where: { id },
      include: {
        variants: {
          include: {
            _count: { select: { assignments: true } },
          },
        },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: "Experiment not found" }, { status: 404 })
    }

    // Check if experiment has data
    const hasData = existing.variants.some((v) => v._count.assignments > 0)

    if (hasData) {
      // Soft delete by marking as completed
      await prisma.experiment.update({
        where: { id },
        data: {
          status: ExperimentStatus.COMPLETED,
          endedAt: new Date(),
        },
      })
      return NextResponse.json({ success: true, softDeleted: true })
    }

    // Hard delete if no data
    await prisma.experiment.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete experiment error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
