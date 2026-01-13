import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// TikTok Shop Integration API
// Supports: Connect account, sync products, showcase in videos, import orders, live shopping

// GET /api/tiktok - Get connected accounts, products, videos, orders, live streams, analytics
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
        // Get all connected TikTok accounts
        const [accounts, total] = await Promise.all([
          prisma.tikTokAccount.findMany({
            orderBy: { connectedAt: "desc" },
            include: {
              _count: {
                select: {
                  products: true,
                  videos: true,
                  orders: true,
                  liveStreams: true,
                },
              },
            },
          }),
          prisma.tikTokAccount.count(),
        ])

        return NextResponse.json({
          accounts: accounts.map((a) => ({
            id: a.id,
            tiktokId: a.tiktokId,
            username: a.username,
            displayName: a.displayName,
            avatarUrl: a.avatarUrl,
            followersCount: a.followersCount,
            likesCount: a.likesCount,
            videoCount: a.videoCount,
            shopId: a.shopId,
            shopName: a.shopName,
            shopStatus: a.shopStatus,
            status: a.status,
            lastSyncAt: a.lastSyncAt,
            syncError: a.syncError,
            autoSync: a.autoSync,
            liveEnabled: a.liveEnabled,
            connectedAt: a.connectedAt,
            productCount: a._count.products,
            videoCountDb: a._count.videos,
            orderCount: a._count.orders,
            liveStreamCount: a._count.liveStreams,
          })),
          total,
        })
      }

      case "products": {
        // Get products synced to TikTok Shop
        if (!accountId) {
          return NextResponse.json(
            { error: "accountId is required" },
            { status: 400 }
          )
        }

        const [products, total] = await Promise.all([
          prisma.tikTokProduct.findMany({
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
          prisma.tikTokProduct.count({ where: { accountId } }),
        ])

        return NextResponse.json({
          products: products.map((p) => ({
            id: p.id,
            productId: p.productId,
            tiktokProductId: p.tiktokProductId,
            syncStatus: p.syncStatus,
            lastSyncAt: p.lastSyncAt,
            syncError: p.syncError,
            impressions: p.impressions,
            clicks: p.clicks,
            addToCart: p.addToCart,
            purchases: p.purchases,
            revenue: Number(p.revenue),
            videosTagged: p.videosTagged,
            product: p.product,
          })),
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        })
      }

      case "videos": {
        // Get TikTok videos with product tags
        if (!accountId) {
          return NextResponse.json(
            { error: "accountId is required" },
            { status: 400 }
          )
        }

        const [videos, total] = await Promise.all([
          prisma.tikTokVideo.findMany({
            where: { accountId },
            skip,
            take: limit,
            orderBy: { postedAt: "desc" },
            include: {
              taggedProducts: {
                include: {
                  ttProduct: {
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
              liveStream: {
                select: {
                  id: true,
                  title: true,
                  status: true,
                },
              },
            },
          }),
          prisma.tikTokVideo.count({ where: { accountId } }),
        ])

        return NextResponse.json({
          videos: videos.map((v) => ({
            id: v.id,
            videoId: v.videoId,
            title: v.title,
            description: v.description ? v.description.substring(0, 100) + "..." : null,
            coverUrl: v.coverUrl,
            shareUrl: v.shareUrl,
            duration: v.duration,
            likeCount: v.likeCount,
            commentCount: v.commentCount,
            shareCount: v.shareCount,
            viewCount: v.viewCount,
            playCount: v.playCount,
            productClicks: v.productClicks,
            conversions: v.conversions,
            revenue: Number(v.revenue),
            isLive: v.isLive,
            liveStream: v.liveStream,
            postedAt: v.postedAt,
            taggedProducts: v.taggedProducts.map((t) => ({
              productId: t.ttProduct.product.id,
              name: t.ttProduct.product.nameEn,
              imageUrl: t.ttProduct.product.imageUrl,
              clicks: t.clicks,
              timestamp: t.timestamp,
            })),
          })),
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        })
      }

      case "orders": {
        // Get orders from TikTok Shop
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
          prisma.tikTokOrder.findMany({
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
          prisma.tikTokOrder.count({ where }),
        ])

        return NextResponse.json({
          orders: orders.map((o) => ({
            id: o.id,
            tiktokOrderId: o.tiktokOrderId,
            buyerName: o.buyerName,
            buyerEmail: o.buyerEmail,
            items: o.items,
            totalUsd: Number(o.totalUsd),
            totalKhr: Number(o.totalKhr),
            tiktokStatus: o.tiktokStatus,
            importStatus: o.importStatus,
            importError: o.importError,
            sourceVideoId: o.sourceVideoId,
            sourceLiveId: o.sourceLiveId,
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

      case "live-streams": {
        // Get TikTok Live streams
        if (!accountId) {
          return NextResponse.json(
            { error: "accountId is required" },
            { status: 400 }
          )
        }

        const status = searchParams.get("liveStatus") // SCHEDULED, LIVE, ENDED, CANCELLED

        const where = {
          accountId,
          ...(status && { status: status as "SCHEDULED" | "LIVE" | "ENDED" | "CANCELLED" }),
        }

        const [liveStreams, total] = await Promise.all([
          prisma.tikTokLiveStream.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
          }),
          prisma.tikTokLiveStream.count({ where }),
        ])

        return NextResponse.json({
          liveStreams: liveStreams.map((ls) => ({
            id: ls.id,
            streamId: ls.streamId,
            title: ls.title,
            coverUrl: ls.coverUrl,
            status: ls.status,
            scheduledAt: ls.scheduledAt,
            startedAt: ls.startedAt,
            endedAt: ls.endedAt,
            duration: ls.duration,
            peakViewers: ls.peakViewers,
            totalViewers: ls.totalViewers,
            likeCount: ls.likeCount,
            commentCount: ls.commentCount,
            shareCount: ls.shareCount,
            giftCount: ls.giftCount,
            productClicks: ls.productClicks,
            addToCart: ls.addToCart,
            conversions: ls.conversions,
            revenue: Number(ls.revenue),
            featuredProducts: ls.featuredProducts,
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
        const account = await prisma.tikTokAccount.findUnique({
          where: { id: accountId },
          select: {
            username: true,
            displayName: true,
            followersCount: true,
            likesCount: true,
            videoCount: true,
            shopName: true,
            shopStatus: true,
            lastSyncAt: true,
            liveEnabled: true,
          },
        })

        // Aggregate video metrics
        const videoStats = await prisma.tikTokVideo.aggregate({
          where: { accountId, ...dateFilter },
          _sum: {
            likeCount: true,
            commentCount: true,
            shareCount: true,
            viewCount: true,
            playCount: true,
            productClicks: true,
            conversions: true,
            revenue: true,
          },
          _avg: {
            likeCount: true,
            viewCount: true,
          },
          _count: true,
        })

        // Get top performing videos
        const topVideos = await prisma.tikTokVideo.findMany({
          where: { accountId, ...dateFilter },
          orderBy: { productClicks: "desc" },
          take: 5,
          select: {
            id: true,
            videoId: true,
            title: true,
            coverUrl: true,
            shareUrl: true,
            viewCount: true,
            productClicks: true,
            conversions: true,
            revenue: true,
            postedAt: true,
          },
        })

        // Get top products by performance
        const topProducts = await prisma.tikTokProduct.findMany({
          where: { accountId },
          orderBy: { purchases: "desc" },
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
        const orderStats = await prisma.tikTokOrder.aggregate({
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

        // Live stream stats
        const liveStats = await prisma.tikTokLiveStream.aggregate({
          where: {
            accountId,
            status: "ENDED",
            ...(startDate && endDate ? {
              startedAt: {
                gte: new Date(startDate),
                lte: new Date(endDate),
              },
            } : {}),
          },
          _sum: {
            totalViewers: true,
            conversions: true,
            revenue: true,
          },
          _avg: {
            peakViewers: true,
            duration: true,
          },
          _count: true,
        })

        return NextResponse.json({
          account,
          summary: {
            totalVideos: videoStats._count,
            totalViews: videoStats._sum.viewCount || 0,
            totalPlays: videoStats._sum.playCount || 0,
            totalEngagement: (videoStats._sum.likeCount || 0) + (videoStats._sum.commentCount || 0) + (videoStats._sum.shareCount || 0),
            avgViews: Math.round(videoStats._avg.viewCount || 0),
            avgLikes: Math.round(videoStats._avg.likeCount || 0),
            totalProductClicks: videoStats._sum.productClicks || 0,
            totalConversions: videoStats._sum.conversions || 0,
            totalRevenue: Number(videoStats._sum.revenue || 0),
            ordersImported: orderStats._count,
            orderRevenue: Number(orderStats._sum.totalUsd || 0),
          },
          liveStats: {
            totalStreams: liveStats._count,
            totalViewers: liveStats._sum.totalViewers || 0,
            avgPeakViewers: Math.round(liveStats._avg.peakViewers || 0),
            avgDuration: Math.round(liveStats._avg.duration || 0),
            liveConversions: liveStats._sum.conversions || 0,
            liveRevenue: Number(liveStats._sum.revenue || 0),
          },
          topVideos: topVideos.map((v) => ({
            id: v.id,
            videoId: v.videoId,
            title: v.title,
            coverUrl: v.coverUrl,
            shareUrl: v.shareUrl,
            viewCount: v.viewCount,
            productClicks: v.productClicks,
            conversions: v.conversions,
            revenue: Number(v.revenue),
            postedAt: v.postedAt,
          })),
          topProducts: topProducts.map((p) => ({
            id: p.id,
            name: p.product.nameEn,
            imageUrl: p.product.imageUrl,
            price: Number(p.product.priceUsd),
            impressions: p.impressions,
            clicks: p.clicks,
            addToCart: p.addToCart,
            purchases: p.purchases,
            revenue: Number(p.revenue),
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
    console.error("TikTok API GET error:", error)
    return NextResponse.json(
      { error: "Failed to fetch TikTok data" },
      { status: 500 }
    )
  }
}

// POST /api/tiktok - Connect account, sync products, tag videos, import orders, manage live streams
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case "connect": {
        // Connect TikTok Business Account
        // In production, this would exchange OAuth code for access token
        const {
          tiktokId,
          username,
          displayName,
          avatarUrl,
          accessToken,
          tokenExpiresAt,
          refreshToken,
          shopId,
          shopName,
        } = body

        if (!tiktokId || !username || !accessToken) {
          return NextResponse.json(
            { error: "tiktokId, username, and accessToken are required" },
            { status: 400 }
          )
        }

        // Check if already connected
        const existing = await prisma.tikTokAccount.findUnique({
          where: { tiktokId },
        })

        if (existing) {
          // Update existing connection
          const updated = await prisma.tikTokAccount.update({
            where: { id: existing.id },
            data: {
              username,
              displayName,
              avatarUrl,
              accessToken,
              tokenExpiresAt: tokenExpiresAt ? new Date(tokenExpiresAt) : null,
              refreshToken,
              shopId,
              shopName,
              status: "ACTIVE",
              syncError: null,
            },
          })
          return NextResponse.json({ account: updated, reconnected: true })
        }

        // Create new connection
        const account = await prisma.tikTokAccount.create({
          data: {
            tiktokId,
            username,
            displayName,
            avatarUrl,
            accessToken,
            tokenExpiresAt: tokenExpiresAt ? new Date(tokenExpiresAt) : null,
            refreshToken,
            shopId,
            shopName,
            shopStatus: shopId ? "ACTIVE" : null,
            status: "ACTIVE",
          },
        })

        return NextResponse.json({ account, created: true })
      }

      case "sync_products": {
        // Sync products to TikTok Shop catalog
        const { accountId, productIds } = body

        if (!accountId) {
          return NextResponse.json(
            { error: "accountId is required" },
            { status: 400 }
          )
        }

        // Verify account exists
        const account = await prisma.tikTokAccount.findUnique({
          where: { id: accountId },
        })

        if (!account) {
          return NextResponse.json(
            { error: "TikTok account not found" },
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

        // Create or update TikTok products
        const results = await Promise.all(
          products.map(async (product) => {
            // In production, this would call TikTok Shop API
            // to sync product to catalog
            const tiktokProductId = `tt_${product.sku}_${Date.now()}`

            const existing = await prisma.tikTokProduct.findUnique({
              where: {
                accountId_productId: {
                  accountId,
                  productId: product.id,
                },
              },
            })

            if (existing) {
              // Update sync status
              return prisma.tikTokProduct.update({
                where: { id: existing.id },
                data: {
                  syncStatus: "SYNCED",
                  lastSyncAt: new Date(),
                  syncError: null,
                  tiktokProductId,
                },
              })
            }

            // Create new sync record
            return prisma.tikTokProduct.create({
              data: {
                accountId,
                productId: product.id,
                tiktokProductId,
                syncStatus: "SYNCED",
                lastSyncAt: new Date(),
              },
            })
          })
        )

        // Update account last sync
        await prisma.tikTokAccount.update({
          where: { id: accountId },
          data: { lastSyncAt: new Date() },
        })

        return NextResponse.json({
          synced: results.length,
          message: `Successfully synced ${results.length} products to TikTok Shop`,
        })
      }

      case "tag_video": {
        // Tag products in a TikTok video
        const { accountId, videoId, title, description, coverUrl, videoUrl, shareUrl, duration, postedAt, productTags, isLive, liveStreamId } = body

        if (!accountId || !videoId || !shareUrl) {
          return NextResponse.json(
            { error: "accountId, videoId, and shareUrl are required" },
            { status: 400 }
          )
        }

        // Create or update video
        let video = await prisma.tikTokVideo.findUnique({
          where: { videoId },
        })

        if (!video) {
          video = await prisma.tikTokVideo.create({
            data: {
              accountId,
              videoId,
              title,
              description,
              coverUrl,
              videoUrl,
              shareUrl,
              duration: duration || 0,
              isLive: isLive || false,
              liveStreamId,
              postedAt: postedAt ? new Date(postedAt) : new Date(),
            },
          })
        }

        // Add product tags
        if (productTags && productTags.length > 0) {
          // Get TikTok products for these product IDs
          const ttProducts = await prisma.tikTokProduct.findMany({
            where: {
              accountId,
              productId: { in: productTags.map((t: { productId: string }) => t.productId) },
            },
          })

          // Create tags
          await Promise.all(
            productTags.map(async (tag: { productId: string; timestamp?: number }) => {
              const ttProduct = ttProducts.find((p) => p.productId === tag.productId)
              if (!ttProduct) return null

              // Check if tag already exists
              const existing = await prisma.tikTokProductTag.findUnique({
                where: {
                  videoId_productId: {
                    videoId: video!.id,
                    productId: ttProduct.id,
                  },
                },
              })

              if (existing) {
                return prisma.tikTokProductTag.update({
                  where: { id: existing.id },
                  data: {
                    timestamp: tag.timestamp,
                  },
                })
              }

              return prisma.tikTokProductTag.create({
                data: {
                  videoId: video!.id,
                  productId: ttProduct.id,
                  timestamp: tag.timestamp,
                },
              })
            })
          )

          // Update videos tagged count
          await Promise.all(
            ttProducts.map((p) =>
              prisma.tikTokProduct.update({
                where: { id: p.id },
                data: { videosTagged: { increment: 1 } },
              })
            )
          )
        }

        return NextResponse.json({
          video,
          message: "Video tagged successfully",
        })
      }

      case "import_order": {
        // Import order from TikTok Shop
        const {
          accountId,
          tiktokOrderId,
          buyerName,
          buyerEmail,
          buyerPhone,
          items,
          subtotalUsd,
          shippingUsd,
          taxUsd,
          totalUsd,
          shippingAddress,
          tiktokStatus,
          sourceVideoId,
          sourceLiveId,
          orderedAt,
        } = body

        if (!accountId || !tiktokOrderId || !buyerName || !items || !totalUsd) {
          return NextResponse.json(
            { error: "Missing required order fields" },
            { status: 400 }
          )
        }

        // Check if order already imported
        const existing = await prisma.tikTokOrder.findUnique({
          where: { tiktokOrderId },
        })

        if (existing) {
          return NextResponse.json(
            { error: "Order already imported", order: existing },
            { status: 409 }
          )
        }

        const KHR_RATE = 4000

        // Create TikTok order record
        const ttOrder = await prisma.tikTokOrder.create({
          data: {
            accountId,
            tiktokOrderId,
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
            tiktokStatus: tiktokStatus || "PENDING",
            importStatus: "PENDING",
            sourceVideoId,
            sourceLiveId,
            orderedAt: orderedAt ? new Date(orderedAt) : new Date(),
          },
        })

        return NextResponse.json({
          order: ttOrder,
          message: "Order imported successfully",
        })
      }

      case "convert_order": {
        // Convert TikTok order to regular order
        const { tiktokOrderId } = body

        if (!tiktokOrderId) {
          return NextResponse.json(
            { error: "tiktokOrderId is required" },
            { status: 400 }
          )
        }

        const ttOrder = await prisma.tikTokOrder.findUnique({
          where: { tiktokOrderId },
        })

        if (!ttOrder) {
          return NextResponse.json(
            { error: "TikTok order not found" },
            { status: 404 }
          )
        }

        if (ttOrder.importStatus === "IMPORTED" && ttOrder.orderId) {
          return NextResponse.json(
            { error: "Order already converted", orderId: ttOrder.orderId },
            { status: 409 }
          )
        }

        // Find or create customer
        let customer = null
        if (ttOrder.buyerEmail) {
          customer = await prisma.customer.findFirst({
            where: { email: ttOrder.buyerEmail },
          })
        }

        if (!customer) {
          customer = await prisma.customer.create({
            data: {
              name: ttOrder.buyerName,
              email: ttOrder.buyerEmail || `tiktok_${ttOrder.tiktokOrderId}@placeholder.com`,
              phone: ttOrder.buyerPhone,
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
            totalUsd: ttOrder.totalUsd,
            totalKhr: Number(ttOrder.totalKhr),
            currency: "USD",
            channel: "TIKTOK",
            note: `Imported from TikTok order: ${ttOrder.tiktokOrderId}`,
          },
        })

        // Create order items
        const orderItems = ttOrder.items as Array<{
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

        // Update TikTok order
        await prisma.tikTokOrder.update({
          where: { id: ttOrder.id },
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

      case "schedule_live": {
        // Schedule a TikTok Live shopping stream
        const { accountId, title, scheduledAt, coverUrl, featuredProducts } = body

        if (!accountId || !title) {
          return NextResponse.json(
            { error: "accountId and title are required" },
            { status: 400 }
          )
        }

        // Verify account exists and has live enabled
        const account = await prisma.tikTokAccount.findUnique({
          where: { id: accountId },
        })

        if (!account) {
          return NextResponse.json(
            { error: "TikTok account not found" },
            { status: 404 }
          )
        }

        if (!account.liveEnabled) {
          return NextResponse.json(
            { error: "TikTok Live shopping is not enabled for this account" },
            { status: 400 }
          )
        }

        // In production, this would call TikTok Live API
        const streamId = `live_${Date.now()}`

        const liveStream = await prisma.tikTokLiveStream.create({
          data: {
            accountId,
            streamId,
            title,
            coverUrl,
            status: "SCHEDULED",
            scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
            featuredProducts,
          },
        })

        return NextResponse.json({
          liveStream,
          message: "Live stream scheduled successfully",
        })
      }

      case "update_live_status": {
        // Update live stream status
        const { streamId, status, peakViewers, totalViewers, likeCount, commentCount, shareCount, giftCount, productClicks, addToCart, conversions, revenue } = body

        if (!streamId || !status) {
          return NextResponse.json(
            { error: "streamId and status are required" },
            { status: 400 }
          )
        }

        const updateData: Record<string, unknown> = { status }

        if (status === "LIVE") {
          updateData.startedAt = new Date()
        } else if (status === "ENDED") {
          updateData.endedAt = new Date()
        }

        // Add metrics if provided
        if (peakViewers !== undefined) updateData.peakViewers = peakViewers
        if (totalViewers !== undefined) updateData.totalViewers = totalViewers
        if (likeCount !== undefined) updateData.likeCount = likeCount
        if (commentCount !== undefined) updateData.commentCount = commentCount
        if (shareCount !== undefined) updateData.shareCount = shareCount
        if (giftCount !== undefined) updateData.giftCount = giftCount
        if (productClicks !== undefined) updateData.productClicks = productClicks
        if (addToCart !== undefined) updateData.addToCart = addToCart
        if (conversions !== undefined) updateData.conversions = conversions
        if (revenue !== undefined) updateData.revenue = revenue

        const liveStream = await prisma.tikTokLiveStream.update({
          where: { streamId },
          data: updateData,
        })

        // Calculate duration if ended
        if (status === "ENDED" && liveStream.startedAt) {
          const duration = Math.round((new Date().getTime() - new Date(liveStream.startedAt).getTime()) / 1000)
          await prisma.tikTokLiveStream.update({
            where: { id: liveStream.id },
            data: { duration },
          })
        }

        return NextResponse.json({
          liveStream,
          message: `Live stream status updated to ${status}`,
        })
      }

      case "disconnect": {
        // Disconnect TikTok account
        const { accountId } = body

        if (!accountId) {
          return NextResponse.json(
            { error: "accountId is required" },
            { status: 400 }
          )
        }

        await prisma.tikTokAccount.update({
          where: { id: accountId },
          data: {
            status: "DISCONNECTED",
            accessToken: "",
            refreshToken: null,
          },
        })

        return NextResponse.json({
          message: "TikTok account disconnected successfully",
        })
      }

      case "update_settings": {
        // Update account settings
        const { accountId, autoSync, syncProducts, syncOrders, liveEnabled } = body

        if (!accountId) {
          return NextResponse.json(
            { error: "accountId is required" },
            { status: 400 }
          )
        }

        const updateData: Record<string, boolean> = {}
        if (autoSync !== undefined) updateData.autoSync = autoSync
        if (syncProducts !== undefined) updateData.syncProducts = syncProducts
        if (syncOrders !== undefined) updateData.syncOrders = syncOrders
        if (liveEnabled !== undefined) updateData.liveEnabled = liveEnabled

        const account = await prisma.tikTokAccount.update({
          where: { id: accountId },
          data: updateData,
        })

        return NextResponse.json({
          account,
          message: "Settings updated successfully",
        })
      }

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error("TikTok API POST error:", error)
    return NextResponse.json(
      { error: "Failed to process TikTok request" },
      { status: 500 }
    )
  }
}
