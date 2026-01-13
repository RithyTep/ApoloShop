import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  calculateSignificance,
  formatSignificanceResult,
  calculateRequiredSampleSize,
} from "@/lib/ab-testing"

// GET /api/experiments/stats?id=xxx - Get detailed statistics for an experiment
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Experiment ID is required" }, { status: 400 })
    }

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

    // Calculate overall stats
    const totalVisitors = experiment.variants.reduce((sum, v) => sum + v.visitors, 0)
    const totalConversions = experiment.variants.reduce((sum, v) => sum + v.conversions, 0)
    const totalRevenue = experiment.variants.reduce((sum, v) => sum + Number(v.revenue), 0)

    // Get control variant
    const control = experiment.variants.find((v) => v.isControl)
    const treatmentVariants = experiment.variants.filter((v) => !v.isControl)

    // Calculate significance for each treatment vs control
    const variantStats = experiment.variants.map((variant) => {
      let significance = null
      let formatted = null

      if (control && !variant.isControl) {
        significance = calculateSignificance(
          { visitors: control.visitors, conversions: control.conversions },
          { visitors: variant.visitors, conversions: variant.conversions },
          experiment.confidenceLevel
        )
        formatted = formatSignificanceResult(significance)
      }

      return {
        id: variant.id,
        name: variant.name,
        isControl: variant.isControl,
        trafficWeight: variant.trafficWeight,
        visitors: variant.visitors,
        conversions: variant.conversions,
        revenue: Number(variant.revenue),
        conversionRate: Number(variant.conversionRate),
        avgOrderValue: Number(variant.avgOrderValue),
        config: variant.config,
        significance: significance
          ? {
              zScore: significance.zScore,
              pValue: significance.pValue,
              confidence: significance.confidence,
              isSignificant: significance.isSignificant,
              treatmentBetter: significance.treatmentBetter,
              relativeImprovement: significance.relativeImprovement,
              marginOfError: significance.marginOfError,
            }
          : null,
        formatted,
      }
    })

    // Calculate required sample size for 10% MDE
    const controlRate = control && control.visitors > 0
      ? control.conversions / control.visitors
      : 0.05 // Default 5% baseline if no data

    const requiredSampleSize = calculateRequiredSampleSize(
      controlRate > 0 ? controlRate : 0.05,
      0.1, // 10% minimum detectable effect
      0.8, // 80% power
      1 - experiment.confidenceLevel / 100 // Convert confidence to alpha
    )

    // Calculate experiment duration
    const startedAt = experiment.startedAt || experiment.createdAt
    const endedAt = experiment.endedAt || new Date()
    const durationMs = endedAt.getTime() - startedAt.getTime()
    const durationDays = Math.floor(durationMs / (1000 * 60 * 60 * 24))
    const durationHours = Math.floor((durationMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    // Determine winner
    let winner = null
    if (experiment.winningVariantId) {
      winner = experiment.variants.find((v) => v.id === experiment.winningVariantId)
    } else if (treatmentVariants.length > 0 && control) {
      // Check if any treatment is significantly better
      for (const treatment of treatmentVariants) {
        const result = calculateSignificance(
          { visitors: control.visitors, conversions: control.conversions },
          { visitors: treatment.visitors, conversions: treatment.conversions },
          experiment.confidenceLevel
        )
        if (result.isSignificant) {
          winner = result.treatmentBetter ? treatment : control
          break
        }
      }
    }

    // Progress towards minimum sample size
    const minSamplesReached = experiment.variants.every(
      (v) => v.visitors >= experiment.minSampleSize
    )
    const lowestVisitorCount = Math.min(...experiment.variants.map((v) => v.visitors))
    const sampleProgress = Math.min(100, (lowestVisitorCount / experiment.minSampleSize) * 100)

    return NextResponse.json({
      experiment: {
        id: experiment.id,
        name: experiment.name,
        description: experiment.description,
        type: experiment.type,
        status: experiment.status,
        goalType: experiment.goalType,
        goalDescription: experiment.goalDescription,
        confidenceLevel: experiment.confidenceLevel,
        minSampleSize: experiment.minSampleSize,
        trafficPercent: experiment.trafficPercent,
        autoEndEnabled: experiment.autoEndEnabled,
        autoEndOnSignificance: experiment.autoEndOnSignificance,
        startedAt: experiment.startedAt,
        endedAt: experiment.endedAt,
        createdAt: experiment.createdAt,
      },
      summary: {
        totalVisitors,
        totalConversions,
        totalRevenue,
        overallConversionRate: totalVisitors > 0 ? totalConversions / totalVisitors : 0,
        duration: {
          days: durationDays,
          hours: durationHours,
          formatted: `${durationDays}d ${durationHours}h`,
        },
        sampleProgress: Math.round(sampleProgress),
        minSamplesReached,
        requiredSampleSize,
      },
      variants: variantStats,
      winner: winner
        ? {
            id: winner.id,
            name: winner.name,
            isControl: winner.isControl,
            conversionRate: Number(winner.conversionRate),
          }
        : null,
      isSignificant: experiment.isSignificant,
    })
  } catch (error) {
    console.error("Get experiment stats error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
