# Orders API

## GET /api/orders

List orders with filters.

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `status` | string | NEW, CONFIRMED, PREPARING, READY, COMPLETED, CANCELLED |
| `dateFrom` | string | Start date (YYYY-MM-DD) |
| `dateTo` | string | End date (YYYY-MM-DD) |
| `page` | number | Page number |
| `limit` | number | Items per page |

**Response:**
```json
{
  "orders": [
    {
      "id": "clx...",
      "orderNumber": "ORD-20241223-001",
      "status": "NEW",
      "totalUsd": 15.50,
      "totalKhr": 63550,
      "currency": "USD",
      "channel": "WEBSITE",
      "customer": {
        "name": "John",
        "phone": "+855123456789"
      },
      "items": [
        {
          "productId": "clx...",
          "quantity": 2,
          "priceUsd": 3.50,
          "product": { "nameEn": "Cappuccino" }
        }
      ],
      "createdAt": "2024-12-23T10:00:00Z"
    }
  ],
  "total": 150
}
```

---

## POST /api/orders

Create new order.

**Request:**
```json
{
  "customerPhone": "+855123456789",
  "customerName": "John Doe",
  "items": [
    { "productId": "clx...", "quantity": 2 },
    { "productId": "clx...", "quantity": 1 }
  ],
  "channel": "WEBSITE",
  "currency": "USD",
  "note": "No sugar please"
}
```

**Response (201):**
```json
{
  "id": "clx...",
  "orderNumber": "ORD-20241223-001",
  "status": "NEW",
  "totalUsd": 15.50,
  "totalKhr": 63550
}
```

---

## PUT /api/orders

Update order status.

**Request:**
```json
{
  "id": "clx...",
  "status": "CONFIRMED"
}
```

---

## Order Status Flow

```
NEW → CONFIRMED → PREPARING → READY → COMPLETED
  │
  └────────────→ CANCELLED
```

| Status | Description |
|--------|-------------|
| `NEW` | Just placed, awaiting payment |
| `CONFIRMED` | Payment confirmed |
| `PREPARING` | Being prepared |
| `READY` | Ready for pickup |
| `COMPLETED` | Delivered/picked up |
| `CANCELLED` | Cancelled |

---

## Order Channels

| Channel | Description |
|---------|-------------|
| `WEBSITE` | Web order |
| `TELEGRAM` | Telegram bot |
| `MESSENGER` | Facebook Messenger |
| `PHONE` | Phone order |
| `WALK_IN` | Walk-in customer |

---

# React Query Hooks

```tsx
import {
  useOrders,
  useCreateOrder,
  useUpdateOrderStatus
} from '@/lib/api-hooks'

// List orders
const { data } = useOrders({ status: 'NEW' })

// Create order
const create = useCreateOrder()
await create.mutateAsync({
  customerPhone: '+855...',
  items: [{ productId: 'clx...', quantity: 2 }]
})

// Update status
const update = useUpdateOrderStatus()
await update.mutateAsync({ id: 'clx...', status: 'CONFIRMED' })
```
