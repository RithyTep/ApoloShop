import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

// Validation schema
const supplierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contactName: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  notes: z.string().optional(),
  leadTimeDays: z.number().int().min(1).max(365).optional(),
  isActive: z.boolean().optional(),
})

// GET /api/suppliers - Get all suppliers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const activeOnly = searchParams.get("activeOnly") === "true"

    const where: Record<string, unknown> = {}
    if (activeOnly) where.isActive = true
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { contactName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ]
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            inventory: true,
            purchaseOrders: true,
          },
        },
      },
    })

    return NextResponse.json({ suppliers })
  } catch (error) {
    console.error("Get suppliers error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/suppliers - Create a new supplier
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = supplierSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const data = result.data
    // Clean empty strings
    if (data.email === "") data.email = undefined
    if (data.website === "") data.website = undefined

    const supplier = await prisma.supplier.create({
      data,
    })

    return NextResponse.json(supplier, { status: 201 })
  } catch (error) {
    console.error("Create supplier error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/suppliers - Update a supplier
const updateSupplierSchema = supplierSchema.partial().extend({
  id: z.string().min(1),
})

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const result = updateSupplierSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { id, ...data } = result.data
    // Clean empty strings
    if (data.email === "") data.email = undefined
    if (data.website === "") data.website = undefined

    const supplier = await prisma.supplier.update({
      where: { id },
      data,
    })

    return NextResponse.json(supplier)
  } catch (error) {
    console.error("Update supplier error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/suppliers - Delete a supplier
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Supplier ID required" }, { status: 400 })
    }

    // Check if supplier is linked to any inventory
    const linkedInventory = await prisma.inventory.count({
      where: { supplierId: id },
    })

    if (linkedInventory > 0) {
      // Instead of deleting, deactivate
      await prisma.supplier.update({
        where: { id },
        data: { isActive: false },
      })
      return NextResponse.json({
        message: "Supplier deactivated (has linked products)",
        deactivated: true,
      })
    }

    await prisma.supplier.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Supplier deleted" })
  } catch (error) {
    console.error("Delete supplier error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
