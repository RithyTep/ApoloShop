import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import {
  validatePassword,
  hashPassword,
  isPasswordInHistory,
  PASSWORD_CONFIG,
  formatPasswordRequirementsError,
} from "@/lib/password-security"

const userCreateSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z
    .string()
    .min(PASSWORD_CONFIG.minLength, `Password must be at least ${PASSWORD_CONFIG.minLength} characters`)
    .max(PASSWORD_CONFIG.maxLength, `Password must not exceed ${PASSWORD_CONFIG.maxLength} characters`),
  name: z.string().min(1, "Name is required"),
  roleId: z.string().min(1, "Role is required"),
  isActive: z.boolean().default(true),
})

// GET /api/users - List users
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const isActive = searchParams.get("isActive")

    const where: Record<string, unknown> = {}
    if (isActive !== null) {
      where.isActive = isActive === "true"
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        role: true,
      },
      orderBy: { createdAt: "desc" },
    })

    // Remove password hash from response
    const safeUsers = users.map(({ passwordHash, ...user }) => user)

    return NextResponse.json({ users: safeUsers })
  } catch (error) {
    console.error("Get users error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/users - Create user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const result = userCreateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const data = result.data

    // Check email uniqueness
    const existingEmail = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (existingEmail) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 })
    }

    // Check role exists
    const role = await prisma.role.findUnique({ where: { id: data.roleId } })
    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 })
    }

    // Validate password strength
    const passwordValidation = validatePassword(data.password)
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        {
          error: "Password does not meet requirements",
          details: {
            fieldErrors: {
              password: [formatPasswordRequirementsError()],
            },
          },
          requirements: passwordValidation.requirements,
          strength: passwordValidation.strength,
        },
        { status: 400 }
      )
    }

    // Hash password using bcrypt with cost factor 12
    const passwordHash = await hashPassword(data.password)

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
        roleId: data.roleId,
        isActive: data.isActive,
        passwordChangedAt: new Date(), // Track password creation time
      },
      include: {
        role: true,
      },
    })

    // Store initial password in history
    await prisma.passwordHistory.create({
      data: {
        userId: user.id,
        passwordHash,
      },
    })

    // Remove password hash from response
    const { passwordHash: _, ...safeUser } = user

    return NextResponse.json(safeUser, { status: 201 })
  } catch (error) {
    console.error("Create user error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

const userUpdateSchema = z.object({
  id: z.string().min(1, "User ID is required"),
  email: z.string().email().optional(),
  password: z
    .string()
    .min(PASSWORD_CONFIG.minLength)
    .max(PASSWORD_CONFIG.maxLength)
    .optional(),
  name: z.string().min(1).optional(),
  roleId: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
})

// PUT /api/users - Update user
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    const result = userUpdateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { id, password, ...data } = result.data

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check email uniqueness if changed
    if (data.email && data.email !== existing.email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email: data.email },
      })
      if (existingEmail) {
        return NextResponse.json({ error: "Email already exists" }, { status: 409 })
      }
    }

    // Check role exists if changed
    if (data.roleId) {
      const role = await prisma.role.findUnique({ where: { id: data.roleId } })
      if (!role) {
        return NextResponse.json({ error: "Role not found" }, { status: 404 })
      }
    }

    // Prepare update data
    const updateData: Record<string, unknown> = { ...data }

    // Handle password update with enhanced security
    if (password) {
      // Validate password strength
      const passwordValidation = validatePassword(password)
      if (!passwordValidation.isValid) {
        return NextResponse.json(
          {
            error: "Password does not meet requirements",
            details: {
              fieldErrors: {
                password: [formatPasswordRequirementsError()],
              },
            },
            requirements: passwordValidation.requirements,
            strength: passwordValidation.strength,
          },
          { status: 400 }
        )
      }

      // Get last 5 password hashes from history
      const passwordHistory = await prisma.passwordHistory.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        take: PASSWORD_CONFIG.historyCount,
        select: { passwordHash: true },
      })

      // Check if new password matches any in history
      const historyHashes = passwordHistory.map((h) => h.passwordHash)
      const isReused = await isPasswordInHistory(password, historyHashes)

      if (isReused) {
        return NextResponse.json(
          {
            error: "Password has been used recently",
            details: {
              fieldErrors: {
                password: [
                  `Cannot reuse any of your last ${PASSWORD_CONFIG.historyCount} passwords. Please choose a different password.`,
                ],
              },
            },
          },
          { status: 400 }
        )
      }

      // Hash new password with cost factor 12
      const newPasswordHash = await hashPassword(password)
      updateData.passwordHash = newPasswordHash
      updateData.passwordChangedAt = new Date()

      // Store in password history
      await prisma.passwordHistory.create({
        data: {
          userId: id,
          passwordHash: newPasswordHash,
        },
      })

      // Cleanup: keep only last N passwords in history
      const oldHistory = await prisma.passwordHistory.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        skip: PASSWORD_CONFIG.historyCount,
        select: { id: true },
      })

      if (oldHistory.length > 0) {
        await prisma.passwordHistory.deleteMany({
          where: {
            id: { in: oldHistory.map((h) => h.id) },
          },
        })
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        role: true,
      },
    })

    // Remove password hash from response
    const { passwordHash: _, ...safeUser } = user

    return NextResponse.json(safeUser)
  } catch (error) {
    console.error("Update user error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/users - Deactivate user (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Soft delete - deactivate user and delete sessions
    await prisma.$transaction([
      prisma.session.deleteMany({ where: { userId: id } }),
      prisma.user.update({
        where: { id },
        data: { isActive: false },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete user error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
