import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import {
  type PaymentGatewayType,
  type PaymentInitRequest,
  type PaymentInitResponse,
  generateTransactionId,
  formatPaymentAmount,
  getPaymentGateway,
} from "@/lib/payment-gateways";
import { generateKHQRImage } from "@/lib/khqr";

// Map our gateway types to Prisma PaymentMethod enum
function mapGatewayToPaymentMethod(
  gateway: PaymentGatewayType
): "CASH" | "ABA_KHQR" | "WING" | "PAYWAY" | "BANK_TRANSFER" {
  switch (gateway) {
    case "ABA_PAYWAY":
      return "PAYWAY";
    case "WING":
      return "WING";
    case "KHQR":
      return "ABA_KHQR";
    case "CASH":
      return "CASH";
    default:
      return "CASH";
  }
}

// Generate ABA PayWay hash
function generateABAHash(
  merchantId: string,
  tranId: string,
  amount: string,
  items: string,
  firstName: string,
  lastName: string,
  email: string,
  phone: string,
  apiKey: string
): string {
  const hashStr = `${apiKey}${merchantId}${tranId}${amount}${items}${firstName}${lastName}${email}${phone}`;
  return crypto.createHash("sha512").update(hashStr).digest("base64");
}

// Generate Wing signature
function generateWingSignature(
  merchantCode: string,
  transactionId: string,
  amount: string,
  currency: string,
  secretKey: string
): string {
  const signStr = `${merchantCode}${transactionId}${amount}${currency}${secretKey}`;
  return crypto.createHmac("sha256", secretKey).update(signStr).digest("hex");
}

