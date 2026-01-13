import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/products/[id]/questions - Get questions for a product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50)
    const offset = parseInt(searchParams.get("offset") || "0")
    const includeUnapproved = searchParams.get("includeUnapproved") === "true"

    // Validate product ID
    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 })
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Build where clause
    const whereClause: {
      productId: string
      status?: "APPROVED"
    } = { productId }

    // Only show approved questions unless admin requests all
    if (!includeUnapproved) {
      whereClause.status = "APPROVED"
    }

    // Get questions with answers
    const [questions, totalCount] = await Promise.all([
      prisma.productQuestion.findMany({
        where: whereClause,
        select: {
          id: true,
          question: true,
          status: true,
          guestName: true,
          createdAt: true,
          customer: {
            select: { id: true, name: true },
          },
          answers: {
            where: { question: { status: "APPROVED" } },
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
          },
          _count: {
            select: { answers: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.productQuestion.count({ where: whereClause }),
    ])

    // Format response
    const formattedQuestions = questions.map((q) => ({
      id: q.id,
      question: q.question,
      status: q.status,
      askerName: q.customer?.name || q.guestName || "Anonymous",
      createdAt: q.createdAt,
      answerCount: q._count.answers,
      answers: q.answers.map((a) => ({
        id: a.id,
        answer: a.answer,
        isOfficial: a.isOfficial,
        responderName: a.customer?.name || a.guestName || (a.isOfficial ? "Seller" : "Anonymous"),
        helpfulVotes: a.helpfulVotes,
        unhelpfulVotes: a.unhelpfulVotes,
        createdAt: a.createdAt,
      })),
    }))

    return NextResponse.json({
      productId,
      questions: formattedQuestions,
      pagination: {
        total: totalCount,
        offset,
        limit,
        hasMore: offset + questions.length < totalCount,
      },
    })
  } catch (error) {
    console.error("Get questions error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/products/[id]/questions - Submit a new question
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params
    const body = await request.json()

    // Validate product ID
    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 })
    }

    // Validate required fields
    const { question, customerId, guestName, guestEmail } = body

    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "Question is required" }, { status: 400 })
    }

    // Validate question length
    if (question.length < 10 || question.length > 1000) {
      return NextResponse.json(
        { error: "Question must be between 10 and 1000 characters" },
        { status: 400 }
      )
    }

    // Require either customerId or guestName
    if (!customerId && !guestName) {
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

    // Validate email if provided
    if (guestEmail && typeof guestEmail === "string") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(guestEmail)) {
        return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
      }
    }

    // Check if product exists and is active
    const product = await prisma.product.findUnique({
      where: { id: productId, isActive: true },
      select: { id: true },
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
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

    const sanitizedQuestion = sanitize(question)
    const sanitizedGuestName = guestName ? sanitize(guestName) : null
    const sanitizedGuestEmail = guestEmail ? guestEmail.toLowerCase().trim() : null

    // Create the question (default status is PENDING for moderation)
    const newQuestion = await prisma.productQuestion.create({
      data: {
        productId,
        question: sanitizedQuestion,
        customerId: customerId || null,
        guestName: sanitizedGuestName,
        guestEmail: sanitizedGuestEmail,
        status: "PENDING",
      },
      select: {
        id: true,
        question: true,
        status: true,
        guestName: true,
        createdAt: true,
        customer: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(
      {
        message: "Question submitted successfully. It will be visible after moderation.",
        question: {
          id: newQuestion.id,
          question: newQuestion.question,
          status: newQuestion.status,
          askerName: newQuestion.customer?.name || newQuestion.guestName || "Anonymous",
          createdAt: newQuestion.createdAt,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Create question error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
