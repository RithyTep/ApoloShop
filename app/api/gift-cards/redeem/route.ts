import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

// POST /api/gift-cards/redeem - Redeem a gift card at checkout
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { code, amount, orderId } = body

    // Validate required fields
    if (!code || !amount) {
      return NextResponse.json(
        { error: "Missing required fields: code, amount" },
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

    // Normalize and format the code
    const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, "")
    const formattedCode =
      normalizedCode.length === 16
        ? `${normalizedCode.slice(0, 4)}-${normalizedCode.slice(4, 8)}-${normalizedCode.slice(8, 12)}-${normalizedCode.slice(12, 16)}`
        : code.toUpperCase()

    // Find the gift card
    const giftCard = await prisma.giftCard.findUnique({
      where: { code: formattedCode },
    })

    if (!giftCard) {
      return NextResponse.json(
        { error: "Gift card not found" },
        { status: 404 }
      )
    }

    // Check if expired
    const now = new Date()
    if (giftCard.expiresAt && giftCard.expiresAt < now) {
      return NextResponse.json(
        { error: "Gift card has expired" },
        { status: 400 }
      )
    }

    // Check status
    if (giftCard.status !== "ACTIVE") {
      return NextResponse.json(
        { error: `Gift card is ${giftCard.status.toLowerCase()}` },
        { status: 400 }
      )
    }

    // Check balance
    const currentBalance = Number(giftCard.currentBalance)
    if (currentBalance <= 0) {
      return NextResponse.json(
        { error: "Gift card has no remaining balance" },
        { status: 400 }
      )
    }

    // Calculate how much can be redeemed
    const amountToRedeem = Math.min(numAmount, currentBalance)
    const newBalance = currentBalance - amountToRedeem

    // Update gift card balance and create transaction
    const updatedGiftCard = await prisma.giftCard.update({
      where: { id: giftCard.id },
      data: {
        currentBalance: newBalance,
        status: newBalance === 0 ? "REDEEMED" : "ACTIVE",
        transactions: {
          create: {
            type: "redemption",
            amount: -amountToRedeem, // Negative for debit
            balanceAfter: newBalance,
            orderId: orderId || null,
            note: orderId ? `Applied to order ${orderId}` : "Checkout redemption",
          },
        },
      },
    })

    return NextResponse.json({
      message: "Gift card redeemed successfully",
      redemption: {
        code: giftCard.code,
        amountRedeemed: amountToRedeem,
        remainingBalance: newBalance,
        currency: giftCard.currency,
        status: updatedGiftCard.status,
      },
    })
  } catch (error) {
    console.error("Error redeeming gift card:", error)
    return NextResponse.json(
      { error: "Failed to redeem gift card" },
      { status: 500 }
    )
  }
}

// GET /api/gift-cards/redeem - Validate a gift card code before checkout
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")

  if (!code) {
    return NextResponse.json(
      { error: "Gift card code is required" },
      { status: 400 }
    )
  }

  try {
    // Normalize and format the code
    const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, "")
    const formattedCode =
      normalizedCode.length === 16
        ? `${normalizedCode.slice(0, 4)}-${normalizedCode.slice(4, 8)}-${normalizedCode.slice(8, 12)}-${normalizedCode.slice(12, 16)}`
        : code.toUpperCase()

    const giftCard = await prisma.giftCard.findUnique({
      where: { code: formattedCode },
    })

    if (!giftCard) {
      return NextResponse.json(
        { valid: false, error: "Gift card not found" },
        { status: 404 }
      )
    }

    // Check expiration
    const now = new Date()
    if (giftCard.expiresAt && giftCard.expiresAt < now) {
      return NextResponse.json({
        valid: false,
        error: "Gift card has expired",
      })
    }

    // Check status
    if (giftCard.status !== "ACTIVE") {
      return NextResponse.json({
        valid: false,
        error: `Gift card is ${giftCard.status.toLowerCase()}`,
      })
    }

    // Check balance
    const currentBalance = Number(giftCard.currentBalance)
    if (currentBalance <= 0) {
      return NextResponse.json({
        valid: false,
        error: "Gift card has no remaining balance",
      })
    }

    return NextResponse.json({
      valid: true,
      giftCard: {
        code: giftCard.code,
        currentBalance,
        currency: giftCard.currency,
        expiresAt: giftCard.expiresAt,
      },
    })
  } catch (error) {
    console.error("Error validating gift card:", error)
    return NextResponse.json(
      { valid: false, error: "Failed to validate gift card" },
      { status: 500 }
    )
  }
}
