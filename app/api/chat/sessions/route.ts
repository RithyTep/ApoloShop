import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { ChatSessionStatus } from "@prisma/client"

// GET /api/chat/sessions - Get chat sessions (admin) or single session (customer)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get("sessionId")
  const guestId = searchParams.get("guestId")
  const status = searchParams.get("status") as ChatSessionStatus | null
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100)
  const offset = parseInt(searchParams.get("offset") || "0")

  // If sessionId provided, get single session with messages
  if (sessionId) {
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    })

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    return NextResponse.json({ session })
  }

  // If guestId provided, get active session for guest
  if (guestId) {
    const session = await prisma.chatSession.findFirst({
      where: {
        guestId,
        status: { in: ["ACTIVE", "WAITING"] },
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ session })
  }

  // Admin view - get all sessions with filters
  const whereClause: Parameters<typeof prisma.chatSession.findMany>[0]["where"] = {}

  if (status) {
    whereClause.status = status
  }

  const [sessions, total] = await Promise.all([
    prisma.chatSession.findMany({
      where: whereClause,
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1, // Just the last message for preview
        },
        _count: {
          select: {
            messages: {
              where: { isRead: false, sender: "CUSTOMER" },
            },
          },
        },
      },
      orderBy: { lastActivityAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.chatSession.count({ where: whereClause }),
  ])

  // Count unread sessions (sessions with unread customer messages)
  const unreadCount = await prisma.chatSession.count({
    where: {
      status: { in: ["ACTIVE", "WAITING"] },
      messages: {
        some: {
          isRead: false,
          sender: "CUSTOMER",
        },
      },
    },
  })

  return NextResponse.json({
    sessions,
    unreadCount,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + sessions.length < total,
    },
  })
}

// POST /api/chat/sessions - Create a new chat session
export async function POST(request: NextRequest) {
  const body = await request.json()
  const {
    guestId,
    customerId,
    customerName,
    customerEmail,
    subject,
    pageUrl,
    initialMessage,
    isOffline,
  } = body

  // Validate required fields
  if (!guestId && !customerId) {
    return NextResponse.json(
      { error: "Either guestId or customerId is required" },
      { status: 400 }
    )
  }

  // Check if there's already an active session for this guest/customer
  const existingSession = await prisma.chatSession.findFirst({
    where: {
      OR: [
        { guestId: guestId || undefined },
        { customerId: customerId || undefined },
      ].filter(Boolean),
      status: { in: ["ACTIVE", "WAITING"] },
    },
  })

  if (existingSession) {
    return NextResponse.json(
      { error: "Active session already exists", session: existingSession },
      { status: 409 }
    )
  }

  // Get client IP and user agent
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    undefined
  const userAgent = request.headers.get("user-agent") || undefined

  // Create the session
  const session = await prisma.chatSession.create({
    data: {
      guestId,
      customerId,
      customerName,
      customerEmail,
      subject,
      pageUrl,
      ipAddress,
      userAgent,
      status: isOffline ? "OFFLINE" : "ACTIVE",
    },
  })

  // If there's an initial message, create it
  if (initialMessage) {
    await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        sender: "CUSTOMER",
        senderId: customerId || guestId,
        senderName: customerName,
        content: initialMessage,
      },
    })

    // Update last activity
    await prisma.chatSession.update({
      where: { id: session.id },
      data: { lastActivityAt: new Date(), status: "WAITING" },
    })
  }

  // Return session with messages
  const sessionWithMessages = await prisma.chatSession.findUnique({
    where: { id: session.id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  })

  return NextResponse.json({ session: sessionWithMessages }, { status: 201 })
}

// PATCH /api/chat/sessions - Update session (assign agent, change status)
export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { sessionId, status, agentId, agentName } = body

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 })
  }

  const updateData: Parameters<typeof prisma.chatSession.update>[0]["data"] = {}

  if (status) {
    updateData.status = status
    if (status === "RESOLVED") {
      updateData.resolvedAt = new Date()
    }
  }

  if (agentId !== undefined) {
    updateData.agentId = agentId
    updateData.agentName = agentName

    // Add system message when agent joins
    if (agentId && agentName) {
      await prisma.chatMessage.create({
        data: {
          sessionId,
          sender: "SYSTEM",
          content: `${agentName} joined the chat`,
        },
      })
    }
  }

  const session = await prisma.chatSession.update({
    where: { id: sessionId },
    data: updateData,
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  })

  return NextResponse.json({ session })
}
