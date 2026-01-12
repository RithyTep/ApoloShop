import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const feedbackSchema = z.object({
  articleId: z.string().min(1, "Article ID is required"),
  helpful: z.boolean(),
})

// POST /api/help/articles/feedback - Submit article helpfulness feedback
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const result = feedbackSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { articleId, helpful } = result.data

    // Check if article exists
    const existing = await prisma.helpArticle.findUnique({ where: { id: articleId } })
    if (!existing) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 })
    }

    // Update helpfulness counter
    await prisma.helpArticle.update({
      where: { id: articleId },
      data: helpful
        ? { helpfulYes: { increment: 1 } }
        : { helpfulNo: { increment: 1 } },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Submit article feedback error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
