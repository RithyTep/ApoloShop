// Payment Gateway Configurations for Cambodian Market
// Supports: ABA PayWay, Wing, KHQR (Bakong), Cash on Delivery

export type PaymentGatewayType = "ABA_PAYWAY" | "WING" | "KHQR" | "CASH";

export interface PaymentGatewayConfig {
  id: PaymentGatewayType;
  name: {
    en: string;
    kh: string;
  };
  description: {
    en: string;
    kh: string;
  };
  icon: string; // Lucide icon name or emoji
  enabled: boolean;
  supportedCurrencies: ("USD" | "KHR")[];
  requiresConfig: boolean;
  configFields?: PaymentConfigField[];
}

export interface PaymentConfigField {
  key: string;
  label: {
    en: string;
    kh: string;
  };
  type: "text" | "password" | "select";
  required: boolean;
  placeholder?: string;
}

// ABA PayWay Configuration
export const ABA_PAYWAY_CONFIG: PaymentGatewayConfig = {
  id: "ABA_PAYWAY",
  name: {
    en: "ABA PayWay",
    kh: "អេប៊ីអេ ភេវេ",
  },
  description: {
    en: "Pay with ABA Bank (Cards, Mobile Banking, KHQR)",
    kh: "បង់ប្រាក់តាមធនាគារ ABA (កាត, Mobile Banking, KHQR)",
  },
  icon: "CreditCard",
  enabled: true,
  supportedCurrencies: ["USD", "KHR"],
  requiresConfig: true,
  configFields: [
    {
      key: "merchantId",
      label: { en: "Merchant ID", kh: "លេខសម្គាល់អ្នកលក់" },
      type: "text",
      required: true,
      placeholder: "e.g., aba_merchant_123",
    },
    {
      key: "apiKey",
      label: { en: "API Key", kh: "សោ API" },
      type: "password",
      required: true,
    },
    {
      key: "publicKey",
      label: { en: "Public Key", kh: "សោសាធារណៈ" },
      type: "text",
      required: true,
    },
  ],
};

// Wing Mobile Payment Configuration
export const WING_CONFIG: PaymentGatewayConfig = {
  id: "WING",
  name: {
    en: "Wing",
    kh: "វីង",
  },
  description: {
    en: "Pay with Wing mobile money",
    kh: "បង់ប្រាក់តាម Wing Mobile",
  },
  icon: "Smartphone",
  enabled: true,
  supportedCurrencies: ["USD", "KHR"],
  requiresConfig: true,
  configFields: [
    {
      key: "merchantCode",
      label: { en: "Merchant Code", kh: "លេខកូដអ្នកលក់" },
      type: "text",
      required: true,
      placeholder: "e.g., WING_12345",
    },
    {
      key: "apiKey",
      label: { en: "API Key", kh: "សោ API" },
      type: "password",
      required: true,
    },
    {
      key: "secretKey",
      label: { en: "Secret Key", kh: "សោសម្ងាត់" },
      type: "password",
      required: true,
    },
  ],
};

// KHQR (Bakong) Configuration
export const KHQR_CONFIG: PaymentGatewayConfig = {
  id: "KHQR",
  name: {
    en: "KHQR (Bakong)",
    kh: "KHQR (បាគង)",
  },
  description: {
    en: "Scan KHQR code with any banking app",
    kh: "ស្កេន KHQR ជាមួយកម្មវិធីធនាគារណាមួយ",
  },
  icon: "QrCode",
  enabled: true,
  supportedCurrencies: ["USD", "KHR"],
  requiresConfig: true,
  configFields: [
    {
      key: "merchantId",
      label: { en: "Bakong Merchant ID", kh: "លេខសម្គាល់អ្នកលក់បាគង" },
      type: "text",
      required: true,
      placeholder: "e.g., merchant@bakong",
    },
    {
      key: "merchantName",
      label: { en: "Merchant Display Name", kh: "ឈ្មោះបង្ហាញអ្នកលក់" },
      type: "text",
      required: true,
    },
  ],
};

// Cash on Delivery Configuration
export const CASH_CONFIG: PaymentGatewayConfig = {
  id: "CASH",
  name: {
    en: "Cash on Delivery",
    kh: "បង់លុយពេលទទួល",
  },
  description: {
    en: "Pay cash when you receive your order",
    kh: "បង់ប្រាក់សុទ្ធពេលទទួលការបញ្ជាទិញ",
  },
  icon: "Banknote",
  enabled: true,
  supportedCurrencies: ["USD", "KHR"],
  requiresConfig: false,
};

