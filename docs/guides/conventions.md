# Code Conventions

## File Naming

| Type | Convention | Example |
|------|------------|---------|
| Components | `kebab-case.tsx` | `order-card.tsx` |
| Page components | `*-page.tsx` | `orders-page.tsx` |
| UI primitives | `components/ui/` | `button.tsx` |
| Utilities | `camelCase.ts` | `formatCurrency.ts` |
| Types | `PascalCase` | `OrderStatus` |

---

## Component Structure

```tsx
// 1. Imports
import { useState } from 'react'
import { Button } from '@/components/ui/button'

// 2. Types/Interfaces
interface OrderCardProps {
  order: Order
  onStatusChange: (status: OrderStatus) => void
}

// 3. Component
export function OrderCard({ order, onStatusChange }: OrderCardProps) {
  // Hooks first
  const [loading, setLoading] = useState(false)

  // Handlers
  const handleClick = () => { ... }

  // Render
  return (
    <div>...</div>
  )
}
```

---

## State Management

### Server State (React Query)
```tsx
import { useOrders, useUpdateOrderStatus } from '@/lib/api-hooks'

function OrderList() {
  const { data, isLoading } = useOrders()
  const updateStatus = useUpdateOrderStatus()

  const handleStatusChange = async (id: string, status: OrderStatus) => {
    await updateStatus.mutateAsync({ id, status })
  }
}
```

### Client State (React useState)
```tsx
const [isOpen, setIsOpen] = useState(false)
const [selectedId, setSelectedId] = useState<string | null>(null)
```

---

## API Routes

```typescript
// app/api/orders/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth-middleware'

// GET /api/orders
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  const orders = await prisma.order.findMany({
    where: status ? { status } : undefined,
    include: { items: true }
  })

  return NextResponse.json({ orders })
}

// POST /api/orders
export async function POST(request: NextRequest) {
  const body = await request.json()

  const order = await prisma.order.create({
    data: body
  })

  return NextResponse.json(order, { status: 201 })
}
```

---

## i18n Usage

```tsx
import { useI18n } from '@/providers/i18n-provider'

function ProductCard({ product }) {
  const { t, language } = useI18n()

  return (
    <div>
      <h3>{language === 'en' ? product.nameEn : product.nameKh}</h3>
      <button>{t('addToCart')}</button>
    </div>
  )
}
```

---

## Currency Formatting

```tsx
import { formatCurrency } from '@/lib/utils'

// USD formatting
formatCurrency(15.50, 'USD') // "$15.50"

// KHR formatting
formatCurrency(63550, 'KHR') // "៛63,550"
```

---

## Error Handling

```tsx
// API Route
try {
  const result = await prisma.order.create({ ... })
  return NextResponse.json(result)
} catch (error) {
  console.error('Order creation failed:', error)
  return NextResponse.json(
    { error: 'Failed to create order' },
    { status: 500 }
  )
}

// Component
const mutation = useCreateOrder()

try {
  await mutation.mutateAsync(data)
  toast({ title: 'Order created!' })
} catch (error) {
  toast({ title: 'Error', description: error.message, variant: 'destructive' })
}
```

---

## Git Workflow

### Branches

| Branch | Purpose |
|--------|---------|
| `main` | Production |
| `Develop` | Development |
| `Feature/xxx` | New features |
| `Bugfix/xxx` | Bug fixes |

### Commit Format

```
[feature-name] Short description

- Detail 1
- Detail 2
```

**Examples:**
```
[auth] Add JWT-based authentication
[orders] Fix status transition validation
[i18n] Add Khmer translations for checkout
```

---

## TypeScript

```typescript
// Prefer interfaces for objects
interface Order {
  id: string
  status: OrderStatus
  items: OrderItem[]
}

// Use type for unions/aliases
type OrderStatus = 'NEW' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED'

// Always type function parameters
function calculateTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.priceUsd * item.quantity, 0)
}
```
