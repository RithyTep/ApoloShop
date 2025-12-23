import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const permissionsSchema = z.object({
  products: z.array(z.enum(["read", "write", "delete"])).optional(),
  orders: z.array(z.enum(["read", "write", "delete"])).optional(),
  customers: z.array(z.enum(["read", "write", "delete"])).optional(),
  inventory: z.array(z.enum(["read", "write"])).optional(),
  promotions: z.array(z.enum(["read", "write", "delete"])).optional(),
  content: z.array(z.enum(["read", "write", "delete"])).optional(),
  users: z.array(z.enum(["read", "write", "delete"])).optional(),
  settings: z.array(z.enum(["read", "write"])).optional(),
  reports: z.array(z.enum(["read", "export"])).optional(),
})

const roleSchema = z.object({
  name: z.string().min(1, "Role name is required"),
  permissions: permissionsSchema,
})

// GET /api/roles - List roles
export async function GET() {
  try {
    const roles = await prisma.role.findMany({
      include: {
        _count: {
          select: { users: true },
        },
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json({ roles })
  } catch (error) {
    console.error("Get roles error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/roles - Create role
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const result = roleSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const data = result.data

    // Check name uniqueness
    const existingName = await prisma.role.findUnique({
      where: { name: data.name },
    })

    if (existingName) {
      return NextResponse.json({ error: "Role name already exists" }, { status: 409 })
    }

    const role = await prisma.role.create({
      data: {
        name: data.name,
        permissions: data.permissions,
      },
    })

    return NextResponse.json(role, { status: 201 })
  } catch (error) {
    console.error("Create role error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

const roleUpdateSchema = z.object({
  id: z.string().min(1, "Role ID is required"),
  name: z.string().min(1).optional(),
  permissions: permissionsSchema.optional(),
})

// PUT /api/roles - Update role
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    const result = roleUpdateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { id, ...data } = result.data

    // Check if role exists
    const existing = await prisma.role.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 })
    }

    // Check name uniqueness if changed
    if (data.name && data.name !== existing.name) {
      const existingName = await prisma.role.findUnique({
        where: { name: data.name },
      })
      if (existingName) {
        return NextResponse.json({ error: "Role name already exists" }, { status: 409 })
      }
    }

    const role = await prisma.role.update({
      where: { id },
      data,
    })

    return NextResponse.json(role)
  } catch (error) {
    console.error("Update role error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/roles - Delete role
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Role ID is required" }, { status: 400 })
    }

    // Check if role exists and has users
    const existing = await prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    })

    if (!existing) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 })
    }

    // Prevent deletion if role has users
    if (existing._count.users > 0) {
      return NextResponse.json(
        { error: "Cannot delete role with assigned users. Reassign users first." },
        { status: 409 }
      )
    }

    await prisma.role.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete role error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
