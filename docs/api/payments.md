# Payments API

## GET /api/payments

List payments with filters.

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `orderId` | string | Filter by order |
| `status` | string | PENDING, COMPLETED, FAILED, REFUNDED |
| `method` | string | Payment method |
| `dateFrom` | string | Start date (YYYY-MM-DD) |
| `dateTo` | string | End date (YYYY-MM-DD) |

**Response:**
```json
{
  "payments": [
    {
      "id": "clx...",
      "orderId": "clx...",
      "method": "ABA_KHQR",
      "amount": 15.50,
      "currency": "USD",
      "status": "COMPLETED",
      "transactionId": "TXN123456",
      "createdAt": "2024-12-23T10:00:00Z",
      "order": {
        "orderNumber": "ORD-20241223-001"
      }
    }
  ],
  "total": 50
}
```

---

## POST /api/payments

Record a payment.

**Request:**
```json
{
  "orderId": "clx...",
  "method": "ABA_KHQR",
  "amount": 15.50,
  "currency": "USD",
  "transactionId": "TXN123456"
}
```

**Response (201):**
```json
{
  "id": "clx...",
  "status": "COMPLETED"
}
```

---

## PUT /api/payments

Update payment status (refund, mark failed).

**Request:**
```json
{
  "id": "clx...",
  "status": "REFUNDED"
}
```

---

## POST /api/payments/khqr

Generate KHQR QR code for payment.

**Request:**
```json
{
  "orderId": "clx...",
  "amount": 15.50,
  "currency": "USD"
}
```

**Response:**
```json
{
  "qrData": "00020101021229...",
  "qrImage": "data:image/png;base64,...",
  "amount": 15.50,
  "currency": "USD"
}
```

---

## Payment Methods

| Method | Description |
|--------|-------------|
| `CASH` | Cash payment |
| `ABA_KHQR` | ABA Bank KHQR |
| `WING` | Wing Money |
| `PAYWAY` | PayWay gateway |
| `BANK_TRANSFER` | Direct bank transfer |

## Payment Status

| Status | Description |
|--------|-------------|
| `PENDING` | Awaiting payment |
| `COMPLETED` | Payment received |
| `FAILED` | Payment failed |
| `REFUNDED` | Payment refunded |

---

# KHQR Integration

The system uses Bakong KHQR standard for QR payments.

```tsx
import { generateKHQR, generateQRImage } from '@/lib/khqr'

// Generate KHQR data
const qrData = generateKHQR({
  merchantName: 'ApoloShop',
  merchantId: '123456789',
  amount: 15.50,
  currency: 'USD',
  transactionRef: 'ORD-20241223-001'
})

// Generate QR image
const qrImage = await generateQRImage(qrData)
```

---

# React Query Hooks

```tsx
import {
  usePayments,
  useCreatePayment,
  useGenerateKHQR
} from '@/lib/api-hooks'

// List payments
const { data } = usePayments({ status: 'COMPLETED' })

// Record payment
const create = useCreatePayment()
await create.mutateAsync({
  orderId: 'clx...',
  method: 'CASH',
  amount: 15.50
})

// Generate KHQR
const khqr = useGenerateKHQR()
const { qrImage } = await khqr.mutateAsync({
  orderId: 'clx...',
  amount: 15.50
})
```
