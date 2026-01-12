import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/products/export - Export products to CSV
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get("categoryId")
    const isActive = searchParams.get("isActive")

    // Build filter
    const where: Record<string, unknown> = {}
    if (categoryId) where.categoryId = categoryId
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === "true"
    }

    // Fetch all products with related data
    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        inventory: true,
      },
      orderBy: { createdAt: "desc" },
    })

    // Define CSV headers
    const headers = [
      "sku",
      "nameEn",
      "nameKh",
      "descriptionEn",
      "descriptionKh",
      "priceUsd",
      "priceKhr",
      "categorySlug",
      "categoryNameEn",
      "stock",
      "minStockLevel",
      "imageUrl",
      "images",
      "isActive",
      "createdAt",
    ]

    // Helper to escape CSV values
    const escapeCSV = (value: string | null | undefined): string => {
      if (value === null || value === undefined) return ""
      const str = String(value)
      // If contains comma, newline, or quote, wrap in quotes and escape existing quotes
      if (str.includes(",") || str.includes("\n") || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    // Generate CSV rows
    const csvRows = [headers.join(",")]

    for (const product of products) {
      const row = [
        escapeCSV(product.sku),
        escapeCSV(product.nameEn),
        escapeCSV(product.nameKh),
        escapeCSV(product.descriptionEn),
        escapeCSV(product.descriptionKh),
        escapeCSV(String(product.priceUsd)),
        escapeCSV(String(product.priceKhr)),
        escapeCSV(product.category?.slug),
        escapeCSV(product.category?.nameEn),
        escapeCSV(String(product.inventory?.quantity ?? 0)),
        escapeCSV(String(product.inventory?.minLevel ?? 10)),
        escapeCSV(product.imageUrl),
        escapeCSV(
          product.images ? JSON.stringify(product.images) : ""
        ),
        escapeCSV(String(product.isActive)),
        escapeCSV(product.createdAt.toISOString()),
      ]
      csvRows.push(row.join(","))
    }

    const csv = csvRows.join("\n")

    // Return CSV with appropriate headers
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="products-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error("Export products error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
