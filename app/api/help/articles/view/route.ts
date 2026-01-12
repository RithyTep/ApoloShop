import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// POST /api/help/articles/view - Track article view
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { articleId } = body

    if (!articleId) {
      return NextResponse.json({ error: "Article ID is required" }, { status: 400 })
    }

    // Increment view count (non-blocking)
    await prisma.helpArticle.update({
      where: { id: articleId },
      data: { viewCount: { increment: 1 } },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Track article view error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
