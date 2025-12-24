import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { BacklogStatus, BacklogPriority } from "@prisma/client"

// GET /api/backlog - List all backlog items
export async function GET() {
  try {
    const items = await prisma.backlogItem.findMany({
      orderBy: [
        { status: "asc" },
        { priority: "desc" },
        { createdAt: "desc" },
      ],
    })

    return NextResponse.json({ items })
  } catch (error) {
    console.error("Failed to fetch backlog items:", error)
    return NextResponse.json(
      { error: "Failed to fetch backlog items" },
      { status: 500 }
    )
  }
}

// POST /api/backlog - Create a new backlog item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description, priority } = body

    if (!title?.trim()) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      )
    }

    const item = await prisma.backlogItem.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        priority: priority || BacklogPriority.MEDIUM,
        status: BacklogStatus.TODO,
      },
    })

    return NextResponse.json({ item }, { status: 201 })
  } catch (error) {
    console.error("Failed to create backlog item:", error)
    return NextResponse.json(
      { error: "Failed to create backlog item" },
      { status: 500 }
    )
  }
}
