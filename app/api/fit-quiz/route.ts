import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import type { FitFeedback, FitType } from "@prisma/client"

// Size recommendation algorithm
interface QuizAnswers {
  height?: number      // cm
  weight?: number      // kg
  bodyType?: "slim" | "athletic" | "average" | "curvy" | "plus"
  fitPreference?: FitType
  gender?: "MALE" | "FEMALE" | "UNISEX"
  age?: number
  chest?: number       // cm
  waist?: number       // cm
  hips?: number        // cm
}

interface SizeDefinition {
  size: string
  measurements: Record<string, number>
}

function calculateBMI(height: number, weight: number): number {
  const heightM = height / 100
  return weight / (heightM * heightM)
}

function recommendSize(
  answers: QuizAnswers,
  sizeChart: { sizes: SizeDefinition[]; fitType: FitType }
): string {
  const { sizes, fitType } = sizeChart

  if (sizes.length === 0) return "M" // Default

  // If we have body measurements, use those directly
  if (answers.chest || answers.waist || answers.hips) {
    // Find the best matching size based on measurements
    let bestMatch = sizes[0].size
    let bestScore = Infinity

    for (const sizeItem of sizes) {
      let score = 0
      let count = 0

      if (answers.chest && sizeItem.measurements.chest) {
        score += Math.abs(answers.chest - sizeItem.measurements.chest)
        count++
      }
      if (answers.waist && sizeItem.measurements.waist) {
        score += Math.abs(answers.waist - sizeItem.measurements.waist)
        count++
      }
      if (answers.hips && sizeItem.measurements.hips) {
        score += Math.abs(answers.hips - sizeItem.measurements.hips)
        count++
      }

      if (count > 0) {
        const avgScore = score / count
        if (avgScore < bestScore) {
          bestScore = avgScore
          bestMatch = sizeItem.size
        }
      }
    }

    // Adjust for fit preference
    const sizeIndex = sizes.findIndex(s => s.size === bestMatch)
    if (answers.fitPreference === "SLIM" && sizeIndex > 0) {
      return sizes[sizeIndex - 1].size
    }
    if ((answers.fitPreference === "RELAXED" || answers.fitPreference === "OVERSIZED") && sizeIndex < sizes.length - 1) {
      return sizes[sizeIndex + 1].size
    }

    return bestMatch
  }

  // Fall back to height/weight/body type based recommendation
  if (answers.height && answers.weight) {
    const bmi = calculateBMI(answers.height, answers.weight)

    // Basic size mapping based on BMI and height
    let baseSizeIndex: number

    if (bmi < 18.5) {
      baseSizeIndex = 0 // XS or S
    } else if (bmi < 23) {
      baseSizeIndex = Math.min(1, sizes.length - 1) // S or M
    } else if (bmi < 27) {
      baseSizeIndex = Math.min(2, sizes.length - 1) // M or L
    } else if (bmi < 32) {
      baseSizeIndex = Math.min(3, sizes.length - 1) // L or XL
    } else {
      baseSizeIndex = Math.min(4, sizes.length - 1) // XL+
    }

    // Adjust for height
    if (answers.height > 180 && baseSizeIndex < sizes.length - 1) {
      baseSizeIndex++
    } else if (answers.height < 160 && baseSizeIndex > 0) {
      baseSizeIndex--
    }

    // Adjust for body type
    if (answers.bodyType === "slim" && baseSizeIndex > 0) {
      baseSizeIndex--
    } else if (answers.bodyType === "curvy" || answers.bodyType === "plus") {
      if (baseSizeIndex < sizes.length - 1) baseSizeIndex++
    }

    // Adjust for fit preference
    if (answers.fitPreference === "SLIM" && baseSizeIndex > 0) {
      baseSizeIndex--
    } else if (answers.fitPreference === "RELAXED" && baseSizeIndex < sizes.length - 1) {
      baseSizeIndex++
    } else if (answers.fitPreference === "OVERSIZED" && baseSizeIndex < sizes.length - 1) {
      baseSizeIndex += 2
      baseSizeIndex = Math.min(baseSizeIndex, sizes.length - 1)
    }

    // Adjust based on chart's fit type
    if (fitType === "SLIM" && baseSizeIndex < sizes.length - 1) {
      baseSizeIndex++ // Size up for slim-fit items
    }

    return sizes[baseSizeIndex].size
  }

  // Default to middle size
  return sizes[Math.floor(sizes.length / 2)].size
}

// GET /api/fit-quiz - Get quiz history for a user
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const customerId = searchParams.get("customerId")
  const guestId = searchParams.get("guestId")
  const productId = searchParams.get("productId")

  if (!customerId && !guestId) {
    return NextResponse.json(
      { error: "Either customerId or guestId is required" },
      { status: 400 }
    )
  }

  try {
    const where: Parameters<typeof prisma.fitQuizResponse.findMany>[0]["where"] = {}

    if (customerId) where.customerId = customerId
    if (guestId) where.guestId = guestId
    if (productId) where.productId = productId

    const responses = await prisma.fitQuizResponse.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 10,
    })

    return NextResponse.json({
      responses: responses.map(r => ({
        ...r,
        answers: r.answers,
      })),
    })
  } catch (error) {
    console.error("Error fetching fit quiz responses:", error)
    return NextResponse.json(
      { error: "Failed to fetch fit quiz responses" },
      { status: 500 }
    )
  }
}

