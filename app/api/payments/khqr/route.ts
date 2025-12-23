import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateKHQRImage } from "@/lib/khqr";

// POST /api/payments/khqr - Generate KHQR code for payment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, method } = body;

    if (!orderId) {
      return NextResponse.json({ error: "Order ID required" }, { status: 400 });
    }

    // Get the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Get shop settings for merchant info
    const shopNameSetting = await prisma.setting.findUnique({
      where: { key: "shop_name" },
    });
    const shopName = (shopNameSetting?.value as { en?: string })?.en || "ApoloShop";

    // Get payment settings
    const paymentMethods = await prisma.setting.findUnique({
      where: { key: "payment_methods" },
    });

    // Determine amount based on currency
    const amount = order.currency === "USD" ? Number(order.totalUsd) : order.totalKhr;

    // Generate KHQR based on method
    let merchantId: string;

    if (method === "ABA_KHQR") {
      // For ABA, use the merchant ID from environment or settings
      const abaMerchantId = process.env.ABA_MERCHANT_ID || "apolodev@aba";
      merchantId = abaMerchantId;
    } else if (method === "WING") {
      const wingId = process.env.WING_API_KEY || "apolodev";
      merchantId = `wing@${wingId}`;
    } else {
      // Generic Bakong KHQR
      merchantId = "apolodev@bakong";
    }

    const qrImage = await generateKHQRImage({
      merchantName: shopName,
      merchantId,
      amount,
      currency: order.currency,
      orderId: order.orderNumber,
      description: `Order ${order.orderNumber}`,
    });

    // Create pending payment record
    const payment = await prisma.payment.create({
      data: {
        orderId,
        method: method || "ABA_KHQR",
        amount,
        currency: order.currency,
        status: "PENDING",
        transactionId: `KHQR-${Date.now()}`,
        metadata: {
          qrGenerated: new Date().toISOString(),
          merchantId,
        },
      },
    });

    return NextResponse.json({
      qrImage,
      paymentId: payment.id,
      amount,
      currency: order.currency,
      orderNumber: order.orderNumber,
      expiresIn: 15 * 60, // 15 minutes
    });
  } catch (error) {
    console.error("POST /api/payments/khqr error:", error);
    return NextResponse.json({ error: "Failed to generate KHQR" }, { status: 500 });
  }
}
