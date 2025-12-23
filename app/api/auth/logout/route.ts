import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value

    if (token) {
      // Delete session from database
      await prisma.session.deleteMany({
        where: { token },
      })
    }

    // Clear cookie
    const response = NextResponse.json({ success: true })
    response.cookies.delete("auth-token")

    return response
  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
