import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { generateSKU, generateSKUPreview, searchBySKU, validateSKU, validateBarcode } from "@/lib/sku-barcode"

/**
 * GET /api/sku
 * Search products by SKU or barcode
 * Query params: q (search term), exact (boolean)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q") || ""
    const exact = searchParams.get("exact") === "true"
    const limit = parseInt(searchParams.get("limit") || "10", 10)

    if (!query) {
      return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 })
    }

    // Check if it's a barcode search
    const barcodeInfo = validateBarcode(query)
    let searchTerm = query

    // If it's a valid EAN barcode, search both as-is and extracted SKU
    if (barcodeInfo.format === 'EAN13' || barcodeInfo.format === 'UPC') {
      // Search by barcode value directly first
      const results = await searchBySKU(searchTerm, { exact, limit })

      if (results.length > 0) {
        return NextResponse.json({
          results,
          searchType: 'barcode',
          barcodeInfo,
        })
      }
    }

    // Standard SKU search
    const results = await searchBySKU(searchTerm, { exact, limit })

    return NextResponse.json({
      results,
      searchType: 'sku',
    })
  } catch (error) {
    console.error("SKU search error:", error)
    return NextResponse.json(
      { error: "Failed to search SKU" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/sku
 * Generate a new SKU for a product
 * Body: { categoryId, productName, preview? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { categoryId, productName, preview = false } = body

    if (!categoryId || !productName) {
      return NextResponse.json(
        { error: "categoryId and productName are required" },
        { status: 400 }
      )
    }

    // Get category slug for SKU generation
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { slug: true, nameEn: true },
    })

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      )
    }

    if (preview) {
      // Return preview SKU without checking database for uniqueness
      const skuPreview = generateSKUPreview(category.slug, productName)
      return NextResponse.json({
        sku: skuPreview,
        isPreview: true,
        category: category.nameEn,
      })
    }

    // Generate unique SKU
    const sku = await generateSKU(category.slug, productName)
    const validation = validateSKU(sku)

    return NextResponse.json({
      sku,
      isPreview: false,
      category: category.nameEn,
      validation,
    })
  } catch (error) {
    console.error("SKU generation error:", error)
    return NextResponse.json(
      { error: "Failed to generate SKU" },
      { status: 500 }
    )
  }
}
