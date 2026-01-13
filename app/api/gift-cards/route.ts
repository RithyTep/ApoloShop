import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import type { Currency, GiftCardStatus } from "@prisma/client"

// Generate a unique gift card code (XXXX-XXXX-XXXX-XXXX format)
function generateGiftCardCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // Exclude similar chars (I, O, 0, 1)
  const segments = []
  for (let s = 0; s < 4; s++) {
    let segment = ""
    for (let i = 0; i < 4; i++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    segments.push(segment)
  }
  return segments.join("-")
}

// GET /api/gift-cards - List gift cards (admin) or check balance (customer)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const checkBalance = searchParams.get("checkBalance") === "true"

  // Customer: Check gift card balance by code
  if (code && checkBalance) {
    try {
      const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, "")
      // Format to XXXX-XXXX-XXXX-XXXX if entered without dashes
      const formattedCode =
        normalizedCode.length === 16
          ? `${normalizedCode.slice(0, 4)}-${normalizedCode.slice(4, 8)}-${normalizedCode.slice(8, 12)}-${normalizedCode.slice(12, 16)}`
          : code.toUpperCase()

      const giftCard = await prisma.giftCard.findUnique({
        where: { code: formattedCode },
      })

      if (!giftCard) {
        return NextResponse.json(
          { error: "Gift card not found" },
          { status: 404 }
        )
      }

      // Check expiration
      const now = new Date()
      if (giftCard.expiresAt && giftCard.expiresAt < now) {
        return NextResponse.json({
          code: giftCard.code,
          status: "EXPIRED",
          currentBalance: 0,
          currency: giftCard.currency,
          message: "This gift card has expired",
        })
      }

      if (giftCard.status === "CANCELLED") {
        return NextResponse.json({
          code: giftCard.code,
          status: "CANCELLED",
          currentBalance: 0,
          currency: giftCard.currency,
          message: "This gift card has been cancelled",
        })
      }

      return NextResponse.json({
        code: giftCard.code,
        status: giftCard.status,
        currentBalance: Number(giftCard.currentBalance),
        currency: giftCard.currency,
        expiresAt: giftCard.expiresAt,
      })
    } catch (error) {
      console.error("Error checking gift card balance:", error)
      return NextResponse.json(
        { error: "Failed to check gift card balance" },
        { status: 500 }
      )
    }
  }

  // Admin: List all gift cards with pagination
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "20")
  const search = searchParams.get("search") || ""
  const status = searchParams.get("status") as GiftCardStatus | null
  const skip = (page - 1) * limit

  try {
    const where: Parameters<typeof prisma.giftCard.findMany>[0]["where"] = {}

    if (search) {
      where.OR = [
        { code: { contains: search.toUpperCase() } },
        { recipientEmail: { contains: search, mode: "insensitive" } },
        { purchaserEmail: { contains: search, mode: "insensitive" } },
        { recipientName: { contains: search, mode: "insensitive" } },
      ]
    }

    if (status) {
      where.status = status
    }

    const [giftCards, total] = await Promise.all([
      prisma.giftCard.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { transactions: true },
          },
        },
      }),
      prisma.giftCard.count({ where }),
    ])

    return NextResponse.json({
      giftCards: giftCards.map((gc) => ({
        ...gc,
        initialBalance: Number(gc.initialBalance),
        currentBalance: Number(gc.currentBalance),
        transactionCount: gc._count.transactions,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching gift cards:", error)
    return NextResponse.json(
      { error: "Failed to fetch gift cards" },
      { status: 500 }
    )
  }
}

// POST /api/gift-cards - Purchase a new gift card
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      amount,
      currency = "USD",
      recipientEmail,
      recipientName,
      personalMessage,
      purchaserEmail,
      purchaserId,
      expiresAt,
      createdBy, // For admin-created cards
    } = body

    // Validate required fields
    if (!amount || !recipientEmail) {
      return NextResponse.json(
        { error: "Missing required fields: amount, recipientEmail" },
        { status: 400 }
      )
    }

    // Validate amount
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        { status: 400 }
      )
    }

    // Validate amount range (e.g., $5 - $500)
    if (numAmount < 5 || numAmount > 500) {
      return NextResponse.json(
        { error: "Gift card amount must be between $5 and $500" },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(recipientEmail)) {
      return NextResponse.json(
        { error: "Invalid recipient email format" },
        { status: 400 }
      )
    }

    // Validate currency
    const validCurrencies: Currency[] = ["USD", "KHR"]
    if (!validCurrencies.includes(currency)) {
      return NextResponse.json(
        { error: `Invalid currency. Must be one of: ${validCurrencies.join(", ")}` },
        { status: 400 }
      )
    }

    // Generate unique code
    let code: string
    let attempts = 0
    const maxAttempts = 10

    do {
      code = generateGiftCardCode()
      const existing = await prisma.giftCard.findUnique({ where: { code } })
      if (!existing) break
      attempts++
    } while (attempts < maxAttempts)

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { error: "Failed to generate unique gift card code" },
        { status: 500 }
      )
    }

    // Create gift card with initial transaction
    const giftCard = await prisma.giftCard.create({
      data: {
        code,
        initialBalance: numAmount,
        currentBalance: numAmount,
        currency,
        status: "ACTIVE",
        recipientEmail,
        recipientName: recipientName || null,
        personalMessage: personalMessage || null,
        purchaserEmail: purchaserEmail || null,
        purchaserId: purchaserId || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy: createdBy || null,
        transactions: {
          create: {
            type: "purchase",
            amount: numAmount,
            balanceAfter: numAmount,
            note: "Initial gift card purchase",
          },
        },
      },
      include: {
        transactions: true,
      },
    })

    // TODO: In a real implementation, send email to recipient here
    // await sendGiftCardEmail(giftCard)

    return NextResponse.json(
      {
        message: "Gift card created successfully",
        giftCard: {
          id: giftCard.id,
          code: giftCard.code,
          initialBalance: Number(giftCard.initialBalance),
          currentBalance: Number(giftCard.currentBalance),
          currency: giftCard.currency,
          status: giftCard.status,
          recipientEmail: giftCard.recipientEmail,
          recipientName: giftCard.recipientName,
          expiresAt: giftCard.expiresAt,
          createdAt: giftCard.createdAt,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating gift card:", error)
    return NextResponse.json(
      { error: "Failed to create gift card" },
      { status: 500 }
    )
  }
}
