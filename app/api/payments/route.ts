import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateKHQRImage } from "@/lib/khqr";

// GET /api/payments - Get payments for an order
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");

    if (orderId) {
      const payments = await prisma.payment.findMany({
        where: { orderId },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ payments });
    }

    // List all payments with pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        include: {
          order: {
            include: {
              customer: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.payment.count(),
    ]);

    return NextResponse.json({ payments, total, page, limit });
  } catch (error) {
    console.error("GET /api/payments error:", error);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}

// POST /api/payments - Create a new payment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, method, amount, currency } = body;

    if (!orderId || !method || amount === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get the order to validate
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        orderId,
        method,
        amount,
        currency: currency || order.currency,
        status: method === "CASH" ? "COMPLETED" : "PENDING",
        transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      },
    });

    // If cash payment, mark order as confirmed
    if (method === "CASH") {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: "CONFIRMED" },
      });
    }

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error("POST /api/payments error:", error);
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 });
  }
}

// PUT /api/payments - Update payment status
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, transactionId } = body;

    if (!id) {
      return NextResponse.json({ error: "Payment ID required" }, { status: 400 });
    }

    const payment = await prisma.payment.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(transactionId && { transactionId }),
      },
      include: {
        order: true,
      },
    });

    // If payment completed, update order status
    if (status === "COMPLETED") {
      await prisma.order.update({
        where: { id: payment.orderId },
        data: { status: "CONFIRMED" },
      });
    }

    return NextResponse.json(payment);
  } catch (error) {
    console.error("PUT /api/payments error:", error);
    return NextResponse.json({ error: "Failed to update payment" }, { status: 500 });
  }
}
