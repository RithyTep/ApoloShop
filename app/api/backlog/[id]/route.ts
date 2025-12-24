import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { BacklogStatus, BacklogPriority } from "@prisma/client"

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/backlog/[id] - Get a single backlog item
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const item = await prisma.backlogItem.findUnique({
      where: { id },
    })

    if (!item) {
      return NextResponse.json(
        { error: "Backlog item not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ item })
  } catch (error) {
    console.error("Failed to fetch backlog item:", error)
    return NextResponse.json(
      { error: "Failed to fetch backlog item" },
      { status: 500 }
    )
  }
}

// PUT /api/backlog/[id] - Update a backlog item
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { title, description, priority, status } = body

    // Validate priority if provided
    if (priority && !Object.values(BacklogPriority).includes(priority)) {
      return NextResponse.json(
        { error: "Invalid priority value" },
        { status: 400 }
      )
    }

    // Validate status if provided
    if (status && !Object.values(BacklogStatus).includes(status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      )
    }

    const item = await prisma.backlogItem.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(priority !== undefined && { priority }),
        ...(status !== undefined && { status }),
      },
    })

    return NextResponse.json({ item })
  } catch (error) {
    console.error("Failed to update backlog item:", error)
    return NextResponse.json(
      { error: "Failed to update backlog item" },
      { status: 500 }
    )
  }
}

// DELETE /api/backlog/[id] - Delete a backlog item
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    await prisma.backlogItem.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete backlog item:", error)
    return NextResponse.json(
      { error: "Failed to delete backlog item" },
      { status: 500 }
    )
  }
}
