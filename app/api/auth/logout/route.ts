import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logLogout } from "@/lib/security-log"

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value

    // Get user info for security logging before deleting session
    let userId: string | undefined
    let userName: string | undefined
    if (token) {
      const session = await prisma.session.findUnique({
        where: { token },
        include: { user: { select: { id: true, name: true } } },
      })
      if (session?.user) {
        userId = session.user.id
        userName = session.user.name
      }

      // Delete session from database
      await prisma.session.deleteMany({
        where: { token },
      })

      // Log logout event
      if (userId && userName) {
        logLogout(userId, userName, request)
      }
    }

    // Clear all auth cookies
    const response = NextResponse.json({ success: true })
    response.cookies.delete("auth-token")
    response.cookies.delete("refresh-token")

    return response
  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
