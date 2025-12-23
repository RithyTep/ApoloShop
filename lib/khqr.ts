import QRCode from "qrcode";

// KHQR (Bakong) Payment Standard
// Based on EMVCo QR Code standard for Cambodia

export interface KHQRData {
  merchantName: string;
  merchantId: string; // ABA account number or Wing ID
  amount: number;
  currency: "USD" | "KHR";
  orderId?: string;
  description?: string;
}

interface EMVTag {
  tag: string;
  value: string;
}

function encodeEMV(tag: string, value: string): string {
  const length = value.length.toString().padStart(2, "0");
  return `${tag}${length}${value}`;
}

function calculateCRC16(str: string): string {
  let crc = 0xffff;
  const polynomial = 0x1021;

  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ polynomial) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function generateKHQRPayload(data: KHQRData): string {
  const tags: EMVTag[] = [];

  // Tag 00: Payload Format Indicator
  tags.push({ tag: "00", value: "01" });

  // Tag 01: Point of Initiation Method (12 = Dynamic QR)
  tags.push({ tag: "01", value: "12" });

  // Tag 29: Merchant Account Information (Bakong)
  const merchantAccount = [
    encodeEMV("00", "bakong"), // Globally Unique Identifier for Bakong
    encodeEMV("01", data.merchantId), // Merchant Account
    data.orderId ? encodeEMV("02", data.orderId) : "", // Reference
  ]
    .filter(Boolean)
    .join("");
  tags.push({ tag: "29", value: merchantAccount });

  // Tag 52: Merchant Category Code
  tags.push({ tag: "52", value: "5812" }); // Restaurant/Cafe

  // Tag 53: Transaction Currency (840 = USD, 116 = KHR)
  tags.push({ tag: "53", value: data.currency === "USD" ? "840" : "116" });

  // Tag 54: Transaction Amount
  if (data.amount > 0) {
    const amountStr =
      data.currency === "USD" ? data.amount.toFixed(2) : Math.round(data.amount).toString();
    tags.push({ tag: "54", value: amountStr });
  }

  // Tag 58: Country Code
  tags.push({ tag: "58", value: "KH" });

  // Tag 59: Merchant Name
  tags.push({ tag: "59", value: data.merchantName.substring(0, 25) });

  // Tag 60: Merchant City
  tags.push({ tag: "60", value: "Phnom Penh" });

  // Tag 62: Additional Data Field (optional)
  if (data.description) {
    const additionalData = encodeEMV("05", data.description.substring(0, 50));
    tags.push({ tag: "62", value: additionalData });
  }

  // Build payload without CRC
  let payload = tags.map((t) => encodeEMV(t.tag, t.value)).join("");

  // Add CRC placeholder (Tag 63, 4 characters)
  payload += "6304";

  // Calculate and append CRC
  const crc = calculateCRC16(payload);
  payload = payload.slice(0, -4) + crc;

  return payload;
}

export async function generateKHQRImage(
  data: KHQRData,
  options?: { width?: number; margin?: number }
): Promise<string> {
  const payload = generateKHQRPayload(data);

  const qrImage = await QRCode.toDataURL(payload, {
    width: options?.width ?? 300,
    margin: options?.margin ?? 2,
    errorCorrectionLevel: "M",
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });

  return qrImage;
}

// ABA Bank specific KHQR
export interface ABAPaymentData {
  merchantId: string; // ABA merchant ID
  accountNumber: string;
  amount: number;
  currency: "USD" | "KHR";
  orderId: string;
  merchantName: string;
}

export function generateABAKHQR(data: ABAPaymentData): string {
  return generateKHQRPayload({
    merchantName: data.merchantName,
    merchantId: `aba@${data.accountNumber}`,
    amount: data.amount,
    currency: data.currency,
    orderId: data.orderId,
  });
}

// Wing specific payment
export interface WingPaymentData {
  wingId: string;
  amount: number;
  currency: "USD" | "KHR";
  orderId: string;
  merchantName: string;
}

export function generateWingKHQR(data: WingPaymentData): string {
  return generateKHQRPayload({
    merchantName: data.merchantName,
    merchantId: `wing@${data.wingId}`,
    amount: data.amount,
    currency: data.currency,
    orderId: data.orderId,
  });
}
