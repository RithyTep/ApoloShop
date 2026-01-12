import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { ChatMessageSender } from "@prisma/client"

// GET /api/chat/messages - Get messages for a session
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get("sessionId")
  const after = searchParams.get("after") // Get messages after this timestamp (for polling)
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 })
  }

  const whereClause: Parameters<typeof prisma.chatMessage.findMany>[0]["where"] = {
    sessionId,
  }

  // If "after" is provided, only get newer messages (for polling updates)
  if (after) {
    whereClause.createdAt = { gt: new Date(after) }
  }

  const messages = await prisma.chatMessage.findMany({
    where: whereClause,
    orderBy: { createdAt: "asc" },
    take: limit,
  })

  return NextResponse.json({ messages })
}

// POST /api/chat/messages - Send a new message
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { sessionId, sender, senderId, senderName, content } = body

  // Validate required fields
  if (!sessionId || !sender || !content) {
    return NextResponse.json(
      { error: "sessionId, sender, and content are required" },
      { status: 400 }
    )
  }

  // Validate sender type
  if (!["CUSTOMER", "AGENT", "SYSTEM"].includes(sender)) {
    return NextResponse.json({ error: "Invalid sender type" }, { status: 400 })
  }

  // Validate content length
  if (content.length > 5000) {
    return NextResponse.json(
      { error: "Message too long (max 5000 characters)" },
      { status: 400 }
    )
  }

  // Check session exists
  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
  })

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 })
  }

  // Create the message
  const message = await prisma.chatMessage.create({
    data: {
      sessionId,
      sender: sender as ChatMessageSender,
      senderId,
      senderName,
      content: content.trim(),
    },
  })

  // Update session last activity and status
  const newStatus =
    sender === "CUSTOMER" ? "WAITING" : sender === "AGENT" ? "ACTIVE" : session.status

  await prisma.chatSession.update({
    where: { id: sessionId },
    data: {
      lastActivityAt: new Date(),
      status: newStatus,
    },
  })

  return NextResponse.json({ message }, { status: 201 })
}

// PATCH /api/chat/messages - Mark messages as read
export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { sessionId, sender } = body

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 })
  }

  // Mark all unread messages from specified sender (or all) as read
  const whereClause: Parameters<typeof prisma.chatMessage.updateMany>[0]["where"] = {
    sessionId,
    isRead: false,
  }

  if (sender) {
    whereClause.sender = sender
  }

  const result = await prisma.chatMessage.updateMany({
    where: whereClause,
    data: {
      isRead: true,
      readAt: new Date(),
    },
  })

  return NextResponse.json({ updated: result.count })
}