// POST /api/payments/gateway - Initialize payment with selected gateway
export async function POST(request: NextRequest) {
  try {
    const body: PaymentInitRequest = await request.json();
    const { orderId, gateway, amount, currency, returnUrl, callbackUrl, customerPhone, customerName } = body;

    // Validate required fields
    if (!orderId || !gateway) {
      return NextResponse.json(
        { success: false, message: "Order ID and gateway are required" },
        { status: 400 }
      );
    }

    // Verify gateway exists
    const gatewayConfig = getPaymentGateway(gateway);
    if (!gatewayConfig) {
      return NextResponse.json(
        { success: false, message: "Invalid payment gateway" },
        { status: 400 }
      );
    }

    // Get the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    // Use provided amount or order total
    const paymentAmount = amount ?? (currency === "USD" ? Number(order.totalUsd) : order.totalKhr);
    const paymentCurrency = currency ?? order.currency;

    // Get payment settings from database
    const paymentSettings = await prisma.setting.findUnique({
      where: { key: "payment_methods" },
    });
    const settings = (paymentSettings?.value as Record<string, unknown>) || {};

    // Get shop name
    const shopNameSetting = await prisma.setting.findUnique({
      where: { key: "shop_name" },
    });
    const shopName = (shopNameSetting?.value as { en?: string })?.en || "ApoloShop";

    let response: PaymentInitResponse;
    const transactionId = generateTransactionId(gateway.substring(0, 3));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

    switch (gateway) {
      case "CASH": {
        // Cash on Delivery - Create payment record with pending status
        const payment = await prisma.payment.create({
          data: {
            orderId,
            method: "CASH",
            amount: paymentAmount,
            currency: paymentCurrency,
            status: "PENDING",
            transactionId,
            metadata: {
              type: "COD",
              confirmationRequired: true,
              initiatedAt: new Date().toISOString(),
              customerPhone,
              customerName,
            },
          },
        });

        // Update order status to CONFIRMED for COD (awaiting delivery)
        await prisma.order.update({
          where: { id: orderId },
          data: { status: "CONFIRMED" },
        });

        response = {
          success: true,
          paymentId: payment.id,
          confirmationRequired: true,
          amount: paymentAmount,
          currency: paymentCurrency,
          message: "Order confirmed. Pay on delivery.",
        };
        break;
      }

      case "ABA_PAYWAY": {
        // ABA PayWay integration
        const abaSettings = settings.aba_payway as Record<string, string> | undefined;
        const merchantId = abaSettings?.merchantId || process.env.ABA_MERCHANT_ID || "";
        const apiKey = abaSettings?.apiKey || process.env.ABA_API_KEY || "";
        const publicKey = abaSettings?.publicKey || process.env.ABA_PUBLIC_KEY || "";

        if (!merchantId || !apiKey) {
          return NextResponse.json(
            { success: false, message: "ABA PayWay not configured" },
            { status: 400 }
          );
        }

        const formattedAmount = formatPaymentAmount(paymentAmount, paymentCurrency);
        const items = `Order ${order.orderNumber}`;
        const nameParts = (customerName || order.customer?.name || "Customer").split(" ");
        const firstName = nameParts[0] || "Customer";
        const lastName = nameParts.slice(1).join(" ") || "";
        const phone = customerPhone || order.customer?.phone || "";
        const email = order.customer?.email || "";

        const hash = generateABAHash(
          merchantId,
          transactionId,
          formattedAmount,
          items,
          firstName,
          lastName,
          email,
          phone,
          apiKey
        );

        // Create payment record
        const payment = await prisma.payment.create({
          data: {
            orderId,
            method: "PAYWAY",
            amount: paymentAmount,
            currency: paymentCurrency,
            status: "PENDING",
            transactionId,
            metadata: {
              gateway: "ABA_PAYWAY",
              merchantId,
              hash,
              initiatedAt: new Date().toISOString(),
            },
          },
        });

        // Build PayWay redirect URL
        const baseReturnUrl = returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/checkout/callback`;
        const successUrl = `${baseReturnUrl}?status=success&orderId=${orderId}&paymentId=${payment.id}`;
        const failUrl = `${baseReturnUrl}?status=fail&orderId=${orderId}&paymentId=${payment.id}`;

        // PayWay checkout URL (production or sandbox)
        const payWayBaseUrl = process.env.ABA_PAYWAY_URL || "https://checkout.payway.com.kh/api/payment-gateway/v1";

        // Build form data for PayWay
        const payWayParams = new URLSearchParams({
          merchant_id: merchantId,
          tran_id: transactionId,
          amount: formattedAmount,
          currency: paymentCurrency,
          items,
          firstname: firstName,
          lastname: lastName,
          phone,
          email,
          return_url: failUrl,
          continue_success_url: successUrl,
          hash,
          public_key: publicKey,
        });

        response = {
          success: true,
          paymentId: payment.id,
          redirectUrl: `${payWayBaseUrl}/checkout?${payWayParams.toString()}`,
          amount: paymentAmount,
          currency: paymentCurrency,
          expiresAt,
        };
        break;
      }

      case "WING": {
        // Wing Mobile Payment integration
        const wingSettings = settings.wing as Record<string, string> | undefined;
        const merchantCode = wingSettings?.merchantCode || process.env.WING_MERCHANT_CODE || "";
        const wingApiKey = wingSettings?.apiKey || process.env.WING_API_KEY || "";
        const secretKey = wingSettings?.secretKey || process.env.WING_SECRET_KEY || "";

        if (!merchantCode || !wingApiKey) {
          return NextResponse.json(
            { success: false, message: "Wing payment not configured" },
            { status: 400 }
          );
        }

        const formattedAmount = formatPaymentAmount(paymentAmount, paymentCurrency);
        const signature = generateWingSignature(
          merchantCode,
          transactionId,
          formattedAmount,
          paymentCurrency,
          secretKey
        );

        // Create payment record
        const payment = await prisma.payment.create({
          data: {
            orderId,
            method: "WING",
            amount: paymentAmount,
            currency: paymentCurrency,
            status: "PENDING",
            transactionId,
            metadata: {
              gateway: "WING",
              merchantCode,
              signature,
              initiatedAt: new Date().toISOString(),
            },
          },
        });

        // Wing API URL (production or sandbox)
        const wingBaseUrl = process.env.WING_API_URL || "https://api.wing.money/v1";
        const baseReturnUrl = returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/checkout/callback`;
        const wingCallbackUrl = callbackUrl || `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/webhook/wing`;

        // Build Wing payment request
        const wingParams = new URLSearchParams({
          merchant_code: merchantCode,
          transaction_id: transactionId,
          amount: formattedAmount,
          currency: paymentCurrency,
          description: `Order ${order.orderNumber}`,
          customer_phone: customerPhone || order.customer?.phone || "",
          callback_url: wingCallbackUrl,
          return_url: baseReturnUrl,
          signature,
        });

        response = {
          success: true,
          paymentId: payment.id,
          redirectUrl: `${wingBaseUrl}/checkout?${wingParams.toString()}`,
          amount: paymentAmount,
          currency: paymentCurrency,
          expiresAt,
        };
        break;
      }

      case "KHQR": {
        // KHQR (Bakong) QR Code payment
        const khqrSettings = settings.khqr as Record<string, string> | undefined;
        const merchantId = khqrSettings?.merchantId || process.env.KHQR_MERCHANT_ID || "merchant@bakong";
        const merchantName = khqrSettings?.merchantName || shopName;

        // Generate KHQR image
        const qrImage = await generateKHQRImage({
          merchantName,
          merchantId,
          amount: paymentAmount,
          currency: paymentCurrency,
          orderId: order.orderNumber,
          description: `Order ${order.orderNumber}`,
        });

        // Create payment record
        const payment = await prisma.payment.create({
          data: {
            orderId,
            method: "ABA_KHQR",
            amount: paymentAmount,
            currency: paymentCurrency,
            status: "PENDING",
            transactionId,
            metadata: {
              gateway: "KHQR",
              merchantId,
              qrGenerated: new Date().toISOString(),
            },
          },
        });

        response = {
          success: true,
          paymentId: payment.id,
          qrImage,
          amount: paymentAmount,
          currency: paymentCurrency,
          expiresAt,
          message: "Scan QR code with any Cambodian banking app",
        };
        break;
      }

      default:
        return NextResponse.json(
          { success: false, message: "Unsupported payment gateway" },
          { status: 400 }
        );
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("POST /api/payments/gateway error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to initialize payment" },
      { status: 500 }
    );
  }
}

// GET /api/payments/gateway - Get available payment gateways
export async function GET() {
  try {
    // Get payment settings from database
    const paymentSettings = await prisma.setting.findUnique({
      where: { key: "payment_methods" },
    });
    const settings = (paymentSettings?.value as Record<string, unknown>) || {};

    // Filter enabled gateways
    const enabledMethods = settings.enabled as string[] | undefined;
    const gateways: PaymentGatewayType[] = ["CASH", "ABA_PAYWAY", "WING", "KHQR"];

    const availableGateways = gateways.filter((g) => {
      if (!enabledMethods) return true; // All enabled by default
      return enabledMethods.includes(g);
    });

    const gatewayDetails = availableGateways.map((id) => {
      const config = getPaymentGateway(id);
      return {
        id,
        name: config?.name || { en: id, kh: id },
        description: config?.description || { en: "", kh: "" },
        icon: config?.icon || "CreditCard",
        supportedCurrencies: config?.supportedCurrencies || ["USD", "KHR"],
      };
    });

    return NextResponse.json({
      success: true,
      gateways: gatewayDetails,
    });
  } catch (error) {
    console.error("GET /api/payments/gateway error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch payment gateways" },
      { status: 500 }
    );
  }
}
