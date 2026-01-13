import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import type { BundleDiscountType } from "@prisma/client"

const KHR_RATE = 4000 // 1 USD = 4000 KHR

// Helper to generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

// Calculate bundle pricing
function calculateBundlePrice(
  items: Array<{ priceUsd: number; quantity: number }>,
  discountType: BundleDiscountType,
  discountValue: number
): { originalPriceUsd: number; bundlePriceUsd: number; savingsUsd: number } {
  const originalPriceUsd = items.reduce(
    (sum, item) => sum + item.priceUsd * item.quantity,
    0
  )

  let bundlePriceUsd: number
  if (discountType === "PERCENTAGE") {
    bundlePriceUsd = originalPriceUsd * (1 - discountValue / 100)
  } else {
    // FIXED discount
    bundlePriceUsd = Math.max(0, originalPriceUsd - discountValue)
  }

  return {
    originalPriceUsd: Math.round(originalPriceUsd * 100) / 100,
    bundlePriceUsd: Math.round(bundlePriceUsd * 100) / 100,
    savingsUsd: Math.round((originalPriceUsd - bundlePriceUsd) * 100) / 100,
  }
}

// GET /api/bundles - List bundles or get a specific one
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get("id")
  const slug = searchParams.get("slug")
  const active = searchParams.get("active") === "true"
  const featured = searchParams.get("featured") === "true"
  const productId = searchParams.get("productId") // Get bundles containing this product
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "20")
  const skip = (page - 1) * limit

  try {
    // Get single bundle by ID or slug
    if (id || slug) {
      const bundle = await prisma.bundle.findUnique({
        where: id ? { id } : { slug: slug! },
        include: {
          items: {
            orderBy: { sortOrder: "asc" },
          },
        },
      })

      if (!bundle) {
        return NextResponse.json(
          { error: "Bundle not found" },
          { status: 404 }
        )
      }

      // Get product details for bundle items
      const productIds = bundle.items.map((item) => item.productId)
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        include: {
          category: true,
          inventory: true,
        },
      })

      const productMap = new Map(products.map((p) => [p.id, p]))

      // Calculate bundle pricing
      const itemsWithPrices = bundle.items.map((item) => {
        const product = productMap.get(item.productId)
        return {
          priceUsd: product ? Number(product.priceUsd) : 0,
          quantity: item.quantity,
        }
      })

      const pricing = calculateBundlePrice(
        itemsWithPrices,
        bundle.discountType,
        Number(bundle.discountValue)
      )

      // Check stock availability
      const isInStock = bundle.items.every((item) => {
        const product = productMap.get(item.productId)
        if (!product || !product.isActive) return false
        const stock = product.inventory?.quantity || 0
        return stock >= item.quantity
      })

      return NextResponse.json({
        bundle: {
          ...bundle,
          discountValue: Number(bundle.discountValue),
          items: bundle.items.map((item) => {
            const product = productMap.get(item.productId)
            return {
              ...item,
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
          pricing: {
            ...pricing,
            originalPriceKhr: Math.round(pricing.originalPriceUsd * KHR_RATE),
            bundlePriceKhr: Math.round(pricing.bundlePriceUsd * KHR_RATE),
            savingsKhr: Math.round(pricing.savingsUsd * KHR_RATE),
            savingsPercent:
              pricing.originalPriceUsd > 0
                ? Math.round(
                    (pricing.savingsUsd / pricing.originalPriceUsd) * 100
                  )
                : 0,
          },
          isInStock,
        },
      })
    }

    // List bundles with filters
    const where: Parameters<typeof prisma.bundle.findMany>[0]["where"] = {}

    if (active) {
      where.isActive = true
    }

    if (featured) {
      where.isFeatured = true
    }

    // Filter bundles containing a specific product
    if (productId) {
      where.items = {
        some: {
          productId,
        },
      }
    }

    const [bundles, total] = await Promise.all([
      prisma.bundle.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
        include: {
          items: {
            orderBy: { sortOrder: "asc" },
          },
        },
      }),
      prisma.bundle.count({ where }),
    ])

    // Get all product IDs from all bundles
    const allProductIds = [
      ...new Set(bundles.flatMap((b) => b.items.map((i) => i.productId))),
    ]
    const products = await prisma.product.findMany({
      where: { id: { in: allProductIds } },
      include: {
        category: true,
        inventory: true,
      },
    })

    const productMap = new Map(products.map((p) => [p.id, p]))

    // Format bundles with pricing and product details
    const formattedBundles = bundles.map((bundle) => {
      const itemsWithPrices = bundle.items.map((item) => {
        const product = productMap.get(item.productId)
        return {
          priceUsd: product ? Number(product.priceUsd) : 0,
          quantity: item.quantity,
        }
      })

      const pricing = calculateBundlePrice(
        itemsWithPrices,
        bundle.discountType,
        Number(bundle.discountValue)
      )

      const isInStock = bundle.items.every((item) => {
        const product = productMap.get(item.productId)
        if (!product || !product.isActive) return false
        const stock = product.inventory?.quantity || 0
        return stock >= item.quantity
      })

      return {
        ...bundle,
        discountValue: Number(bundle.discountValue),
        items: bundle.items.map((item) => {
          const product = productMap.get(item.productId)
          return {
            ...item,
            product: product
              ? {
                  id: product.id,
                  nameEn: product.nameEn,
                  nameKh: product.nameKh,
                  priceUsd: Number(product.priceUsd),
                  priceKhr: product.priceKhr,
                  imageUrl: product.imageUrl,
                  isActive: product.isActive,
                }
              : null,
          }
        }),
        pricing: {
          ...pricing,
          originalPriceKhr: Math.round(pricing.originalPriceUsd * KHR_RATE),
          bundlePriceKhr: Math.round(pricing.bundlePriceUsd * KHR_RATE),
          savingsKhr: Math.round(pricing.savingsUsd * KHR_RATE),
          savingsPercent:
            pricing.originalPriceUsd > 0
              ? Math.round(
                  (pricing.savingsUsd / pricing.originalPriceUsd) * 100
                )
              : 0,
        },
        isInStock,
      }
    })

    return NextResponse.json({
      bundles: formattedBundles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching bundles:", error)
    return NextResponse.json(
      { error: "Failed to fetch bundles" },
      { status: 500 }
    )
  }
}

