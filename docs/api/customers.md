# Customers API

| Meta | Value |
|------|-------|
| **Format** | Markdown |
| **Updated** | 2024-12-23 |
| **Author** | ApoloDev Team |

---

## GET /api/customers

List customers with optional filters.

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Search by name or phone |
| `tag` | string | Filter by tag (VIP, Frequent) |
| `page` | number | Page number |
| `limit` | number | Items per page |

**Response:**
```json
{
  "customers": [
    {
      "id": "clx...",
      "name": "John Doe",
      "phone": "+855123456789",
      "email": "john@example.com",
      "notes": "Prefers less sugar",
      "tags": ["VIP", "Frequent"],
      "orderCount": 25,
      "totalSpent": 450.00,
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 150
}
```

---

## POST /api/customers

Create new customer.

**Request:**
```json
{
  "name": "John Doe",
  "phone": "+855123456789",
  "email": "john@example.com",
  "notes": "Prefers less sugar",
  "tags": ["VIP"]
}
```

**Response (201):**
```json
{
  "id": "clx...",
  "name": "John Doe",
  "phone": "+855123456789"
}
```

---

## PUT /api/customers

Update customer.

**Request:**
```json
{
  "id": "clx...",
  "tags": ["VIP", "Frequent"],
  "notes": "Updated notes"
}
```

---

## DELETE /api/customers?id=xxx

Delete customer.

**Response:**
```json
{ "success": true }
```

---

## Customer Tags

| Tag | Description |
|-----|-------------|
| `VIP` | High-value customer |
| `Frequent` | Regular customer |
| `New` | First-time customer |
| `Wholesale` | Business customer |

---

# React Query Hooks

```tsx
import {
  useCustomers,
  useCreateCustomer,
  useUpdateCustomer
} from '@/lib/api-hooks'

// List customers
const { data } = useCustomers({ search: 'John' })

// Create customer
const create = useCreateCustomer()
await create.mutateAsync({
  name: 'Jane Doe',
  phone: '+855987654321'
})

// Update customer
const update = useUpdateCustomer()
await update.mutateAsync({
  id: 'clx...',
  tags: ['VIP']
})
```
