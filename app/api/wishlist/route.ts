import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

// GET /api/wishlist - Get wishlist items for a guest or customer
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const guestId = searchParams.get("guestId")
    const customerId = searchParams.get("customerId")

    if (!guestId && !customerId) {
      return NextResponse.json(
        { error: "Either guestId or customerId is required" },
        { status: 400 }
      )
    }

    const whereClause = customerId
      ? { customerId }
      : { guestId }

    const wishlists = await prisma.wishlist.findMany({
      where: whereClause,
      include: {
        product: {
          include: {
            category: {
              select: {
                id: true,
                nameEn: true,
                nameKh: true,
                slug: true,
              },
            },
            inventory: {
              select: {
                quantity: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Filter out inactive products
    const activeWishlists = wishlists.filter((w) => w.product.isActive)

    return NextResponse.json({
      items: activeWishlists.map((w) => ({
        id: w.id,
        productId: w.productId,
        createdAt: w.createdAt.toISOString(),
        product: {
          id: w.product.id,
          nameEn: w.product.nameEn,
          nameKh: w.product.nameKh,
          priceUsd: Number(w.product.priceUsd),
          priceKhr: w.product.priceKhr,
          imageUrl: w.product.imageUrl,
          category: w.product.category,
          inventory: w.product.inventory,
        },
      })),
      total: activeWishlists.length,
    })
  } catch (error) {
    console.error("Error fetching wishlist:", error)
    return NextResponse.json(
      { error: "Failed to fetch wishlist" },
      { status: 500 }
    )
  }
}

// POST /api/wishlist - Add product to wishlist
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, guestId, customerId } = body

    if (!productId) {
      return NextResponse.json(
        { error: "productId is required" },
        { status: 400 }
      )
    }

    if (!guestId && !customerId) {
      return NextResponse.json(
        { error: "Either guestId or customerId is required" },
        { status: 400 }
      )
    }

    // Check if product exists and is active
    const product = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!product || !product.isActive) {
      return NextResponse.json(
        { error: "Product not found or not available" },
        { status: 404 }
      )
    }

    // Check if already in wishlist
    const existingWishlist = await prisma.wishlist.findFirst({
      where: customerId
        ? { customerId, productId }
        : { guestId, productId },
    })

    if (existingWishlist) {
      return NextResponse.json(
        { error: "Product already in wishlist", wishlistId: existingWishlist.id },
        { status: 409 }
      )
    }

    // Create wishlist entry
    const wishlist = await prisma.wishlist.create({
      data: {
        productId,
        ...(customerId ? { customerId } : { guestId }),
      },
      include: {
        product: {
          include: {
            category: {
              select: {
                id: true,
                nameEn: true,
                nameKh: true,
                slug: true,
              },
            },
            inventory: {
              select: {
                quantity: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      item: {
        id: wishlist.id,
        productId: wishlist.productId,
        createdAt: wishlist.createdAt.toISOString(),
        product: {
          id: wishlist.product.id,
          nameEn: wishlist.product.nameEn,
          nameKh: wishlist.product.nameKh,
          priceUsd: Number(wishlist.product.priceUsd),
          priceKhr: wishlist.product.priceKhr,
          imageUrl: wishlist.product.imageUrl,
          category: wishlist.product.category,
          inventory: wishlist.product.inventory,
        },
      },
    })
  } catch (error) {
    console.error("Error adding to wishlist:", error)
    return NextResponse.json(
      { error: "Failed to add to wishlist" },
      { status: 500 }
    )
  }
}

// DELETE /api/wishlist - Remove product from wishlist
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const productId = searchParams.get("productId")
    const wishlistId = searchParams.get("id")
    const guestId = searchParams.get("guestId")
    const customerId = searchParams.get("customerId")

    // Can delete by wishlist ID directly
    if (wishlistId) {
      await prisma.wishlist.delete({
        where: { id: wishlistId },
      })
      return NextResponse.json({ success: true })
    }

    // Or delete by product ID + guest/customer ID
    if (!productId) {
      return NextResponse.json(
        { error: "Either id or productId is required" },
        { status: 400 }
      )
    }

    if (!guestId && !customerId) {
      return NextResponse.json(
        { error: "Either guestId or customerId is required" },
        { status: 400 }
      )
    }

    const wishlist = await prisma.wishlist.findFirst({
      where: customerId
        ? { customerId, productId }
        : { guestId, productId },
    })

    if (!wishlist) {
      return NextResponse.json(
        { error: "Wishlist item not found" },
        { status: 404 }
      )
    }

    await prisma.wishlist.delete({
      where: { id: wishlist.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing from wishlist:", error)
    return NextResponse.json(
      { error: "Failed to remove from wishlist" },
      { status: 500 }
    )
  }
}