// POST /api/bundles - Create a new bundle (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      nameEn,
      nameKh,
      slug: customSlug,
      descriptionEn,
      descriptionKh,
      imageUrl,
      discountType = "PERCENTAGE",
      discountValue,
      isActive = true,
      isFeatured = false,
      maxPurchases,
      items, // Array of { productId, quantity, sortOrder }
      clientId,
    } = body

    // Validate required fields
    if (!nameEn || !nameKh || discountValue === undefined || !items?.length) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: nameEn, nameKh, discountValue, items",
        },
        { status: 400 }
      )
    }

    // Validate discount value
    if (discountType === "PERCENTAGE" && (discountValue < 0 || discountValue > 100)) {
      return NextResponse.json(
        { error: "Percentage discount must be between 0 and 100" },
        { status: 400 }
      )
    }

    if (discountType === "FIXED" && discountValue < 0) {
      return NextResponse.json(
        { error: "Fixed discount cannot be negative" },
        { status: 400 }
      )
    }

    // Validate items have required fields
    for (const item of items) {
      if (!item.productId) {
        return NextResponse.json(
          { error: "Each bundle item must have a productId" },
          { status: 400 }
        )
      }
    }

    // Verify all products exist
    const productIds = items.map((i: { productId: string }) => i.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    })

    if (products.length !== productIds.length) {
      const foundIds = new Set(products.map((p) => p.id))
      const missingIds = productIds.filter(
        (id: string) => !foundIds.has(id)
      )
      return NextResponse.json(
        { error: `Products not found: ${missingIds.join(", ")}` },
        { status: 400 }
      )
    }

    // Generate slug
    const slug = customSlug || generateSlug(nameEn)

    // Check slug uniqueness
    const existingSlug = await prisma.bundle.findUnique({
      where: { slug },
    })

    const finalSlug = existingSlug ? `${slug}-${Date.now()}` : slug

    // Create bundle with items
    const bundle = await prisma.bundle.create({
      data: {
        nameEn,
        nameKh,
        slug: finalSlug,
        descriptionEn,
        descriptionKh,
        imageUrl,
        discountType,
        discountValue,
        isActive,
        isFeatured,
        maxPurchases,
        clientId,
        items: {
          create: items.map(
            (
              item: { productId: string; quantity?: number; sortOrder?: number },
              index: number
            ) => ({
              productId: item.productId,
              quantity: item.quantity || 1,
              sortOrder: item.sortOrder ?? index,
            })
          ),
        },
      },
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
        },
      },
    })

    return NextResponse.json({ bundle }, { status: 201 })
  } catch (error) {
    console.error("Error creating bundle:", error)
    return NextResponse.json(
      { error: "Failed to create bundle" },
      { status: 500 }
    )
  }
}