// All payment gateways
export const PAYMENT_GATEWAYS: PaymentGatewayConfig[] = [
  CASH_CONFIG,
  ABA_PAYWAY_CONFIG,
  WING_CONFIG,
  KHQR_CONFIG,
];

// Get gateway by ID
export function getPaymentGateway(id: PaymentGatewayType): PaymentGatewayConfig | undefined {
  return PAYMENT_GATEWAYS.find((g) => g.id === id);
}

// Get enabled gateways
export function getEnabledGateways(
  settings?: Record<string, boolean>
): PaymentGatewayConfig[] {
  if (!settings) return PAYMENT_GATEWAYS.filter((g) => g.enabled);
  return PAYMENT_GATEWAYS.filter((g) => settings[g.id] !== false);
}

// Payment request/response types
export interface PaymentInitRequest {
  orderId: string;
  gateway: PaymentGatewayType;
  amount: number;
  currency: "USD" | "KHR";
  returnUrl?: string;
  callbackUrl?: string;
  customerPhone?: string;
  customerName?: string;
}

export interface PaymentInitResponse {
  success: boolean;
  paymentId: string;
  // For redirect-based payments (PayWay, Wing)
  redirectUrl?: string;
  // For QR-based payments (KHQR)
  qrCode?: string;
  qrImage?: string;
  // For COD
  confirmationRequired?: boolean;
  // Common fields
  amount: number;
  currency: "USD" | "KHR";
  expiresAt?: string;
  message?: string;
}

export interface PaymentVerifyRequest {
  paymentId: string;
  transactionId?: string;
}

export interface PaymentVerifyResponse {
  success: boolean;
  status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED" | "CANCELLED";
  transactionId?: string;
  paidAmount?: number;
  paidCurrency?: "USD" | "KHR";
  paidAt?: string;
  message?: string;
}

// ABA PayWay API types
export interface ABAPayWayRequest {
  merchant_id: string;
  tran_id: string;
  amount: string;
  currency: "USD" | "KHR";
  items: string;
  firstname: string;
  lastname: string;
  phone: string;
  email?: string;
  return_url: string;
  continue_success_url: string;
  payment_option?: "abapay" | "cards" | "abapay_deeplink" | "wechat" | "alipay";
  hash: string;
}

export interface ABAPayWayResponse {
  status: number; // 0 = success, 1 = pending, 2 = failed
  tran_id: string;
  amount: string;
  payment_status?: string;
  apv?: string; // Approval code
  datetime?: string;
}

// Wing API types
export interface WingPaymentRequest {
  merchant_code: string;
  transaction_id: string;
  amount: number;
  currency: "USD" | "KHR";
  description: string;
  customer_phone: string;
  callback_url: string;
  return_url: string;
  signature: string;
}

export interface WingPaymentResponse {
  status: "SUCCESS" | "PENDING" | "FAILED";
  wing_transaction_id?: string;
  payment_url?: string;
  qr_code?: string;
  message?: string;
}

// Helper to generate transaction ID
export function generateTransactionId(prefix: string): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// Helper to format amount
export function formatPaymentAmount(amount: number, currency: "USD" | "KHR"): string {
  if (currency === "USD") {
    return amount.toFixed(2);
  }
  return Math.round(amount).toString();
}

// COD confirmation status
export type CODStatus = "PENDING_CONFIRMATION" | "CONFIRMED" | "READY_FOR_PICKUP" | "DELIVERED" | "CANCELLED";

export interface CODPaymentData {
  orderId: string;
  amount: number;
  currency: "USD" | "KHR";
  status: CODStatus;
  confirmedAt?: string;
  deliveredAt?: string;
  collectedBy?: string;
}

// Validate payment gateway configuration
export function validateGatewayConfig(
  gateway: PaymentGatewayType,
  config: Record<string, string>
): { valid: boolean; errors: string[] } {
  const gatewayConfig = getPaymentGateway(gateway);
  if (!gatewayConfig) {
    return { valid: false, errors: ["Unknown payment gateway"] };
  }

  if (!gatewayConfig.requiresConfig) {
    return { valid: true, errors: [] };
  }

  const errors: string[] = [];
  for (const field of gatewayConfig.configFields || []) {
    if (field.required && !config[field.key]) {
      errors.push(`${field.label.en} is required`);
    }
  }

  return { valid: errors.length === 0, errors };
}
