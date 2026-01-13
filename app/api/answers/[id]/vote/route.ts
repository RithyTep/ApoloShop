import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// POST /api/answers/[id]/vote - Vote on an answer
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: answerId } = await params
    const body = await request.json()

    // Validate answer ID
    if (!answerId) {
      return NextResponse.json({ error: "Answer ID is required" }, { status: 400 })
    }

    // Validate vote type
    const { isHelpful, customerId } = body
    if (typeof isHelpful !== "boolean") {
      return NextResponse.json(
        { error: "isHelpful must be a boolean" },
        { status: 400 }
      )
    }

    // Get client IP for guest voting
    const forwardedFor = request.headers.get("x-forwarded-for")
    const realIp = request.headers.get("x-real-ip")
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || realIp || "unknown"

    // Check if answer exists
    const answer = await prisma.productAnswer.findUnique({
      where: { id: answerId },
      select: { id: true, helpfulVotes: true, unhelpfulVotes: true },
    })

    if (!answer) {
      return NextResponse.json({ error: "Answer not found" }, { status: 404 })
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

    // Check for existing vote
    let existingVote = null
    if (customerId) {
      existingVote = await prisma.answerVote.findUnique({
        where: {
          answerId_customerId: { answerId, customerId },
        },
      })
    } else {
      existingVote = await prisma.answerVote.findUnique({
        where: {
          answerId_ipAddress: { answerId, ipAddress },
        },
      })
    }

    // If vote exists and is the same, remove it (toggle off)
    if (existingVote && existingVote.isHelpful === isHelpful) {
      // Remove the vote
      await prisma.$transaction([
        prisma.answerVote.delete({
          where: { id: existingVote.id },
        }),
        prisma.productAnswer.update({
          where: { id: answerId },
          data: {
            helpfulVotes: isHelpful
              ? { decrement: 1 }
              : undefined,
            unhelpfulVotes: !isHelpful
              ? { decrement: 1 }
              : undefined,
          },
        }),
      ])

      const updatedAnswer = await prisma.productAnswer.findUnique({
        where: { id: answerId },
        select: { helpfulVotes: true, unhelpfulVotes: true },
      })

      return NextResponse.json({
        message: "Vote removed",
        helpfulVotes: updatedAnswer?.helpfulVotes ?? 0,
        unhelpfulVotes: updatedAnswer?.unhelpfulVotes ?? 0,
        userVote: null,
      })
    }

    // If vote exists but is different, update it
    if (existingVote && existingVote.isHelpful !== isHelpful) {
      await prisma.$transaction([
        prisma.answerVote.update({
          where: { id: existingVote.id },
          data: { isHelpful },
        }),
        prisma.productAnswer.update({
          where: { id: answerId },
          data: {
            helpfulVotes: isHelpful ? { increment: 1 } : { decrement: 1 },
            unhelpfulVotes: isHelpful ? { decrement: 1 } : { increment: 1 },
          },
        }),
      ])

      const updatedAnswer = await prisma.productAnswer.findUnique({
        where: { id: answerId },
        select: { helpfulVotes: true, unhelpfulVotes: true },
      })

      return NextResponse.json({
        message: "Vote updated",
        helpfulVotes: updatedAnswer?.helpfulVotes ?? 0,
        unhelpfulVotes: updatedAnswer?.unhelpfulVotes ?? 0,
        userVote: isHelpful,
      })
    }

    // Create new vote
    await prisma.$transaction([
      prisma.answerVote.create({
        data: {
          answerId,
          customerId: customerId || null,
          ipAddress: customerId ? null : ipAddress,
          isHelpful,
        },
      }),
      prisma.productAnswer.update({
        where: { id: answerId },
        data: {
          helpfulVotes: isHelpful ? { increment: 1 } : undefined,
          unhelpfulVotes: !isHelpful ? { increment: 1 } : undefined,
        },
      }),
    ])

    const updatedAnswer = await prisma.productAnswer.findUnique({
      where: { id: answerId },
      select: { helpfulVotes: true, unhelpfulVotes: true },
    })

    return NextResponse.json({
      message: "Vote recorded",
      helpfulVotes: updatedAnswer?.helpfulVotes ?? 0,
      unhelpfulVotes: updatedAnswer?.unhelpfulVotes ?? 0,
      userVote: isHelpful,
    })
  } catch (error) {
    console.error("Vote error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
