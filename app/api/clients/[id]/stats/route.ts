import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Helper to check super admin role
async function isSuperAdmin(request: NextRequest): Promise<boolean> {
  const adminKey = request.headers.get("x-admin-key")
  const expectedKey = process.env.SUPER_ADMIN_KEY

  if (expectedKey) {
    return adminKey === expectedKey
  }

  return process.env.NODE_ENV === "development"
}

// GET /api/clients/[id]/stats - Get client with detailed statistics
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isSuperAdmin(request))) {
      return NextResponse.json({ error: "Forbidden: Super admin access required" }, { status: 403 })
    }

    const { id } = await params

    // Fetch client with counts
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
            orders: true,
            customers: true,
          },
        },
      },
    })

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    // Calculate revenue stats from orders
    const orderStats = await prisma.order.aggregate({
      where: {
        clientId: id,
        status: {
          in: ["COMPLETED", "CONFIRMED", "PREPARING", "READY"],
        },
      },
      _sum: {
        totalUsd: true,
        totalKhr: true,
      },
      _count: {
        id: true,
      },
    })

    const totalRevenue = Number(orderStats._sum.totalUsd || 0)
    const totalRevenueKhr = Number(orderStats._sum.totalKhr || 0)
    const orderCount = orderStats._count.id || 0
    const averageOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0

    const stats = {
      totalRevenue,
      totalRevenueKhr,
      orderCount,
      averageOrderValue,
      productCount: client._count.products,
      customerCount: client._count.customers,
    }

    return NextResponse.json({
      client,
      stats,
    })
  } catch (error) {
    console.error("Get client stats error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
