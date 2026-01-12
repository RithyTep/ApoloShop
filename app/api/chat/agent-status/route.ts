import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Consider agent offline if no heartbeat for 2 minutes
const OFFLINE_THRESHOLD_MS = 2 * 60 * 1000

// GET /api/chat/agent-status - Check if any agents are online
export async function GET() {
  const cutoffTime = new Date(Date.now() - OFFLINE_THRESHOLD_MS)

  // Count online agents (those who have sent a heartbeat recently)
  const onlineAgents = await prisma.agentStatus.count({
    where: {
      isOnline: true,
      lastSeenAt: { gte: cutoffTime },
    },
  })

  // Clean up stale statuses (mark as offline if no recent heartbeat)
  await prisma.agentStatus.updateMany({
    where: {
      isOnline: true,
      lastSeenAt: { lt: cutoffTime },
    },
    data: { isOnline: false },
  })

  return NextResponse.json({
    agentsOnline: onlineAgents > 0,
    onlineCount: onlineAgents,
  })
}

// POST /api/chat/agent-status - Set agent online status (heartbeat)
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { userId, isOnline } = body

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 })
  }

  // Upsert agent status
  const status = await prisma.agentStatus.upsert({
    where: { userId },
    update: {
      isOnline: isOnline ?? true,
      lastSeenAt: new Date(),
    },
    create: {
      userId,
      isOnline: isOnline ?? true,
      lastSeenAt: new Date(),
    },
  })

  return NextResponse.json({ status })
}
