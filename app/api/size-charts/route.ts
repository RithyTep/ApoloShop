import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import type { SizeChartType, MeasurementUnit, FitType } from "@prisma/client"

// GET /api/size-charts - List size charts or get chart for a product/category
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const productId = searchParams.get("productId")
  const categoryId = searchParams.get("categoryId")
  const chartType = searchParams.get("chartType") as SizeChartType | null
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "20")
  const skip = (page - 1) * limit

  try {
    // If productId or categoryId provided, get specific chart
    if (productId || categoryId) {
      // First try to find product-specific chart
      if (productId) {
        const productChart = await prisma.sizeChart.findFirst({
          where: { productId, isActive: true },
        })
        if (productChart) {
          return NextResponse.json({
            sizeChart: {
              ...productChart,
              sizes: productChart.sizes,
              measurementTypes: productChart.measurementTypes,
            },
          })
        }
      }

      // Fall back to category chart
      if (categoryId || productId) {
        let catId = categoryId
        // If we have productId but no productChart, get product's category
        if (!catId && productId) {
          const product = await prisma.product.findUnique({
            where: { id: productId },
            select: { categoryId: true },
          })
          catId = product?.categoryId || null
        }

        if (catId) {
          const categoryChart = await prisma.sizeChart.findFirst({
            where: { categoryId: catId, isActive: true },
          })
          if (categoryChart) {
            return NextResponse.json({
              sizeChart: {
                ...categoryChart,
                sizes: categoryChart.sizes,
                measurementTypes: categoryChart.measurementTypes,
              },
            })
          }
        }
      }

      // No chart found for product/category
      return NextResponse.json({ sizeChart: null })
    }

    // Admin: List all size charts with pagination
    const where: Parameters<typeof prisma.sizeChart.findMany>[0]["where"] = {}

    if (chartType) {
      where.chartType = chartType
    }

    const [sizeCharts, total] = await Promise.all([
      prisma.sizeChart.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.sizeChart.count({ where }),
    ])

    return NextResponse.json({
      sizeCharts: sizeCharts.map((chart) => ({
        ...chart,
        sizes: chart.sizes,
        measurementTypes: chart.measurementTypes,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching size charts:", error)
    return NextResponse.json(
      { error: "Failed to fetch size charts" },
      { status: 500 }
    )
  }
}

// POST /api/size-charts - Create a new size chart (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      nameEn,
      nameKh,
      brandEn,
      brandKh,
      chartType = "CLOTHING" as SizeChartType,
      unit = "CM" as MeasurementUnit,
      sizes,
      measurementTypes,
      measurementGuideImage,
      fitType = "REGULAR" as FitType,
      categoryId,
      productId,
      isActive = true,
    } = body

    // Validate required fields
    if (!nameEn || !nameKh || !sizes || !measurementTypes) {
      return NextResponse.json(
        { error: "Missing required fields: nameEn, nameKh, sizes, measurementTypes" },
        { status: 400 }
      )
    }

    // Validate sizes array
    if (!Array.isArray(sizes) || sizes.length === 0) {
      return NextResponse.json(
        { error: "Sizes must be a non-empty array" },
        { status: 400 }
      )
    }

    // Validate measurementTypes array
    if (!Array.isArray(measurementTypes) || measurementTypes.length === 0) {
      return NextResponse.json(
        { error: "Measurement types must be a non-empty array" },
        { status: 400 }
      )
    }

    // Validate chart type
    const validChartTypes: SizeChartType[] = ["CLOTHING", "SHOES", "ACCESSORIES", "JEWELRY", "KIDS"]
    if (!validChartTypes.includes(chartType)) {
      return NextResponse.json(
        { error: `Invalid chart type. Must be one of: ${validChartTypes.join(", ")}` },
        { status: 400 }
      )
    }

    const sizeChart = await prisma.sizeChart.create({
      data: {
        nameEn,
        nameKh,
        brandEn,
        brandKh,
        chartType,
        unit,
        sizes,
        measurementTypes,
        measurementGuideImage,
        fitType,
        categoryId,
        productId,
        isActive,
      },
    })

    return NextResponse.json({
      message: "Size chart created successfully",
      sizeChart: {
        ...sizeChart,
        sizes: sizeChart.sizes,
        measurementTypes: sizeChart.measurementTypes,
      },
    }, { status: 201 })
  } catch (error) {
    console.error("Error creating size chart:", error)
    return NextResponse.json(
      { error: "Failed to create size chart" },
      { status: 500 }
    )
  }
}

// PUT /api/size-charts - Update a size chart (admin only)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: "Size chart ID is required" },
        { status: 400 }
      )
    }

    // Check if size chart exists
    const existing = await prisma.sizeChart.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Size chart not found" },
        { status: 404 }
      )
    }

    const sizeChart = await prisma.sizeChart.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      message: "Size chart updated successfully",
      sizeChart: {
        ...sizeChart,
        sizes: sizeChart.sizes,
        measurementTypes: sizeChart.measurementTypes,
      },
    })
  } catch (error) {
    console.error("Error updating size chart:", error)
    return NextResponse.json(
      { error: "Failed to update size chart" },
      { status: 500 }
    )
  }
}

// DELETE /api/size-charts - Delete a size chart (admin only)
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json(
      { error: "Size chart ID is required" },
      { status: 400 }
    )
  }

  try {
    await prisma.sizeChart.delete({
      where: { id },
    })

    return NextResponse.json({
      message: "Size chart deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting size chart:", error)
    return NextResponse.json(
      { error: "Failed to delete size chart" },
      { status: 500 }
    )
  }
}
