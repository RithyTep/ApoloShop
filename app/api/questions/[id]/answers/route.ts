import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/questions/[id]/answers - Get answers for a question
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: questionId } = await params

    // Validate question ID
    if (!questionId) {
      return NextResponse.json({ error: "Question ID is required" }, { status: 400 })
    }

    // Check if question exists and is approved
    const question = await prisma.productQuestion.findUnique({
      where: { id: questionId },
      select: { id: true, status: true },
    })

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 })
    }

    // Get answers
    const answers = await prisma.productAnswer.findMany({
      where: { questionId },
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
        { isOfficial: "desc" }, // Official answers first
        { helpfulVotes: "desc" }, // Then by most helpful
        { createdAt: "asc" }, // Then by oldest
      ],
    })

    return NextResponse.json({
      questionId,
      answers: answers.map((a) => ({
        id: a.id,
        answer: a.answer,
        isOfficial: a.isOfficial,
        responderName: a.customer?.name || a.guestName || (a.isOfficial ? "Seller" : "Anonymous"),
        helpfulVotes: a.helpfulVotes,
        unhelpfulVotes: a.unhelpfulVotes,
        createdAt: a.createdAt,
      })),
    })
  } catch (error) {
    console.error("Get answers error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/questions/[id]/answers - Submit an answer to a question
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: questionId } = await params
    const body = await request.json()

    // Validate question ID
    if (!questionId) {
      return NextResponse.json({ error: "Question ID is required" }, { status: 400 })
    }

    // Validate required fields
    const { answer, customerId, guestName, isOfficial = false } = body

    if (!answer || typeof answer !== "string") {
      return NextResponse.json({ error: "Answer is required" }, { status: 400 })
    }

    // Validate answer length
    if (answer.length < 5 || answer.length > 2000) {
      return NextResponse.json(
        { error: "Answer must be between 5 and 2000 characters" },
        { status: 400 }
      )
    }

    // Require either customerId or guestName for non-official answers
    if (!isOfficial && !customerId && !guestName) {
      return NextResponse.json(
        { error: "Either customerId or guestName is required" },
        { status: 400 }
      )
    }

    // Validate guestName length
    if (guestName && (typeof guestName !== "string" || guestName.length > 100)) {
      return NextResponse.json(
        { error: "Guest name must be a string of max 100 characters" },
        { status: 400 }
      )
    }

    // Check if question exists and is approved
    const question = await prisma.productQuestion.findUnique({
      where: { id: questionId },
      select: { id: true, status: true },
    })

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 })
    }

    if (question.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Cannot answer a question that is not approved" },
        { status: 400 }
      )
    }

    // If customerId provided, validate it exists
    if (customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { id: true },
      })
      if (!customer) {
        return NextResponse.json({ error: "Customer not found" }, { status: 404 })
      }
    }

    // Sanitize inputs (basic XSS prevention)
    const sanitize = (str: string) =>
      str
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;")
        .trim()

    const sanitizedAnswer = sanitize(answer)
    const sanitizedGuestName = guestName ? sanitize(guestName) : null

    // Create the answer
    const newAnswer = await prisma.productAnswer.create({
      data: {
        questionId,
        answer: sanitizedAnswer,
        isOfficial: Boolean(isOfficial),
        customerId: customerId || null,
        guestName: sanitizedGuestName,
      },
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
    })

    return NextResponse.json(
      {
        message: "Answer submitted successfully.",
        answer: {
          id: newAnswer.id,
          answer: newAnswer.answer,
          isOfficial: newAnswer.isOfficial,
          responderName:
            newAnswer.customer?.name ||
            newAnswer.guestName ||
            (newAnswer.isOfficial ? "Seller" : "Anonymous"),
          helpfulVotes: newAnswer.helpfulVotes,
          unhelpfulVotes: newAnswer.unhelpfulVotes,
          createdAt: newAnswer.createdAt,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Create answer error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
