import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email().optional().nullable(),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
})

// GET /api/customers - List customers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const search = searchParams.get("search")

    const where: Record<string, unknown> = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ]
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          orders: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          _count: {
            select: { orders: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.customer.count({ where }),
    ])

    // Calculate total spent for each customer
    const customersWithStats = await Promise.all(
      customers.map(async (customer) => {
        const totalSpent = await prisma.order.aggregate({
          where: {
            customerId: customer.id,
            status: { not: "CANCELLED" },
          },
          _sum: {
            totalUsd: true,
          },
        })

        return {
          ...customer,
          totalSpent: totalSpent._sum.totalUsd || 0,
          orderCount: customer._count.orders,
          lastOrder: customer.orders[0] || null,
        }
      })
    )

    return NextResponse.json({
      customers: customersWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Get customers error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/customers - Create customer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const result = customerSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const data = result.data

    // Check phone uniqueness
    const existingPhone = await prisma.customer.findUnique({
      where: { phone: data.phone },
    })

    if (existingPhone) {
      return NextResponse.json(
        { error: "Phone number already exists" },
        { status: 409 }
      )
    }

    const customer = await prisma.customer.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        notes: data.notes,
        tags: data.tags || [],
      },
    })

    return NextResponse.json(customer, { status: 201 })
  } catch (error) {
    console.error("Create customer error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

const customerUpdateSchema = z.object({
  id: z.string().min(1, "Customer ID is required"),
  name: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
})

// PUT /api/customers - Update customer
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    const result = customerUpdateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { id, ...data } = result.data

    // Check if customer exists
    const existing = await prisma.customer.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    // Check phone uniqueness if changed
    if (data.phone && data.phone !== existing.phone) {
      const existingPhone = await prisma.customer.findUnique({
        where: { phone: data.phone },
      })
      if (existingPhone) {
        return NextResponse.json(
          { error: "Phone number already exists" },
          { status: 409 }
        )
      }
    }

    const customer = await prisma.customer.update({
      where: { id },
      data,
    })

    return NextResponse.json(customer)
  } catch (error) {
    console.error("Update customer error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
