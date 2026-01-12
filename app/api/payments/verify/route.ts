import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// POST /api/payments/verify - Verify payment status
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentId, transactionId } = body;

    if (!paymentId) {
      return NextResponse.json(
        { success: false, message: "Payment ID required" },
        { status: 400 }
      );
    }

    // Get the payment record
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: {
          include: { customer: true },
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { success: false, message: "Payment not found" },
        { status: 404 }
      );
    }

    const metadata = payment.metadata as Record<string, unknown> || {};
    const gateway = metadata.gateway as string || payment.method;

    // Check payment status based on gateway
    let verificationResult = {
      success: false,
      status: payment.status,
      transactionId: payment.transactionId || undefined,
      paidAmount: payment.amount,
      paidCurrency: payment.currency,
      paidAt: undefined as string | undefined,
      message: "",
    };

    switch (gateway) {
      case "ABA_PAYWAY":
      case "PAYWAY": {
        // For PayWay, check if we have a callback update
        if (payment.status === "COMPLETED") {
          verificationResult = {
            success: true,
            status: "COMPLETED",
            transactionId: payment.transactionId || undefined,
            paidAmount: payment.amount,
            paidCurrency: payment.currency,
            paidAt: payment.updatedAt?.toISOString(),
            message: "Payment verified successfully",
          };
        } else if (transactionId) {
          // If transactionId provided, try to verify with ABA (simulated)
          // In production, this would call ABA's verification API
          verificationResult.message = "Payment verification pending";
        } else {
          verificationResult.message = "Awaiting payment confirmation";
        }
        break;
      }

      case "WING": {
        // For Wing, check callback status
        if (payment.status === "COMPLETED") {
          verificationResult = {
            success: true,
            status: "COMPLETED",
            transactionId: payment.transactionId || undefined,
            paidAmount: payment.amount,
            paidCurrency: payment.currency,
            paidAt: payment.updatedAt?.toISOString(),
            message: "Payment verified successfully",
          };
        } else {
          verificationResult.message = "Awaiting Wing payment confirmation";
        }
        break;
      }

      case "KHQR":
      case "ABA_KHQR": {
        // For KHQR, payment confirmation comes via webhook
        if (payment.status === "COMPLETED") {
          verificationResult = {
            success: true,
            status: "COMPLETED",
            transactionId: payment.transactionId || undefined,
            paidAmount: payment.amount,
            paidCurrency: payment.currency,
            paidAt: payment.updatedAt?.toISOString(),
            message: "KHQR payment received",
          };
        } else {
          // Check if QR has expired
          const qrGenerated = metadata.qrGenerated as string;
          if (qrGenerated) {
            const generatedTime = new Date(qrGenerated).getTime();
            const expiresIn = 15 * 60 * 1000; // 15 minutes
            if (Date.now() > generatedTime + expiresIn) {
              verificationResult.status = "FAILED";
              verificationResult.message = "QR code expired. Please generate a new one.";
            } else {
              verificationResult.message = "Waiting for KHQR payment scan";
            }
          }
        }
        break;
      }

      case "CASH":
      case "COD": {
        // For COD, check delivery status
        const codStatus = metadata.status as string;
        if (payment.status === "COMPLETED") {
          verificationResult = {
            success: true,
            status: "COMPLETED",
            transactionId: payment.transactionId || undefined,
            paidAmount: payment.amount,
            paidCurrency: payment.currency,
            paidAt: (metadata.collectedAt as string) || payment.updatedAt?.toISOString(),
            message: "Cash collected on delivery",
          };
        } else {
          verificationResult.message = codStatus === "CONFIRMED"
            ? "Order confirmed. Awaiting delivery."
            : "Awaiting order confirmation";
        }
        break;
      }

      default:
        verificationResult.message = "Unknown payment method";
    }

    return NextResponse.json(verificationResult);
  } catch (error) {
    console.error("POST /api/payments/verify error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to verify payment" },
      { status: 500 }
    );
  }
}

// PUT /api/payments/verify - Manually update payment status (admin)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentId, status, transactionId, collectedBy } = body;

    if (!paymentId || !status) {
      return NextResponse.json(
        { success: false, message: "Payment ID and status required" },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ["PENDING", "COMPLETED", "FAILED", "REFUNDED"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, message: "Invalid status" },
        { status: 400 }
      );
    }

    // Get current payment
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      return NextResponse.json(
        { success: false, message: "Payment not found" },
        { status: 404 }
      );
    }

    // Update payment record
    const existingMetadata = payment.metadata as Record<string, unknown> || {};
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status,
        transactionId: transactionId || payment.transactionId,
        metadata: {
          ...existingMetadata,
          ...(status === "COMPLETED" && {
            completedAt: new Date().toISOString(),
            collectedBy,
          }),
        },
      },
    });

    // Update order status if payment completed
    if (status === "COMPLETED") {
      await prisma.order.update({
        where: { id: payment.orderId },
        data: { status: "CONFIRMED" },
      });
    }

    return NextResponse.json({
      success: true,
      payment: updatedPayment,
      message: `Payment ${status.toLowerCase()}`,
    });
  } catch (error) {
    console.error("PUT /api/payments/verify error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update payment" },
      { status: 500 }
    );
  }
}
