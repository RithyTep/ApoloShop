import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const processRefundSchema = z.object({
  refundMethod: z.enum(["ORIGINAL_PAYMENT", "STORE_CREDIT", "BANK_TRANSFER"]),
  refundAmountUsd: z.number().positive().optional(),
  refundAmountKhr: z.number().int().positive().optional(),
  adminNotes: z.string().optional(),
  processedBy: z.string().optional(),
})

// POST /api/returns/[id]/refund - Process refund
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const result = processRefundSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const data = result.data

    // Get return with order info
    const returnRecord = await prisma.return.findUnique({
      where: { id },
    })

    if (!returnRecord) {
      return NextResponse.json({ error: "Return not found" }, { status: 404 })
    }

    // Check if return is in a valid state for refund
    if (!["APPROVED", "RECEIVED"].includes(returnRecord.status)) {
      return NextResponse.json(
        { error: "Return must be approved or received before processing refund" },
        { status: 400 }
      )
    }

    // Use provided amount or existing calculated amount
    const refundAmountUsd = data.refundAmountUsd ?? Number(returnRecord.refundAmountUsd)
    const refundAmountKhr = data.refundAmountKhr ?? returnRecord.refundAmountKhr

    // Process refund based on method
    let refundResult: { success: boolean; transactionId?: string; error?: string }

    switch (data.refundMethod) {
      case "ORIGINAL_PAYMENT":
        // In real implementation, this would call payment gateway API
        refundResult = await processOriginalPaymentRefund(returnRecord.orderId, refundAmountUsd)
        break

      case "STORE_CREDIT":
        // Add store credit to customer account
        refundResult = await processStoreCreditRefund(
          returnRecord.customerId,
          refundAmountUsd,
          returnRecord.returnNumber
        )
        break

      case "BANK_TRANSFER":
        // Mark for manual bank transfer
        refundResult = { success: true, transactionId: `BANK-${Date.now()}` }
        break

      default:
        refundResult = { success: false, error: "Invalid refund method" }
    }

    if (!refundResult.success) {
      return NextResponse.json(
        { error: refundResult.error || "Refund processing failed" },
        { status: 500 }
      )
    }

    // Update return record
    const updatedReturn = await prisma.return.update({
      where: { id },
      data: {
        status: "REFUNDED",
        refundMethod: data.refundMethod,
        refundAmountUsd,
        refundAmountKhr,
        refundedAt: new Date(),
        adminNotes: data.adminNotes
          ? `${returnRecord.adminNotes ? returnRecord.adminNotes + "\n" : ""}${data.adminNotes}`
          : returnRecord.adminNotes,
        processedBy: data.processedBy,
      },
    })

    return NextResponse.json({
      return: updatedReturn,
      refundResult: {
        success: true,
        transactionId: refundResult.transactionId,
        amount: { usd: refundAmountUsd, khr: refundAmountKhr },
        method: data.refundMethod,
      },
    })
  } catch (error) {
    console.error("Process refund error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper: Process refund to original payment method
async function processOriginalPaymentRefund(
  orderId: string,
  amount: number
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  // Get original payment
  const payment = await prisma.payment.findFirst({
    where: { orderId, status: "PAID" },
  })

  if (!payment) {
    return { success: false, error: "Original payment not found" }
  }

  // In a real implementation, this would call the payment gateway API
  // For now, we simulate a successful refund
  const transactionId = `REF-${Date.now()}`

  // Create refund payment record
  await prisma.payment.create({
    data: {
      orderId,
      method: payment.method,
      amount: -amount, // Negative amount for refund
      currency: payment.currency,
      status: "PAID",
      transactionId,
      metadata: {
        type: "refund",
        originalPaymentId: payment.id,
        refundedAt: new Date().toISOString(),
      },
    },
  })

  return { success: true, transactionId }
}

// Helper: Process store credit refund
async function processStoreCreditRefund(
  customerId: string,
  amount: number,
  returnNumber: string
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  // Check if customer has a loyalty account
  let loyaltyAccount = await prisma.loyaltyAccount.findUnique({
    where: { customerId },
  })

  // Create loyalty account if it doesn't exist
  if (!loyaltyAccount) {
    loyaltyAccount = await prisma.loyaltyAccount.create({
      data: { customerId },
    })
  }

  // Convert USD to points (e.g., $1 = 100 points)
  const pointsToAdd = Math.round(amount * 100)

  // Add points as store credit
  await prisma.loyaltyTransaction.create({
    data: {
      accountId: loyaltyAccount.id,
      type: "REFUND",
      points: pointsToAdd,
      description: `Store credit refund for return ${returnNumber}`,
      metadata: { refundAmountUsd: amount },
    },
  })

  // Update loyalty account balance
  await prisma.loyaltyAccount.update({
    where: { id: loyaltyAccount.id },
    data: {
      currentPoints: { increment: pointsToAdd },
      lifetimePoints: { increment: pointsToAdd },
    },
  })

  return { success: true, transactionId: `SC-${Date.now()}` }
}