// PUT /api/bundles - Update a bundle (admin only)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      id,
      nameEn,
      nameKh,
      slug: customSlug,
      descriptionEn,
      descriptionKh,
      imageUrl,
      discountType,
      discountValue,
      isActive,
      isFeatured,
      maxPurchases,
      items, // If provided, replace all items
    } = body

    if (!id) {
      return NextResponse.json(
        { error: "Bundle ID is required" },
        { status: 400 }
      )
    }

    // Check bundle exists
    const existingBundle = await prisma.bundle.findUnique({
      where: { id },
      include: { items: true },
    })

    if (!existingBundle) {
      return NextResponse.json(
        { error: "Bundle not found" },
        { status: 404 }
      )
    }

    // Validate discount if updating
    if (discountType && discountValue !== undefined) {
      if (discountType === "PERCENTAGE" && (discountValue < 0 || discountValue > 100)) {
        return NextResponse.json(
          { error: "Percentage discount must be between 0 and 100" },
          { status: 400 }
        )
      }
      if (discountType === "FIXED" && discountValue < 0) {
        return NextResponse.json(
          { error: "Fixed discount cannot be negative" },
          { status: 400 }
        )
      }
    }

    // If items are provided, verify all products exist
    if (items?.length) {
      const productIds = items.map((i: { productId: string }) => i.productId)
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
      })

      if (products.length !== productIds.length) {
        const foundIds = new Set(products.map((p) => p.id))
        const missingIds = productIds.filter(
          (id: string) => !foundIds.has(id)
        )
        return NextResponse.json(
          { error: `Products not found: ${missingIds.join(", ")}` },
          { status: 400 }
        )
      }
    }

    // Handle slug update
    let finalSlug = existingBundle.slug
    if (customSlug && customSlug !== existingBundle.slug) {
      const existingSlugBundle = await prisma.bundle.findFirst({
        where: { slug: customSlug, id: { not: id } },
      })
      finalSlug = existingSlugBundle ? `${customSlug}-${Date.now()}` : customSlug
    }

    // Update bundle
    const bundle = await prisma.bundle.update({
      where: { id },
      data: {
        ...(nameEn !== undefined && { nameEn }),
        ...(nameKh !== undefined && { nameKh }),
        ...(finalSlug !== existingBundle.slug && { slug: finalSlug }),
        ...(descriptionEn !== undefined && { descriptionEn }),
        ...(descriptionKh !== undefined && { descriptionKh }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(discountType !== undefined && { discountType }),
        ...(discountValue !== undefined && { discountValue }),
        ...(isActive !== undefined && { isActive }),
        ...(isFeatured !== undefined && { isFeatured }),
        ...(maxPurchases !== undefined && { maxPurchases }),
      },
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
        },
      },
    })

    // If items are provided, replace all items
    if (items?.length) {
      // Delete existing items
      await prisma.bundleItem.deleteMany({
        where: { bundleId: id },
      })

      // Create new items
      await prisma.bundleItem.createMany({
        data: items.map(
          (
            item: { productId: string; quantity?: number; sortOrder?: number },
            index: number
          ) => ({
            bundleId: id,
            productId: item.productId,
            quantity: item.quantity || 1,
            sortOrder: item.sortOrder ?? index,
          })
        ),
      })

      // Fetch updated bundle with new items
      const updatedBundle = await prisma.bundle.findUnique({
        where: { id },
        include: {
          items: {
            orderBy: { sortOrder: "asc" },
          },
        },
      })

      return NextResponse.json({ bundle: updatedBundle })
    }

    return NextResponse.json({ bundle })
  } catch (error) {
    console.error("Error updating bundle:", error)
    return NextResponse.json(
      { error: "Failed to update bundle" },
      { status: 500 }
    )
  }
}

// DELETE /api/bundles - Delete a bundle (admin only)
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json(
      { error: "Bundle ID is required" },
      { status: 400 }
    )
  }

  try {
    // Check bundle exists
    const bundle = await prisma.bundle.findUnique({
      where: { id },
    })

    if (!bundle) {
      return NextResponse.json(
        { error: "Bundle not found" },
        { status: 404 }
      )
    }

    // Delete bundle (cascade will delete items)
    await prisma.bundle.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting bundle:", error)
    return NextResponse.json(
      { error: "Failed to delete bundle" },
      { status: 500 }
    )
  }
}
