import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

// Validation schema for imported product row
const importRowSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  nameEn: z.string().min(1, "English name is required"),
  nameKh: z.string().min(1, "Khmer name is required"),
  descriptionEn: z.string().optional().nullable(),
  descriptionKh: z.string().optional().nullable(),
  priceUsd: z.number().positive("Price USD must be positive"),
  priceKhr: z.number().int().positive("Price KHR must be positive"),
  categorySlug: z.string().min(1, "Category slug is required"),
  stock: z.number().int().min(0, "Stock cannot be negative").optional().default(0),
  minStockLevel: z.number().int().min(0).optional().default(10),
  imageUrl: z.string().url().optional().nullable(),
  images: z.array(z.string().url()).optional().nullable(),
  isActive: z.boolean().optional().default(true),
})

type ImportRow = z.infer<typeof importRowSchema>

interface RowError {
  row: number
  field?: string
  message: string
  data?: Record<string, unknown>
}

interface ImportResult {
  success: boolean
  totalRows: number
  imported: number
  updated: number
  skipped: number
  failed: number
  errors: RowError[]
  importedProducts: { sku: string; id: string; action: "created" | "updated" }[]
}

// Parse CSV string into rows
function parseCSV(csvContent: string): Record<string, string>[] {
  const lines = csvContent.split(/\r?\n/).filter((line) => line.trim())
  if (lines.length < 2) return []

  // Parse header
  const headers = parseCSVLine(lines[0])

  // Parse data rows
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length === 0) continue

    const row: Record<string, string> = {}
    headers.forEach((header, idx) => {
      row[header.trim()] = values[idx]?.trim() ?? ""
    })
    rows.push(row)
  }

  return rows
}

// Parse a single CSV line handling quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          current += '"'
          i++
        } else {
          // End of quoted field
          inQuotes = false
        }
      } else {
        current += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ",") {
        result.push(current)
        current = ""
      } else {
        current += char
      }
    }
  }

  result.push(current)
  return result
}

// Sanitize string to prevent XSS
function sanitizeString(value: string | null | undefined): string | null {
  if (!value) return null
  return value
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
}

// Convert raw row to typed row
function convertRow(rawRow: Record<string, string>, rowIndex: number): { data?: ImportRow; errors: RowError[] } {
  const errors: RowError[] = []

  // Parse numeric fields
  const priceUsd = parseFloat(rawRow.priceUsd || "0")
  const priceKhr = parseInt(rawRow.priceKhr || "0", 10)
  const stock = parseInt(rawRow.stock || "0", 10)
  const minStockLevel = parseInt(rawRow.minStockLevel || "10", 10)

  // Parse boolean
  const isActiveStr = (rawRow.isActive || "true").toLowerCase()
  const isActive = isActiveStr === "true" || isActiveStr === "1" || isActiveStr === "yes"

  // Parse images array
  let images: string[] | null = null
  if (rawRow.images) {
    try {
      const parsed = JSON.parse(rawRow.images)
      if (Array.isArray(parsed)) {
        images = parsed.filter((url) => typeof url === "string" && url.trim())
      }
    } catch {
      // If not valid JSON, try comma-separated
      images = rawRow.images.split(";").filter((url) => url.trim())
    }
  }

  const rowData = {
    sku: rawRow.sku || "",
    nameEn: sanitizeString(rawRow.nameEn) || "",
    nameKh: sanitizeString(rawRow.nameKh) || "",
    descriptionEn: sanitizeString(rawRow.descriptionEn),
    descriptionKh: sanitizeString(rawRow.descriptionKh),
    priceUsd,
    priceKhr,
    categorySlug: rawRow.categorySlug || "",
    stock,
    minStockLevel,
    imageUrl: rawRow.imageUrl || null,
    images,
    isActive,
  }

  // Validate with Zod
  const result = importRowSchema.safeParse(rowData)
  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push({
        row: rowIndex,
        field: issue.path.join("."),
        message: issue.message,
        data: rowData,
      })
    }
    return { errors }
  }

  return { data: result.data, errors: [] }
}

