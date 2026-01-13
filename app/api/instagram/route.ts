import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Instagram Shop Integration API
// Supports: Connect account, sync products, import orders, get analytics

// GET /api/instagram - Get connected accounts, products, posts, orders, analytics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action") || "accounts"
    const accountId = searchParams.get("accountId")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const skip = (page - 1) * limit

    switch (action) {
      case "accounts": {
        // Get all connected Instagram accounts
        const [accounts, total] = await Promise.all([
          prisma.instagramAccount.findMany({
            orderBy: { connectedAt: "desc" },
            include: {
              _count: {
                select: {
                  products: true,
                  posts: true,
                  orders: true,
                },
              },
            },
          }),
          prisma.instagramAccount.count(),
        ])

        return NextResponse.json({
          accounts: accounts.map((a) => ({
            id: a.id,
            instagramId: a.instagramId,
            username: a.username,
            name: a.name,
            profilePicture: a.profilePicture,
            followersCount: a.followersCount,
            mediaCount: a.mediaCount,
            status: a.status,
            lastSyncAt: a.lastSyncAt,
            syncError: a.syncError,
            autoSync: a.autoSync,
            connectedAt: a.connectedAt,
            productCount: a._count.products,
            postCount: a._count.posts,
            orderCount: a._count.orders,
          })),
          total,
        })
      }

      case "products": {
        // Get products synced to Instagram
        if (!accountId) {
          return NextResponse.json(
            { error: "accountId is required" },
            { status: 400 }
          )
        }

        const [products, total] = await Promise.all([
          prisma.instagramProduct.findMany({
            where: { accountId },
            skip,
            take: limit,
            orderBy: { updatedAt: "desc" },
            include: {
              product: {
                select: {
                  id: true,
                  nameEn: true,
                  nameKh: true,
                  priceUsd: true,
                  priceKhr: true,
                  imageUrl: true,
                  sku: true,
                  isActive: true,
                },
              },
            },
          }),
          prisma.instagramProduct.count({ where: { accountId } }),
        ])

        return NextResponse.json({
          products: products.map((p) => ({
            id: p.id,
            productId: p.productId,
            catalogProductId: p.catalogProductId,
            syncStatus: p.syncStatus,
            lastSyncAt: p.lastSyncAt,
            syncError: p.syncError,
            impressions: p.impressions,
            clicks: p.clicks,
            saves: p.saves,
            product: p.product,
          })),
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        })
      }

      case "posts": {
        // Get Instagram posts with product tags
        if (!accountId) {
          return NextResponse.json(
            { error: "accountId is required" },
            { status: 400 }
          )
        }

        const [posts, total] = await Promise.all([
          prisma.instagramPost.findMany({
            where: { accountId },
            skip,
            take: limit,
            orderBy: { postedAt: "desc" },
            include: {
              taggedProducts: {
                include: {
                  igProduct: {
                    include: {
                      product: {
                        select: {
                          id: true,
                          nameEn: true,
                          imageUrl: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          }),
          prisma.instagramPost.count({ where: { accountId } }),
        ])

        return NextResponse.json({
          posts: posts.map((p) => ({
            id: p.id,
            mediaId: p.mediaId,
            mediaType: p.mediaType,
            mediaUrl: p.mediaUrl,
            thumbnailUrl: p.thumbnailUrl,
            permalink: p.permalink,
            caption: p.caption ? p.caption.substring(0, 100) + "..." : null,
            likeCount: p.likeCount,
            commentCount: p.commentCount,
            reach: p.reach,
            impressions: p.impressions,
            productClicks: p.productClicks,
            conversions: p.conversions,
            revenue: Number(p.revenue),
            postedAt: p.postedAt,
            taggedProducts: p.taggedProducts.map((t) => ({
              productId: t.igProduct.product.id,
              name: t.igProduct.product.nameEn,
              imageUrl: t.igProduct.product.imageUrl,
              clicks: t.clicks,
            })),
          })),
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        })
      }

      case "orders": {
        // Get orders from Instagram checkout
        if (!accountId) {
          return NextResponse.json(
            { error: "accountId is required" },
            { status: 400 }
          )
        }

        const status = searchParams.get("status") // PENDING, IMPORTED, FAILED, SKIPPED

        const where = {
          accountId,
          ...(status && { importStatus: status as "PENDING" | "IMPORTED" | "FAILED" | "SKIPPED" }),
        }

        const [orders, total] = await Promise.all([
          prisma.instagramOrder.findMany({
            where,
            skip,
            take: limit,
            orderBy: { orderedAt: "desc" },
            include: {
              order: {
                select: {
                  id: true,
                  orderNumber: true,
                  status: true,
                },
              },
            },
          }),
          prisma.instagramOrder.count({ where }),
        ])

        return NextResponse.json({
          orders: orders.map((o) => ({
            id: o.id,
            instagramOrderId: o.instagramOrderId,
            buyerName: o.buyerName,
            buyerEmail: o.buyerEmail,
            items: o.items,
            totalUsd: Number(o.totalUsd),
            totalKhr: Number(o.totalKhr),
            instagramStatus: o.instagramStatus,
            importStatus: o.importStatus,
            importError: o.importError,
            orderedAt: o.orderedAt,
            importedAt: o.importedAt,
            linkedOrder: o.order,
          })),
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        })
      }

      case "analytics": {
        // Get performance analytics
        if (!accountId) {
          return NextResponse.json(
            { error: "accountId is required" },
            { status: 400 }
          )
        }

        const startDate = searchParams.get("startDate")
        const endDate = searchParams.get("endDate")

        const dateFilter = startDate && endDate ? {
          postedAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        } : {}

        // Get account info
        const account = await prisma.instagramAccount.findUnique({
          where: { id: accountId },
          select: {
            username: true,
            followersCount: true,
            mediaCount: true,
            lastSyncAt: true,
          },
        })

        // Aggregate post metrics
        const postStats = await prisma.instagramPost.aggregate({
          where: { accountId, ...dateFilter },
          _sum: {
            likeCount: true,
            commentCount: true,
            reach: true,
            impressions: true,
            productClicks: true,
            conversions: true,
            revenue: true,
          },
          _avg: {
            likeCount: true,
            commentCount: true,
          },
          _count: true,
        })

        // Get top performing posts
        const topPosts = await prisma.instagramPost.findMany({
          where: { accountId, ...dateFilter },
          orderBy: { productClicks: "desc" },
          take: 5,
          select: {
            id: true,
            mediaType: true,
            thumbnailUrl: true,
            permalink: true,
            productClicks: true,
            conversions: true,
            revenue: true,
            postedAt: true,
          },
        })

        // Get top products by performance
        const topProducts = await prisma.instagramProduct.findMany({
          where: { accountId },
          orderBy: { clicks: "desc" },
          take: 5,
          include: {
            product: {
              select: {
                nameEn: true,
                imageUrl: true,
                priceUsd: true,
              },
            },
          },
        })

        // Order stats
        const orderStats = await prisma.instagramOrder.aggregate({
          where: {
            accountId,
            importStatus: "IMPORTED",
            ...(startDate && endDate ? {
              orderedAt: {
                gte: new Date(startDate),
                lte: new Date(endDate),
              },
            } : {}),
          },
          _sum: {
            totalUsd: true,
          },
          _count: true,
        })

        return NextResponse.json({
          account,
          summary: {
            totalPosts: postStats._count,
            totalReach: postStats._sum.reach || 0,
            totalImpressions: postStats._sum.impressions || 0,
            totalEngagement: (postStats._sum.likeCount || 0) + (postStats._sum.commentCount || 0),
            avgLikes: Math.round(postStats._avg.likeCount || 0),
            avgComments: Math.round(postStats._avg.commentCount || 0),
            totalProductClicks: postStats._sum.productClicks || 0,
            totalConversions: postStats._sum.conversions || 0,
            totalRevenue: Number(postStats._sum.revenue || 0),
            ordersImported: orderStats._count,
            orderRevenue: Number(orderStats._sum.totalUsd || 0),
          },
          topPosts: topPosts.map((p) => ({
            id: p.id,
            mediaType: p.mediaType,
            thumbnailUrl: p.thumbnailUrl,
            permalink: p.permalink,
            productClicks: p.productClicks,
            conversions: p.conversions,
            revenue: Number(p.revenue),
            postedAt: p.postedAt,
          })),
          topProducts: topProducts.map((p) => ({
            id: p.id,
            name: p.product.nameEn,
            imageUrl: p.product.imageUrl,
            price: Number(p.product.priceUsd),
            impressions: p.impressions,
            clicks: p.clicks,
            saves: p.saves,
          })),
        })
      }

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error("Instagram API GET error:", error)
    return NextResponse.json(
      { error: "Failed to fetch Instagram data" },
      { status: 500 }
    )
  }
}

// POST /api/instagram - Connect account, sync products, tag posts, import orders
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case "connect": {
        // Connect Instagram Business Account
        // In production, this would exchange OAuth code for access token
        const {
          instagramId,
          username,
          name,
          profilePicture,
          accessToken,
          tokenExpiresAt,
        } = body

        if (!instagramId || !username || !accessToken) {
          return NextResponse.json(
            { error: "instagramId, username, and accessToken are required" },
            { status: 400 }
          )
        }

        // Check if already connected
        const existing = await prisma.instagramAccount.findUnique({
          where: { instagramId },
        })

        if (existing) {
          // Update existing connection
          const updated = await prisma.instagramAccount.update({
            where: { id: existing.id },
            data: {
              username,
              name,
              profilePicture,
              accessToken,
              tokenExpiresAt: tokenExpiresAt ? new Date(tokenExpiresAt) : null,
              status: "ACTIVE",
              syncError: null,
            },
          })
          return NextResponse.json({ account: updated, reconnected: true })
        }

        // Create new connection
        const account = await prisma.instagramAccount.create({
          data: {
            instagramId,
            username,
            name,
            profilePicture,
            accessToken,
            tokenExpiresAt: tokenExpiresAt ? new Date(tokenExpiresAt) : null,
            status: "ACTIVE",
          },
        })

        return NextResponse.json({ account, created: true })
      }

      case "sync_products": {
        // Sync products to Instagram catalog
        const { accountId, productIds } = body

        if (!accountId) {
          return NextResponse.json(
            { error: "accountId is required" },
            { status: 400 }
          )
        }

        // Verify account exists
        const account = await prisma.instagramAccount.findUnique({
          where: { id: accountId },
        })

        if (!account) {
          return NextResponse.json(
            { error: "Instagram account not found" },
            { status: 404 }
          )
        }

        // Get products to sync
        const products = await prisma.product.findMany({
          where: {
            ...(productIds && productIds.length > 0
              ? { id: { in: productIds } }
              : {}),
            isActive: true,
          },
          select: {
            id: true,
            nameEn: true,
            sku: true,
          },
        })

        // Create or update Instagram products
        const results = await Promise.all(
          products.map(async (product) => {
            // In production, this would call Facebook/Instagram Graph API
            // to sync product to catalog
            const catalogProductId = `ig_${product.sku}_${Date.now()}`

            const existing = await prisma.instagramProduct.findUnique({
              where: {
                accountId_productId: {
                  accountId,
                  productId: product.id,
                },
              },
            })

            if (existing) {
              // Update sync status
              return prisma.instagramProduct.update({
                where: { id: existing.id },
                data: {
                  syncStatus: "SYNCED",
                  lastSyncAt: new Date(),
                  syncError: null,
                  catalogProductId,
                },
              })
            }

            // Create new sync record
            return prisma.instagramProduct.create({
              data: {
                accountId,
                productId: product.id,
                catalogProductId,
                syncStatus: "SYNCED",
                lastSyncAt: new Date(),
              },
            })
          })
        )

        // Update account last sync
        await prisma.instagramAccount.update({
          where: { id: accountId },
          data: { lastSyncAt: new Date() },
        })

        return NextResponse.json({
          synced: results.length,
          message: `Successfully synced ${results.length} products to Instagram catalog`,
        })
      }

      case "tag_post": {
        // Tag products in an Instagram post
        const { accountId, postId, mediaId, mediaType, mediaUrl, thumbnailUrl, permalink, caption, postedAt, productTags } = body

        if (!accountId || !mediaId || !mediaUrl) {
          return NextResponse.json(
            { error: "accountId, mediaId, and mediaUrl are required" },
            { status: 400 }
          )
        }

        // Create or update post
        let post = await prisma.instagramPost.findUnique({
          where: { mediaId },
        })

        if (!post) {
          post = await prisma.instagramPost.create({
            data: {
              accountId,
              mediaId,
              mediaType: mediaType || "IMAGE",
              mediaUrl,
              thumbnailUrl,
              permalink: permalink || mediaUrl,
              caption,
              postedAt: postedAt ? new Date(postedAt) : new Date(),
            },
          })
        }

        // Add product tags
        if (productTags && productTags.length > 0) {
          // Get Instagram products for these product IDs
          const igProducts = await prisma.instagramProduct.findMany({
            where: {
              accountId,
              productId: { in: productTags.map((t: { productId: string }) => t.productId) },
            },
          })

          // Create tags
          await Promise.all(
            productTags.map(async (tag: { productId: string; positionX?: number; positionY?: number }) => {
              const igProduct = igProducts.find((p) => p.productId === tag.productId)
              if (!igProduct) return null

              // Check if tag already exists
              const existing = await prisma.instagramProductTag.findUnique({
                where: {
                  postId_productId: {
                    postId: post!.id,
                    productId: igProduct.id,
                  },
                },
              })

              if (existing) {
                return prisma.instagramProductTag.update({
                  where: { id: existing.id },
                  data: {
                    positionX: tag.positionX,
                    positionY: tag.positionY,
                  },
                })
              }

              return prisma.instagramProductTag.create({
                data: {
                  postId: post!.id,
                  productId: igProduct.id,
                  positionX: tag.positionX,
                  positionY: tag.positionY,
                },
              })
            })
          )
        }

        return NextResponse.json({
          post,
          message: "Post tagged successfully",
        })
      }

      case "import_order": {
        // Import order from Instagram checkout
        const {
          accountId,
          instagramOrderId,
          buyerName,
          buyerEmail,
          buyerPhone,
          items,
          subtotalUsd,
          shippingUsd,
          taxUsd,
          totalUsd,
          shippingAddress,
          instagramStatus,
          orderedAt,
        } = body

        if (!accountId || !instagramOrderId || !buyerName || !items || !totalUsd) {
          return NextResponse.json(
            { error: "Missing required order fields" },
            { status: 400 }
          )
        }

        // Check if order already imported
        const existing = await prisma.instagramOrder.findUnique({
          where: { instagramOrderId },
        })

        if (existing) {
          return NextResponse.json(
            { error: "Order already imported", order: existing },
            { status: 409 }
          )
        }

        const KHR_RATE = 4000

        // Create Instagram order record
        const igOrder = await prisma.instagramOrder.create({
          data: {
            accountId,
            instagramOrderId,
            buyerName,
            buyerEmail,
            buyerPhone,
            items,
            subtotalUsd: subtotalUsd || totalUsd,
            subtotalKhr: Math.round((subtotalUsd || totalUsd) * KHR_RATE),
            shippingUsd: shippingUsd || 0,
            shippingKhr: Math.round((shippingUsd || 0) * KHR_RATE),
            taxUsd: taxUsd || 0,
            taxKhr: Math.round((taxUsd || 0) * KHR_RATE),
            totalUsd,
            totalKhr: Math.round(totalUsd * KHR_RATE),
            shippingAddress,
            instagramStatus: instagramStatus || "PENDING",
            importStatus: "PENDING",
            orderedAt: orderedAt ? new Date(orderedAt) : new Date(),
          },
        })

        return NextResponse.json({
          order: igOrder,
          message: "Order imported successfully",
        })
      }

      case "convert_order": {
        // Convert Instagram order to regular order
        const { instagramOrderId } = body

        if (!instagramOrderId) {
          return NextResponse.json(
            { error: "instagramOrderId is required" },
            { status: 400 }
          )
        }

        const igOrder = await prisma.instagramOrder.findUnique({
          where: { instagramOrderId },
        })

        if (!igOrder) {
          return NextResponse.json(
            { error: "Instagram order not found" },
            { status: 404 }
          )
        }

        if (igOrder.importStatus === "IMPORTED" && igOrder.orderId) {
          return NextResponse.json(
            { error: "Order already converted", orderId: igOrder.orderId },
            { status: 409 }
          )
        }

        // Find or create customer
        let customer = null
        if (igOrder.buyerEmail) {
          customer = await prisma.customer.findFirst({
            where: { email: igOrder.buyerEmail },
          })
        }

        if (!customer) {
          customer = await prisma.customer.create({
            data: {
              name: igOrder.buyerName,
              email: igOrder.buyerEmail || `instagram_${igOrder.instagramOrderId}@placeholder.com`,
              phone: igOrder.buyerPhone,
            },
          })
        }

        // Generate order number
        const lastOrder = await prisma.order.findFirst({
          orderBy: { createdAt: "desc" },
          select: { orderNumber: true },
        })
        const lastNum = lastOrder
          ? parseInt(lastOrder.orderNumber.replace("ORD-", ""))
          : 0
        const orderNumber = `ORD-${String(lastNum + 1).padStart(6, "0")}`

        // Create order
        const order = await prisma.order.create({
          data: {
            orderNumber,
            customerId: customer.id,
            status: "NEW",
            totalUsd: igOrder.totalUsd,
            totalKhr: Number(igOrder.totalKhr),
            currency: "USD",
            channel: "INSTAGRAM",
            note: `Imported from Instagram order: ${igOrder.instagramOrderId}`,
          },
        })

        // Create order items
        const orderItems = igOrder.items as Array<{
          productId: string
          quantity: number
          priceUsd: number
          priceKhr: number
          name?: string
        }>

        await Promise.all(
          orderItems.map((item) =>
            prisma.orderItem.create({
              data: {
                orderId: order.id,
                productId: item.productId,
                productName: item.name,
                quantity: item.quantity,
                priceUsd: item.priceUsd,
                priceKhr: item.priceKhr,
              },
            })
          )
        )

        // Update Instagram order
        await prisma.instagramOrder.update({
          where: { id: igOrder.id },
          data: {
            orderId: order.id,
            importStatus: "IMPORTED",
            importedAt: new Date(),
          },
        })

        return NextResponse.json({
          order,
          message: "Order converted successfully",
        })
      }

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error("Instagram API POST error:", error)
    return NextResponse.json(
      { error: "Failed to process Instagram request" },
      { status: 500 }
    )
  }
}

// PATCH /api/instagram - Update account settings, product sync status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case "update_account": {
        const { accountId, autoSync, syncProducts, syncOrders, status } = body

        if (!accountId) {
          return NextResponse.json(
            { error: "accountId is required" },
            { status: 400 }
          )
        }

        const account = await prisma.instagramAccount.update({
          where: { id: accountId },
          data: {
            ...(autoSync !== undefined && { autoSync }),
            ...(syncProducts !== undefined && { syncProducts }),
            ...(syncOrders !== undefined && { syncOrders }),
            ...(status && { status }),
          },
        })

        return NextResponse.json({ account })
      }

      case "update_product_sync": {
        const { productId, syncStatus, syncError } = body

        if (!productId) {
          return NextResponse.json(
            { error: "productId is required" },
            { status: 400 }
          )
        }

        const product = await prisma.instagramProduct.update({
          where: { id: productId },
          data: {
            syncStatus,
            syncError,
            lastSyncAt: new Date(),
          },
        })

        return NextResponse.json({ product })
      }

      case "update_post_metrics": {
        // Update post engagement metrics (called from webhook or cron)
        const { postId, likeCount, commentCount, shareCount, saveCount, reach, impressions, productClicks, conversions, revenue } = body

        if (!postId) {
          return NextResponse.json(
            { error: "postId is required" },
            { status: 400 }
          )
        }

        const post = await prisma.instagramPost.update({
          where: { id: postId },
          data: {
            ...(likeCount !== undefined && { likeCount }),
            ...(commentCount !== undefined && { commentCount }),
            ...(shareCount !== undefined && { shareCount }),
            ...(saveCount !== undefined && { saveCount }),
            ...(reach !== undefined && { reach }),
            ...(impressions !== undefined && { impressions }),
            ...(productClicks !== undefined && { productClicks }),
            ...(conversions !== undefined && { conversions }),
            ...(revenue !== undefined && { revenue }),
            lastSyncAt: new Date(),
          },
        })

        return NextResponse.json({ post })
      }

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error("Instagram API PATCH error:", error)
    return NextResponse.json(
      { error: "Failed to update Instagram data" },
      { status: 500 }
    )
  }
}

// DELETE /api/instagram - Disconnect account, remove product sync
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      )
    }

    switch (action) {
      case "disconnect_account": {
        // Soft disconnect - mark as disconnected
        const account = await prisma.instagramAccount.update({
          where: { id },
          data: {
            status: "DISCONNECTED",
            accessToken: "", // Clear token
            refreshToken: null,
          },
        })

        return NextResponse.json({
          message: "Account disconnected",
          account: { id: account.id, username: account.username },
        })
      }

      case "remove_account": {
        // Hard delete - remove account and all related data
        await prisma.instagramAccount.delete({
          where: { id },
        })

        return NextResponse.json({
          message: "Account and all related data removed",
        })
      }

      case "unsync_product": {
        await prisma.instagramProduct.delete({
          where: { id },
        })

        return NextResponse.json({
          message: "Product unsynced from Instagram",
        })
      }

      case "remove_post": {
        await prisma.instagramPost.delete({
          where: { id },
        })

        return NextResponse.json({
          message: "Post removed",
        })
      }

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error("Instagram API DELETE error:", error)
    return NextResponse.json(
      { error: "Failed to delete Instagram data" },
      { status: 500 }
    )
  }
}
