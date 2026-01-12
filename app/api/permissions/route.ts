import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  permissionDefinitions,
  getPermissionsByResource,
  Resources,
} from "@/lib/rbac"

/**
 * GET /api/permissions - List all permissions
 *
 * Returns all available permissions organized by resource.
 * Used by admin UI to build the permission matrix.
 */
export async function GET() {
  try {
    // Get permissions from database (if they exist)
    const dbPermissions = await prisma.permission.findMany({
      orderBy: [{ resource: "asc" }, { action: "asc" }],
    })

    // If no permissions in DB, seed from definitions
    if (dbPermissions.length === 0) {
      // Return predefined permissions without seeding
      // (seeding should be done via a separate migration/seed script)
      const permissionsByResource = getPermissionsByResource()

      return NextResponse.json({
        permissions: permissionDefinitions,
        byResource: permissionsByResource,
        resources: Object.values(Resources),
        seeded: false,
      })
    }

    // Group by resource
    const byResource = dbPermissions.reduce(
      (acc, perm) => {
        if (!acc[perm.resource]) {
          acc[perm.resource] = []
        }
        acc[perm.resource].push(perm)
        return acc
      },
      {} as Record<string, typeof dbPermissions>
    )

    return NextResponse.json({
      permissions: dbPermissions,
      byResource,
      resources: Object.values(Resources),
      seeded: true,
    })
  } catch (error) {
    console.error("Get permissions error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * POST /api/permissions/seed - Seed permissions from definitions
 *
 * Creates all predefined permissions in the database.
 * Should be called once during setup or after adding new permissions.
 */
export async function POST() {
  try {
    // Create permissions that don't exist
    const created: string[] = []
    const existing: string[] = []

    for (const perm of permissionDefinitions) {
      const exists = await prisma.permission.findUnique({
        where: { name: perm.name },
      })

      if (exists) {
        existing.push(perm.name)
      } else {
        await prisma.permission.create({
          data: {
            name: perm.name,
            resource: perm.resource,
            action: perm.action,
            displayName: perm.displayName,
            description: perm.description,
          },
        })
        created.push(perm.name)
      }
    }

    return NextResponse.json({
      success: true,
      created,
      existing,
      total: permissionDefinitions.length,
    })
  } catch (error) {
    console.error("Seed permissions error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
