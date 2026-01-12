import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import {
  roleDefinitions,
  defaultRolePermissions,
  isSystemRole,
  convertToLegacyFormat,
  SystemRoles,
} from "@/lib/rbac"

const permissionsSchema = z.object({
  products: z.array(z.enum(["read", "write", "delete", "export"])).optional(),
  orders: z.array(z.enum(["read", "write", "delete"])).optional(),
  customers: z.array(z.enum(["read", "write", "delete"])).optional(),
  inventory: z.array(z.enum(["read", "write"])).optional(),
  promotions: z.array(z.enum(["read", "write", "delete"])).optional(),
  content: z.array(z.enum(["read", "write", "delete"])).optional(),
  users: z.array(z.enum(["read", "write", "delete"])).optional(),
  roles: z.array(z.enum(["read", "write", "manage"])).optional(),
  settings: z.array(z.enum(["read", "write"])).optional(),
  reports: z.array(z.enum(["read", "export"])).optional(),
  categories: z.array(z.enum(["read", "write", "delete"])).optional(),
  payments: z.array(z.enum(["read", "write"])).optional(),
  reviews: z.array(z.enum(["read", "write", "delete"])).optional(),
  audit_logs: z.array(z.enum(["read"])).optional(),
  clients: z.array(z.enum(["read", "write", "delete", "manage"])).optional(),
})

const roleSchema = z.object({
  name: z.string().min(1, "Role name is required"),
  displayName: z.string().optional(),
  description: z.string().optional(),
  permissions: permissionsSchema,
})

// GET /api/roles - List roles with permission details
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includePermissions = searchParams.get("includePermissions") === "true"

    const roles = await prisma.role.findMany({
      include: {
        _count: {
          select: { users: true },
        },
        ...(includePermissions && {
          rolePermissions: {
            include: { permission: true },
          },
        }),
      },
      orderBy: { name: "asc" },
    })

    // Transform roles to include both legacy and new permission formats
    const transformedRoles = roles.map((role) => {
      const baseRole = {
        id: role.id,
        name: role.name,
        displayName: role.displayName || role.name,
        description: role.description,
        permissions: role.permissions,
        isSystem: role.isSystem,
        _count: role._count,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
      }

      if (includePermissions && "rolePermissions" in role) {
        return {
          ...baseRole,
          permissionNames: (role.rolePermissions as Array<{ permission: { name: string } }>).map(
            (rp) => rp.permission.name
          ),
          rolePermissions: role.rolePermissions,
        }
      }

      return baseRole
    })

    return NextResponse.json({ roles: transformedRoles })
  } catch (error) {
    console.error("Get roles error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/roles - Create role
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Check if this is a seed request
    if (body.seed === true) {
      return seedSystemRoles()
    }

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

    // Prevent creating system role names
    if (isSystemRole(data.name)) {
      return NextResponse.json(
        { error: "Cannot create role with system role name" },
        { status: 400 }
      )
    }

    const role = await prisma.role.create({
      data: {
        name: data.name,
        displayName: data.displayName || data.name,
        description: data.description,
        permissions: data.permissions,
        isSystem: false,
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
  displayName: z.string().optional(),
  description: z.string().optional(),
  permissions: permissionsSchema.optional(),
  // For updating via new permission system
  permissionNames: z.array(z.string()).optional(),
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

    const { id, permissionNames, ...data } = result.data

    // Check if role exists
    const existing = await prisma.role.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 })
    }

    // Prevent renaming system roles
    if (existing.isSystem && data.name && data.name !== existing.name) {
      return NextResponse.json(
        { error: "Cannot rename system roles" },
        { status: 400 }
      )
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

    // If permissionNames provided, update role permissions and convert to legacy format
    if (permissionNames) {
      // Delete existing role permissions
      await prisma.rolePermission.deleteMany({
        where: { roleId: id },
      })

      // Find permissions by name
      const permissions = await prisma.permission.findMany({
        where: { name: { in: permissionNames } },
      })

      // Create new role permissions
      if (permissions.length > 0) {
        await prisma.rolePermission.createMany({
          data: permissions.map((p) => ({
            roleId: id,
            permissionId: p.id,
          })),
        })
      }

      // Convert to legacy format for backwards compatibility
      data.permissions = convertToLegacyFormat(permissionNames)
    }

    const role = await prisma.role.update({
      where: { id },
      data,
      include: {
        _count: { select: { users: true } },
        rolePermissions: {
          include: { permission: true },
        },
      },
    })

    return NextResponse.json({
      ...role,
      permissionNames: role.rolePermissions.map((rp) => rp.permission.name),
    })
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

    // Prevent deletion of system roles
    if (existing.isSystem) {
      return NextResponse.json(
        { error: "Cannot delete system roles" },
        { status: 400 }
      )
    }

    // Prevent deletion if role has users
    if (existing._count.users > 0) {
      return NextResponse.json(
        { error: "Cannot delete role with assigned users. Reassign users first." },
        { status: 409 }
      )
    }

    // Delete role permissions first, then role
    await prisma.rolePermission.deleteMany({ where: { roleId: id } })
    await prisma.role.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete role error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * Seed system roles with default permissions
 */
async function seedSystemRoles() {
  const created: string[] = []
  const updated: string[] = []

  for (const roleDef of roleDefinitions) {
    const defaultPerms = defaultRolePermissions[roleDef.name] || []
    const legacyPerms = convertToLegacyFormat(defaultPerms)

    const existing = await prisma.role.findUnique({
      where: { name: roleDef.name },
    })

    if (existing) {
      // Update display name and description, keep existing permissions
      await prisma.role.update({
        where: { id: existing.id },
        data: {
          displayName: roleDef.displayName,
          description: roleDef.description,
          isSystem: true,
        },
      })
      updated.push(roleDef.name)
    } else {
      // Create new role with default permissions
      await prisma.role.create({
        data: {
          name: roleDef.name,
          displayName: roleDef.displayName,
          description: roleDef.description,
          permissions: legacyPerms,
          isSystem: true,
        },
      })
      created.push(roleDef.name)
    }
  }

  return NextResponse.json({
    success: true,
    created,
    updated,
    systemRoles: Object.values(SystemRoles),
  })
}
