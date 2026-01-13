import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { ExperimentStatus } from "@prisma/client"

// Schema for getting variant assignment
const assignSchema = z.object({
  experimentId: z.string().min(1, "Experiment ID is required"),
  visitorId: z.string().min(1, "Visitor ID is required"),
  customerId: z.string().optional(),
})

// POST /api/experiments/assign - Get or create variant assignment for a visitor
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const result = assignSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { experimentId, visitorId, customerId } = result.data

    // Get the experiment with variants
    const experiment = await prisma.experiment.findUnique({
      where: { id: experimentId },
      include: {
        variants: true,
      },
    })

    if (!experiment) {
      return NextResponse.json({ error: "Experiment not found" }, { status: 404 })
    }

    // Check if experiment is running
    if (experiment.status !== ExperimentStatus.RUNNING) {
      return NextResponse.json(
        { error: "Experiment is not running", status: experiment.status },
        { status: 400 }
      )
    }

    // Check if visitor should be included based on traffic percent
    const hash = simpleHash(visitorId + experimentId)
    const includeInExperiment = (hash % 100) < experiment.trafficPercent

    if (!includeInExperiment) {
      // Return control variant for visitors not in experiment
      const controlVariant = experiment.variants.find((v) => v.isControl)
      return NextResponse.json({
        variantId: controlVariant?.id || experiment.variants[0].id,
        variantName: controlVariant?.name || experiment.variants[0].name,
        config: controlVariant?.config || experiment.variants[0].config,
        inExperiment: false,
      })
    }

    // Check for existing assignment
    const existingAssignment = await prisma.experimentAssignment.findFirst({
      where: {
        variant: {
          experimentId,
        },
        visitorId,
      },
      include: {
        variant: true,
      },
    })

    if (existingAssignment) {
      return NextResponse.json({
        variantId: existingAssignment.variant.id,
        variantName: existingAssignment.variant.name,
        config: existingAssignment.variant.config,
        inExperiment: true,
        assignmentId: existingAssignment.id,
      })
    }

    // Assign to a variant based on traffic weights
    const selectedVariant = selectVariantByWeight(experiment.variants, visitorId + experimentId)

    // Get IP and user agent from request
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown"
    const userAgent = request.headers.get("user-agent") || undefined

    // Create assignment
    const assignment = await prisma.experimentAssignment.create({
      data: {
        variantId: selectedVariant.id,
        visitorId,
        customerId,
        ipAddress,
        userAgent,
      },
    })

    // Update variant visitor count
    await prisma.experimentVariant.update({
      where: { id: selectedVariant.id },
      data: {
        visitors: { increment: 1 },
      },
    })

    return NextResponse.json({
      variantId: selectedVariant.id,
      variantName: selectedVariant.name,
      config: selectedVariant.config,
      inExperiment: true,
      assignmentId: assignment.id,
    })
  } catch (error) {
    console.error("Experiment assignment error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * Simple hash function for consistent assignment
 */
function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

/**
 * Select a variant based on traffic weights using weighted random selection
 * Uses a deterministic hash for consistent assignment
 */
function selectVariantByWeight(
  variants: Array<{ id: string; name: string; trafficWeight: number; config: unknown }>,
  seed: string
): { id: string; name: string; config: unknown } {
  // Sort variants by ID for consistent ordering
  const sortedVariants = [...variants].sort((a, b) => a.id.localeCompare(b.id))

  // Get a number between 0-99 based on the seed
  const hash = simpleHash(seed)
  const bucket = hash % 100

  // Find which variant this bucket falls into
  let cumulative = 0
  for (const variant of sortedVariants) {
    cumulative += variant.trafficWeight
    if (bucket < cumulative) {
      return variant
    }
  }

  // Fallback to last variant (shouldn't happen if weights sum to 100)
  return sortedVariants[sortedVariants.length - 1]
}
