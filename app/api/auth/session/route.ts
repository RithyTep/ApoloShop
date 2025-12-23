import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value

    if (!token) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 200 })
    }

    // Verify token
    const payload = verifyToken(token)

    // Get session with user
    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          include: { role: true },
        },
      },
    })

    if (!session || session.expiresAt < new Date() || !session.user.isActive) {
      const response = NextResponse.json({ authenticated: false, user: null }, { status: 200 })
      response.cookies.delete("auth-token")
      return response
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role.name,
        permissions: session.user.role.permissions,
      },
    })
  } catch (error) {
    console.error("Session error:", error)
    const response = NextResponse.json({ authenticated: false, user: null }, { status: 200 })
    response.cookies.delete("auth-token")
    return response
  }
}
