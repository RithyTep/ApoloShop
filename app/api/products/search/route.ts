import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/products/search - Search products by name and description
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")?.trim() || ""
    const limit = parseInt(searchParams.get("limit") || "10")

    // Handle empty query gracefully
    if (!query) {
      return NextResponse.json({
        products: [],
        query: "",
        total: 0,
      })
    }

    // Search in nameEn, nameKh, descriptionEn, descriptionKh fields
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { nameEn: { contains: query, mode: "insensitive" } },
          { nameKh: { contains: query, mode: "insensitive" } },
          { descriptionEn: { contains: query, mode: "insensitive" } },
          { descriptionKh: { contains: query, mode: "insensitive" } },
        ],
      },
      include: {
        category: {
          select: {
            id: true,
            nameEn: true,
            nameKh: true,
            slug: true,
          },
        },
      },
      take: limit,
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      products,
      query,
      total: products.length,
    })
  } catch (error) {
    console.error("Search products error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