// POST /api/fit-quiz - Submit quiz answers and get recommendation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      customerId,
      guestId,
      productId,
      sizeChartId,
      answers,
    } = body

    if (!customerId && !guestId) {
      return NextResponse.json(
        { error: "Either customerId or guestId is required" },
        { status: 400 }
      )
    }

    if (!answers) {
      return NextResponse.json(
        { error: "Answers are required" },
        { status: 400 }
      )
    }

    // Get size chart
    let sizeChart = null
    if (sizeChartId) {
      sizeChart = await prisma.sizeChart.findUnique({
        where: { id: sizeChartId },
      })
    } else if (productId) {
      // Try product-specific chart first
      sizeChart = await prisma.sizeChart.findFirst({
        where: { productId, isActive: true },
      })
      // Fall back to category chart
      if (!sizeChart) {
        const product = await prisma.product.findUnique({
          where: { id: productId },
          select: { categoryId: true },
        })
        if (product?.categoryId) {
          sizeChart = await prisma.sizeChart.findFirst({
            where: { categoryId: product.categoryId, isActive: true },
          })
        }
      }
    }

    // Default size chart if none found
    const chartData = sizeChart || {
      sizes: [
        { size: "XS", measurements: { chest: 84, waist: 64, hips: 90 } },
        { size: "S", measurements: { chest: 88, waist: 68, hips: 94 } },
        { size: "M", measurements: { chest: 92, waist: 72, hips: 98 } },
        { size: "L", measurements: { chest: 96, waist: 76, hips: 102 } },
        { size: "XL", measurements: { chest: 100, waist: 80, hips: 106 } },
        { size: "XXL", measurements: { chest: 104, waist: 84, hips: 110 } },
      ],
      fitType: "REGULAR" as FitType,
    }

    // Calculate recommended size
    const recommendedSize = recommendSize(
      answers as QuizAnswers,
      {
        sizes: chartData.sizes as SizeDefinition[],
        fitType: chartData.fitType,
      }
    )

    // Save quiz response
    const quizResponse = await prisma.fitQuizResponse.create({
      data: {
        customerId,
        guestId,
        productId,
        sizeChartId: sizeChart?.id,
        answers,
        recommendedSize,
      },
    })

    // Optionally update size profile with measurements
    if (answers.height || answers.weight || answers.chest || answers.waist || answers.hips) {
      const profileWhere = customerId ? { customerId } : { guestId }
      const existingProfile = await prisma.sizeProfile.findFirst({ where: profileWhere })

      const profileData: Parameters<typeof prisma.sizeProfile.create>[0]["data"] = {
        customerId,
        guestId,
        ...(answers.height && { height: answers.height }),
        ...(answers.weight && { weight: answers.weight }),
        ...(answers.chest && { chest: answers.chest }),
        ...(answers.waist && { waist: answers.waist }),
        ...(answers.hips && { hips: answers.hips }),
        ...(answers.gender && { gender: answers.gender }),
        ...(answers.age && { age: answers.age }),
        ...(answers.fitPreference && { preferredFit: answers.fitPreference }),
      }

      if (existingProfile) {
        await prisma.sizeProfile.update({
          where: { id: existingProfile.id },
          data: profileData,
        })
      } else {
        await prisma.sizeProfile.create({
          data: profileData,
        })
      }
    }

    return NextResponse.json({
      recommendedSize,
      quizResponseId: quizResponse.id,
      sizeChartUsed: sizeChart?.id || null,
    }, { status: 201 })
  } catch (error) {
    console.error("Error processing fit quiz:", error)
    return NextResponse.json(
      { error: "Failed to process fit quiz" },
      { status: 500 }
    )
  }
}

// PATCH /api/fit-quiz - Submit feedback on fit
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      quizResponseId,
      purchasedSize,
      fitFeedback,
    } = body

    if (!quizResponseId) {
      return NextResponse.json(
        { error: "Quiz response ID is required" },
        { status: 400 }
      )
    }

    // Validate fit feedback if provided
    if (fitFeedback) {
      const validFeedback: FitFeedback[] = ["TOO_SMALL", "SLIGHTLY_SMALL", "PERFECT", "SLIGHTLY_LARGE", "TOO_LARGE"]
      if (!validFeedback.includes(fitFeedback)) {
        return NextResponse.json(
          { error: `Invalid fit feedback. Must be one of: ${validFeedback.join(", ")}` },
          { status: 400 }
        )
      }
    }

    const response = await prisma.fitQuizResponse.update({
      where: { id: quizResponseId },
      data: {
        ...(purchasedSize && { purchasedSize }),
        ...(fitFeedback && { fitFeedback }),
      },
    })

    return NextResponse.json({
      message: "Feedback saved successfully",
      response,
    })
  } catch (error) {
    console.error("Error saving fit feedback:", error)
    return NextResponse.json(
      { error: "Failed to save fit feedback" },
      { status: 500 }
    )
  }
}
