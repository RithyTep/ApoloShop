import { NextRequest, NextResponse } from "next/server"
import { verifyToken, TokenPayload } from "./jwt"
import { prisma } from "./prisma"

export type AuthenticatedRequest = NextRequest & {
  user: {
    id: string
    email: string
    name: string
    role: string
    permissions: Record<string, string[]>
  }
}

export function withAuth(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    try {
      const token = request.cookies.get("auth-token")?.value

      if (!token) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        )
      }

      const payload = verifyToken(token) as TokenPayload

      // Verify session exists and is valid
      const session = await prisma.session.findUnique({
        where: { token },
        include: {
          user: {
            include: { role: true },
          },
        },
      })

      if (!session || session.expiresAt < new Date()) {
        return NextResponse.json({ error: "Session expired" }, { status: 401 })
      }

      if (!session.user.isActive) {
        return NextResponse.json({ error: "Account disabled" }, { status: 403 })
      }

      // Attach user to request
      const authenticatedRequest = request as AuthenticatedRequest
      authenticatedRequest.user = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role.name,
        permissions: session.user.role.permissions as Record<string, string[]>,
      }

      return handler(authenticatedRequest)
    } catch (error) {
      console.error("Auth error:", error)
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }
  }
}

export function requirePermission(resource: string, action: string) {
  return (
    handler: (request: AuthenticatedRequest) => Promise<NextResponse>
  ) => {
    return async (request: AuthenticatedRequest) => {
      const permissions = request.user.permissions

      if (!permissions[resource] || !permissions[resource].includes(action)) {
        return NextResponse.json(
          { error: "Insufficient permissions" },
          { status: 403 }
        )
      }

      return handler(request)
    }
  }
}

// Helper to extract user from request without requiring auth
export async function getOptionalUser(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value
    if (!token) return null

    const payload = verifyToken(token)

    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          include: { role: true },
        },
      },
    })

    if (!session || session.expiresAt < new Date() || !session.user.isActive) {
      return null
    }

    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role.name,
      permissions: session.user.role.permissions as Record<string, string[]>,
    }
  } catch {
    return null
  }
}
