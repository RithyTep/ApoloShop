import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/questions/[id] - Get a single question with its answers
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: "Question ID is required" }, { status: 400 })
    }

    const question = await prisma.productQuestion.findUnique({
      where: { id },
      select: {
        id: true,
        question: true,
        status: true,
        guestName: true,
        guestEmail: true,
        createdAt: true,
        updatedAt: true,
        customer: {
          select: { id: true, name: true, email: true },
        },
        product: {
          select: {
            id: true,
            nameEn: true,
            nameKh: true,
            imageUrl: true,
          },
        },
        answers: {
          select: {
            id: true,
            answer: true,
            isOfficial: true,
            guestName: true,
            helpfulVotes: true,
            unhelpfulVotes: true,
            createdAt: true,
            customer: {
              select: { id: true, name: true },
            },
          },
          orderBy: [
            { isOfficial: "desc" },
            { helpfulVotes: "desc" },
            { createdAt: "asc" },
          ],
        },
      },
    })

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 })
    }

    return NextResponse.json({
      id: question.id,
      question: question.question,
      status: question.status,
      askerName: question.customer?.name || question.guestName || "Anonymous",
      askerEmail: question.customer?.email || question.guestEmail || null,
      customerId: question.customer?.id || null,
      product: question.product,
      answers: question.answers.map((a) => ({
        id: a.id,
        answer: a.answer,
        isOfficial: a.isOfficial,
        responderName:
          a.customer?.name || a.guestName || (a.isOfficial ? "Seller" : "Anonymous"),
        helpfulVotes: a.helpfulVotes,
        unhelpfulVotes: a.unhelpfulVotes,
        createdAt: a.createdAt,
      })),
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
    })
  } catch (error) {
    console.error("Get question error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH /api/questions/[id] - Update question status (moderation)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    if (!id) {
      return NextResponse.json({ error: "Question ID is required" }, { status: 400 })
    }

    const { status } = body

    // Validate status
    if (!status || !["PENDING", "APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be PENDING, APPROVED, or REJECTED" },
        { status: 400 }
      )
    }

    // Check if question exists
    const existingQuestion = await prisma.productQuestion.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!existingQuestion) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 })
    }

    // Update the question status
    const updatedQuestion = await prisma.productQuestion.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        question: true,
        status: true,
        guestName: true,
        createdAt: true,
        updatedAt: true,
        customer: {
          select: { id: true, name: true },
        },
        _count: {
          select: { answers: true },
        },
      },
    })

    return NextResponse.json({
      message: `Question ${status.toLowerCase()}`,
      question: {
        id: updatedQuestion.id,
        question: updatedQuestion.question,
        status: updatedQuestion.status,
        askerName: updatedQuestion.customer?.name || updatedQuestion.guestName || "Anonymous",
        answerCount: updatedQuestion._count.answers,
        createdAt: updatedQuestion.createdAt,
        updatedAt: updatedQuestion.updatedAt,
      },
    })
  } catch (error) {
    console.error("Update question error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/questions/[id] - Delete a question
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: "Question ID is required" }, { status: 400 })
    }

    // Check if question exists
    const existingQuestion = await prisma.productQuestion.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!existingQuestion) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 })
    }

    // Delete the question (cascades to answers and votes)
    await prisma.productQuestion.delete({
      where: { id },
    })

    return NextResponse.json({
      message: "Question deleted successfully",
    })
  } catch (error) {
    console.error("Delete question error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
