import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/chat/canned-responses - Get all active canned responses
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get("category")
  const includeInactive = searchParams.get("includeInactive") === "true"

  const whereClause: Parameters<typeof prisma.cannedResponse.findMany>[0]["where"] = {}

  if (!includeInactive) {
    whereClause.isActive = true
  }

  if (category) {
    whereClause.category = category
  }

  const responses = await prisma.cannedResponse.findMany({
    where: whereClause,
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { title: "asc" }],
  })

  // Get unique categories
  const categories = await prisma.cannedResponse.findMany({
    where: { isActive: true, category: { not: null } },
    select: { category: true },
    distinct: ["category"],
  })

  return NextResponse.json({
    responses,
    categories: categories.map((c) => c.category).filter(Boolean),
  })
}

// POST /api/chat/canned-responses - Create a new canned response
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { title, contentEn, contentKh, category, shortcut, sortOrder, createdBy } = body

  // Validate required fields
  if (!title || !contentEn) {
    return NextResponse.json(
      { error: "title and contentEn are required" },
      { status: 400 }
    )
  }

  // Check shortcut uniqueness if provided
  if (shortcut) {
    const existing = await prisma.cannedResponse.findUnique({
      where: { shortcut },
    })
    if (existing) {
      return NextResponse.json(
        { error: "Shortcut already in use" },
        { status: 409 }
      )
    }
  }

  const response = await prisma.cannedResponse.create({
    data: {
      title,
      contentEn,
      contentKh,
      category,
      shortcut,
      sortOrder: sortOrder || 0,
      createdBy,
    },
  })

  return NextResponse.json({ response }, { status: 201 })
}

// PATCH /api/chat/canned-responses - Update a canned response
export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { id, title, contentEn, contentKh, category, shortcut, sortOrder, isActive } = body

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 })
  }

  // Check shortcut uniqueness if being changed
  if (shortcut) {
    const existing = await prisma.cannedResponse.findFirst({
      where: { shortcut, id: { not: id } },
    })
    if (existing) {
      return NextResponse.json(
        { error: "Shortcut already in use" },
        { status: 409 }
      )
    }
  }

  const updateData: Parameters<typeof prisma.cannedResponse.update>[0]["data"] = {}

  if (title !== undefined) updateData.title = title
  if (contentEn !== undefined) updateData.contentEn = contentEn
  if (contentKh !== undefined) updateData.contentKh = contentKh
  if (category !== undefined) updateData.category = category
  if (shortcut !== undefined) updateData.shortcut = shortcut || null
  if (sortOrder !== undefined) updateData.sortOrder = sortOrder
  if (isActive !== undefined) updateData.isActive = isActive

  const response = await prisma.cannedResponse.update({
    where: { id },
    data: updateData,
  })

  return NextResponse.json({ response })
}

// DELETE /api/chat/canned-responses - Delete a canned response
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 })
  }

  await prisma.cannedResponse.delete({
    where: { id },
  })

  return NextResponse.json({ deleted: true })
}
