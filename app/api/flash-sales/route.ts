import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import type { FlashSaleStatus } from "@prisma/client"

const KHR_RATE = 4000 // 1 USD = 4000 KHR

// GET /api/flash-sales - List flash sales or get active ones for customers
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const active = searchParams.get("active") === "true"
  const featured = searchParams.get("featured") === "true"
  const productId = searchParams.get("productId")
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "20")
  const skip = (page - 1) * limit

  try {
    const now = new Date()
    const where: Parameters<typeof prisma.flashSale.findMany>[0]["where"] = {}

    // Filter for currently active flash sales (for customer-facing pages)
    if (active) {
      where.status = "ACTIVE"
      where.startTime = { lte: now }
      where.endTime = { gt: now }
      // Exclude sold out flash sales
      where.OR = [
        { quantity: null }, // Unlimited quantity
        { soldCount: { lt: prisma.flashSale.fields.quantity } }, // Not sold out
      ]
    }

    // Filter for featured sales (homepage banner)
    if (featured) {
      where.isFeatured = true
      // Only show active featured sales
      if (!active) {
        where.status = "ACTIVE"
        where.startTime = { lte: now }
        where.endTime = { gt: now }
      }
    }

    // Filter by product
    if (productId) {
      where.productId = productId
    }

    const [flashSales, total] = await Promise.all([
      prisma.flashSale.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { startTime: "asc" },
          { createdAt: "desc" },
        ],
      }),
      prisma.flashSale.count({ where }),
    ])

    // Get product details for flash sales
    const productIds = [...new Set(flashSales.map((fs) => fs.productId))]
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        category: true,
        inventory: true,
      },
    })

    const productMap = new Map(products.map((p) => [p.id, p]))

    return NextResponse.json({
      flashSales: flashSales.map((fs) => {
        const product = productMap.get(fs.productId)
        return {
          ...fs,
          salePriceUsd: Number(fs.salePriceUsd),
          salePriceKhr: fs.salePriceKhr,
          remainingQuantity: fs.quantity ? Math.max(0, fs.quantity - fs.soldCount) : null,
          product: product
            ? {
                id: product.id,
                nameEn: product.nameEn,
                nameKh: product.nameKh,
                descriptionEn: product.descriptionEn,
                descriptionKh: product.descriptionKh,
                priceUsd: Number(product.priceUsd),
                priceKhr: product.priceKhr,
                imageUrl: product.imageUrl,
                images: product.images,
                category: product.category,
                inventory: product.inventory,
                isActive: product.isActive,
              }
            : null,
        }
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching flash sales:", error)
    return NextResponse.json(
      { error: "Failed to fetch flash sales" },
      { status: 500 }
    )
  }
}

// POST /api/flash-sales - Create a new flash sale (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      productId,
      salePriceUsd,
      startTime,
      endTime,
      quantity,
      nameEn,
      nameKh,
      descriptionEn,
      descriptionKh,
      isFeatured = false,
      bannerImageUrl,
      createdBy,
    } = body

    // Validate required fields
    if (!productId || salePriceUsd === undefined || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Missing required fields: productId, salePriceUsd, startTime, endTime" },
        { status: 400 }
      )
    }

    // Validate dates
    const start = new Date(startTime)
    const end = new Date(endTime)
    if (end <= start) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 }
      )
    }

    // Validate price
    if (salePriceUsd < 0) {
      return NextResponse.json(
        { error: "Sale price must be non-negative" },
        { status: 400 }
      )
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      )
    }

    // Warn if sale price is higher than regular price
    if (Number(salePriceUsd) >= Number(product.priceUsd)) {
      return NextResponse.json(
        { error: "Sale price should be lower than regular price" },
        { status: 400 }
      )
    }

    // Check for overlapping flash sales on the same product
    const overlapping = await prisma.flashSale.findFirst({
      where: {
        productId,
        status: { in: ["SCHEDULED", "ACTIVE"] },
        OR: [
          // New sale starts during existing sale
          {
            startTime: { lte: start },
            endTime: { gt: start },
          },
          // New sale ends during existing sale
          {
            startTime: { lt: end },
            endTime: { gte: end },
          },
          // New sale completely contains existing sale
          {
            startTime: { gte: start },
            endTime: { lte: end },
          },
        ],
      },
    })

    if (overlapping) {
      return NextResponse.json(
        { error: "A flash sale already exists for this product during the specified time period" },
        { status: 409 }
      )
    }

    // Calculate KHR price
    const salePriceKhr = Math.round(Number(salePriceUsd) * KHR_RATE)

    // Determine initial status based on start time
    const now = new Date()
    let status: FlashSaleStatus = "SCHEDULED"
    if (start <= now && end > now) {
      status = "ACTIVE"
    } else if (end <= now) {
      status = "ENDED"
    }

    const flashSale = await prisma.flashSale.create({
      data: {
        productId,
        salePriceUsd,
        salePriceKhr,
        startTime: start,
        endTime: end,
        quantity: quantity || null,
        status,
        nameEn: nameEn || null,
        nameKh: nameKh || null,
        descriptionEn: descriptionEn || null,
        descriptionKh: descriptionKh || null,
        isFeatured,
        bannerImageUrl: bannerImageUrl || null,
        createdBy: createdBy || null,
      },
    })

    return NextResponse.json(
      {
        message: "Flash sale created successfully",
        flashSale: {
          ...flashSale,
          salePriceUsd: Number(flashSale.salePriceUsd),
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating flash sale:", error)
    return NextResponse.json(
      { error: "Failed to create flash sale" },
      { status: 500 }
    )
  }
}

// PUT /api/flash-sales - Update a flash sale (admin only)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { error: "Flash sale ID is required" },
        { status: 400 }
      )
    }

    const existing = await prisma.flashSale.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Flash sale not found" },
        { status: 404 }
      )
    }

    // Build update data
    const updateData: Parameters<typeof prisma.flashSale.update>[0]["data"] = {}

    if (updates.salePriceUsd !== undefined) {
      updateData.salePriceUsd = updates.salePriceUsd
      updateData.salePriceKhr = Math.round(Number(updates.salePriceUsd) * KHR_RATE)
    }

    if (updates.startTime !== undefined) {
      updateData.startTime = new Date(updates.startTime)
    }

    if (updates.endTime !== undefined) {
      updateData.endTime = new Date(updates.endTime)
    }

    if (updates.quantity !== undefined) {
      updateData.quantity = updates.quantity
    }

    if (updates.nameEn !== undefined) {
      updateData.nameEn = updates.nameEn
    }

    if (updates.nameKh !== undefined) {
      updateData.nameKh = updates.nameKh
    }

    if (updates.descriptionEn !== undefined) {
      updateData.descriptionEn = updates.descriptionEn
    }

    if (updates.descriptionKh !== undefined) {
      updateData.descriptionKh = updates.descriptionKh
    }

    if (updates.isFeatured !== undefined) {
      updateData.isFeatured = updates.isFeatured
    }

    if (updates.bannerImageUrl !== undefined) {
      updateData.bannerImageUrl = updates.bannerImageUrl
    }

    if (updates.status !== undefined) {
      updateData.status = updates.status
    }

    const flashSale = await prisma.flashSale.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      message: "Flash sale updated successfully",
      flashSale: {
        ...flashSale,
        salePriceUsd: Number(flashSale.salePriceUsd),
      },
    })
  } catch (error) {
    console.error("Error updating flash sale:", error)
    return NextResponse.json(
      { error: "Failed to update flash sale" },
      { status: 500 }
    )
  }
}

// DELETE /api/flash-sales - Delete or cancel a flash sale (admin only)
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get("id")
  const cancel = searchParams.get("cancel") === "true"

  if (!id) {
    return NextResponse.json(
      { error: "Flash sale ID is required" },
      { status: 400 }
    )
  }

  try {
    const existing = await prisma.flashSale.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Flash sale not found" },
        { status: 404 }
      )
    }

    // If cancel=true, just update status to CANCELLED (preserves data for analytics)
    if (cancel) {
      const flashSale = await prisma.flashSale.update({
        where: { id },
        data: { status: "CANCELLED" },
      })

      return NextResponse.json({
        message: "Flash sale cancelled successfully",
        flashSale: {
          ...flashSale,
          salePriceUsd: Number(flashSale.salePriceUsd),
        },
      })
    }

    // Hard delete
    await prisma.flashSale.delete({
      where: { id },
    })

    return NextResponse.json({
      message: "Flash sale deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting flash sale:", error)
    return NextResponse.json(
      { error: "Failed to delete flash sale" },
      { status: 500 }
    )
  }
}
