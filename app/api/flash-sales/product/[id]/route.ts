import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

// GET /api/flash-sales/product/[id] - Get active flash sale for a specific product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: productId } = await params

  try {
    const now = new Date()

    // Find active flash sale for this product
    const flashSale = await prisma.flashSale.findFirst({
      where: {
        productId,
        status: "ACTIVE",
        startTime: { lte: now },
        endTime: { gt: now },
        // Not sold out
        OR: [
          { quantity: null },
          { soldCount: { lt: prisma.flashSale.fields.quantity } },
        ],
      },
      include: {
      },
    })

    if (!flashSale) {
      return NextResponse.json({
        hasFlashSale: false,
        flashSale: null,
      })
    }

    // Get product details
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        priceUsd: true,
        priceKhr: true,
      },
    })

    const remainingQuantity = flashSale.quantity
      ? Math.max(0, flashSale.quantity - flashSale.soldCount)
      : null

    const discount = product
      ? {
          amountUsd: Number(product.priceUsd) - Number(flashSale.salePriceUsd),
          amountKhr: product.priceKhr - flashSale.salePriceKhr,
          percentage: Math.round(
            ((Number(product.priceUsd) - Number(flashSale.salePriceUsd)) /
              Number(product.priceUsd)) *
              100
          ),
        }
      : null

    return NextResponse.json({
      hasFlashSale: true,
      flashSale: {
        id: flashSale.id,
        salePriceUsd: Number(flashSale.salePriceUsd),
        salePriceKhr: flashSale.salePriceKhr,
        startTime: flashSale.startTime,
        endTime: flashSale.endTime,
        quantity: flashSale.quantity,
        soldCount: flashSale.soldCount,
        remainingQuantity,
        nameEn: flashSale.nameEn,
        nameKh: flashSale.nameKh,
        isFeatured: flashSale.isFeatured,
        discount,
      },
    })
  } catch (error) {
    console.error("Error fetching flash sale for product:", error)
    return NextResponse.json(
      { error: "Failed to fetch flash sale" },
      { status: 500 }
    )
  }
}
