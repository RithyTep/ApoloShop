import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { ExperimentStatus, Prisma } from "@prisma/client"
import { calculateSignificance, shouldAutoEnd } from "@/lib/ab-testing"

// Schema for recording a conversion
const convertSchema = z.object({
  assignmentId: z.string().optional(),
  experimentId: z.string().optional(),
  visitorId: z.string().optional(),
  conversionValue: z.number().optional(), // For revenue-based goals
  orderId: z.string().optional(),
})

// POST /api/experiments/convert - Record a conversion
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const result = convertSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { assignmentId, experimentId, visitorId, conversionValue, orderId } = result.data

    // Need either assignmentId or (experimentId + visitorId)
    if (!assignmentId && (!experimentId || !visitorId)) {
      return NextResponse.json(
        { error: "Provide either assignmentId or both experimentId and visitorId" },
        { status: 400 }
      )
    }

    // Find the assignment
    let assignment
    if (assignmentId) {
      assignment = await prisma.experimentAssignment.findUnique({
        where: { id: assignmentId },
        include: {
          variant: {
            include: {
              experiment: true,
            },
          },
        },
      })
    } else {
      assignment = await prisma.experimentAssignment.findFirst({
        where: {
          visitorId,
          variant: {
            experimentId,
          },
        },
        include: {
          variant: {
            include: {
              experiment: true,
            },
          },
        },
      })
    }

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    }

    // Check if experiment is still running
    if (assignment.variant.experiment.status !== ExperimentStatus.RUNNING) {
      return NextResponse.json(
        { error: "Experiment is not running", converted: false },
        { status: 400 }
      )
    }

    // Check if already converted
    if (assignment.converted) {
      return NextResponse.json({
        success: true,
        alreadyConverted: true,
        assignmentId: assignment.id,
      })
    }

    // Update assignment as converted
    await prisma.experimentAssignment.update({
      where: { id: assignment.id },
      data: {
        converted: true,
        convertedAt: new Date(),
        conversionValue: conversionValue ? new Prisma.Decimal(conversionValue) : null,
        orderId,
      },
    })

    // Update variant metrics
    await prisma.experimentVariant.update({
      where: { id: assignment.variant.id },
      data: {
        conversions: { increment: 1 },
        revenue: conversionValue ? { increment: conversionValue } : undefined,
      },
    })

    // Recalculate conversion rate for all variants
    await updateVariantMetrics(assignment.variant.experimentId)

    // Check for statistical significance and auto-end
    await checkAndAutoEndExperiment(assignment.variant.experimentId)

    return NextResponse.json({
      success: true,
      converted: true,
      assignmentId: assignment.id,
    })
  } catch (error) {
    console.error("Conversion tracking error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * Update calculated metrics for all variants in an experiment
 */
async function updateVariantMetrics(experimentId: string): Promise<void> {
  const variants = await prisma.experimentVariant.findMany({
    where: { experimentId },
  })

  for (const variant of variants) {
    const conversionRate =
      variant.visitors > 0 ? variant.conversions / variant.visitors : 0

    const avgOrderValue =
      variant.conversions > 0
        ? Number(variant.revenue) / variant.conversions
        : 0

    await prisma.experimentVariant.update({
      where: { id: variant.id },
      data: {
        conversionRate: new Prisma.Decimal(conversionRate.toFixed(4)),
        avgOrderValue: new Prisma.Decimal(avgOrderValue.toFixed(2)),
      },
    })
  }
}

/**
 * Check if experiment should auto-end based on statistical significance
 */
async function checkAndAutoEndExperiment(experimentId: string): Promise<void> {
  const experiment = await prisma.experiment.findUnique({
    where: { id: experimentId },
    include: {
      variants: true,
    },
  })

  if (!experiment || !experiment.autoEndEnabled || !experiment.autoEndOnSignificance) {
    return
  }

  // Check if we have enough data
  const hasMinSample = experiment.variants.every(
    (v) => v.visitors >= experiment.minSampleSize
  )

  if (!hasMinSample) {
    return
  }

  // Calculate statistical significance
  const control = experiment.variants.find((v) => v.isControl)
  const treatmentVariants = experiment.variants.filter((v) => !v.isControl)

  if (!control || treatmentVariants.length === 0) {
    return
  }

  // Check each treatment variant against control
  for (const treatment of treatmentVariants) {
    const result = calculateSignificance(
      {
        visitors: control.visitors,
        conversions: control.conversions,
      },
      {
        visitors: treatment.visitors,
        conversions: treatment.conversions,
      },
      experiment.confidenceLevel
    )

    if (shouldAutoEnd(result, experiment.confidenceLevel)) {
      // End the experiment
      const winningVariantId = result.treatmentBetter ? treatment.id : control.id

      await prisma.experiment.update({
        where: { id: experimentId },
        data: {
          status: ExperimentStatus.COMPLETED,
          endedAt: new Date(),
          isSignificant: true,
          winningVariantId,
        },
      })

      console.log(
        `Experiment ${experimentId} auto-ended. Winner: ${winningVariantId}, ` +
        `p-value: ${result.pValue.toFixed(4)}, confidence: ${result.confidence.toFixed(1)}%`
      )

      return // Exit after ending
    }
  }
}