// POST /api/products/import - Import products from CSV
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const updateExisting = searchParams.get("updateExisting") === "true"
    const dryRun = searchParams.get("dryRun") === "true"

    // Get form data with CSV file
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded. Please provide a CSV file." },
        { status: 400 }
      )
    }

    // Validate file type
    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith(".csv")) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a CSV file." },
        { status: 400 }
      )
    }

    // Read and parse CSV
    const csvContent = await file.text()
    const rawRows = parseCSV(csvContent)

    if (rawRows.length === 0) {
      return NextResponse.json(
        { error: "CSV file is empty or has no data rows." },
        { status: 400 }
      )
    }

    // Fetch all categories for lookup
    const categories = await prisma.category.findMany({
      select: { id: true, slug: true, nameEn: true },
    })
    const categoryMap = new Map(categories.map((c) => [c.slug, c]))

    // Fetch existing SKUs
    const existingProducts = await prisma.product.findMany({
      select: { id: true, sku: true },
    })
    const existingSkuMap = new Map(existingProducts.map((p) => [p.sku, p.id]))

    // Process rows
    const result: ImportResult = {
      success: true,
      totalRows: rawRows.length,
      imported: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: [],
      importedProducts: [],
    }

    const toCreate: { data: ImportRow; categoryId: string }[] = []
    const toUpdate: { id: string; data: ImportRow; categoryId: string }[] = []

    for (let i = 0; i < rawRows.length; i++) {
      const rowNumber = i + 2 // Account for header row and 1-based indexing
      const rawRow = rawRows[i]

      // Convert and validate row
      const { data, errors } = convertRow(rawRow, rowNumber)

      if (errors.length > 0) {
        result.errors.push(...errors)
        result.failed++
        continue
      }

      if (!data) {
        result.failed++
        continue
      }

      // Lookup category
      const category = categoryMap.get(data.categorySlug)
      if (!category) {
        result.errors.push({
          row: rowNumber,
          field: "categorySlug",
          message: `Category "${data.categorySlug}" not found`,
          data: rawRow,
        })
        result.failed++
        continue
      }

      // Check if SKU exists
      const existingId = existingSkuMap.get(data.sku)

      if (existingId) {
        if (updateExisting) {
          toUpdate.push({ id: existingId, data, categoryId: category.id })
        } else {
          result.skipped++
          result.errors.push({
            row: rowNumber,
            field: "sku",
            message: `SKU "${data.sku}" already exists (use updateExisting=true to update)`,
          })
        }
      } else {
        toCreate.push({ data, categoryId: category.id })
      }
    }

    // If dry run, return validation results without making changes
    if (dryRun) {
      return NextResponse.json({
        ...result,
        dryRun: true,
        pendingCreates: toCreate.length,
        pendingUpdates: toUpdate.length,
        message: "Dry run complete. No changes made.",
      })
    }

    // Perform database operations
    // Create new products
    for (const item of toCreate) {
      try {
        const product = await prisma.product.create({
          data: {
            sku: item.data.sku,
            nameEn: item.data.nameEn,
            nameKh: item.data.nameKh,
            descriptionEn: item.data.descriptionEn,
            descriptionKh: item.data.descriptionKh,
            priceUsd: item.data.priceUsd,
            priceKhr: item.data.priceKhr,
            categoryId: item.categoryId,
            imageUrl: item.data.imageUrl,
            images: item.data.images,
            isActive: item.data.isActive,
            inventory: {
              create: {
                quantity: item.data.stock,
                minLevel: item.data.minStockLevel,
              },
            },
          },
        })
        result.imported++
        result.importedProducts.push({ sku: item.data.sku, id: product.id, action: "created" })
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error"
        result.errors.push({
          row: 0, // Can't track row number in batch
          field: "sku",
          message: `Failed to create product "${item.data.sku}": ${message}`,
        })
        result.failed++
      }
    }

    // Update existing products
    for (const item of toUpdate) {
      try {
        await prisma.$transaction(async (tx) => {
          // Update product
          await tx.product.update({
            where: { id: item.id },
            data: {
              nameEn: item.data.nameEn,
              nameKh: item.data.nameKh,
              descriptionEn: item.data.descriptionEn,
              descriptionKh: item.data.descriptionKh,
              priceUsd: item.data.priceUsd,
              priceKhr: item.data.priceKhr,
              categoryId: item.categoryId,
              imageUrl: item.data.imageUrl,
              images: item.data.images,
              isActive: item.data.isActive,
            },
          })

          // Update or create inventory
          await tx.inventory.upsert({
            where: { productId: item.id },
            update: {
              quantity: item.data.stock,
              minLevel: item.data.minStockLevel,
            },
            create: {
              productId: item.id,
              quantity: item.data.stock,
              minLevel: item.data.minStockLevel,
            },
          })
        })
        result.updated++
        result.importedProducts.push({ sku: item.data.sku, id: item.id, action: "updated" })
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error"
        result.errors.push({
          row: 0,
          field: "sku",
          message: `Failed to update product "${item.data.sku}": ${message}`,
        })
        result.failed++
      }
    }

    result.success = result.failed === 0

    return NextResponse.json(result)
  } catch (error) {
    console.error("Import products error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
