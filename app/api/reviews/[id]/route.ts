import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// PATCH /api/reviews/[id] - Update review status (admin moderation)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Validate review ID
    if (!id) {
      return NextResponse.json({ error: "Review ID is required" }, { status: 400 })
    }

    // Check if review exists
    const existingReview = await prisma.review.findUnique({
      where: { id },
      select: { id: true, status: true },
    })

    if (!existingReview) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 })
    }

    // Validate status
    const { status } = body
    if (!status || !["PENDING", "APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        { error: "Status must be one of: PENDING, APPROVED, REJECTED" },
        { status: 400 }
      )
    }

    // Update the review
    const updatedReview = await prisma.review.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        rating: true,
        comment: true,
        status: true,
        guestName: true,
        createdAt: true,
        updatedAt: true,
        product: {
          select: {
            id: true,
            nameEn: true,
            nameKh: true,
          },
        },
        customer: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json({
      message: `Review ${status.toLowerCase()} successfully`,
      review: {
        id: updatedReview.id,
        rating: updatedReview.rating,
        comment: updatedReview.comment,
        status: updatedReview.status,
        reviewerName: updatedReview.customer?.name || updatedReview.guestName || "Anonymous",
        product: updatedReview.product,
        createdAt: updatedReview.createdAt,
        updatedAt: updatedReview.updatedAt,
      },
    })
  } catch (error) {
    console.error("Update review error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/reviews/[id] - Delete a review (admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Validate review ID
    if (!id) {
      return NextResponse.json({ error: "Review ID is required" }, { status: 400 })
    }

    // Check if review exists
    const existingReview = await prisma.review.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!existingReview) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 })
    }

    // Delete the review
    await prisma.review.delete({ where: { id } })

    return NextResponse.json({ message: "Review deleted successfully" })
  } catch (error) {
    console.error("Delete review error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
