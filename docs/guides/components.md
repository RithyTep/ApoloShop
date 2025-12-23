# Component Patterns

## UI Components (Shadcn)

Located in `components/ui/`. These are base primitives.

| Component | Usage |
|-----------|-------|
| `button.tsx` | Buttons with variants |
| `card.tsx` | Content containers |
| `dialog.tsx` | Modal dialogs |
| `input.tsx` | Form inputs |
| `select.tsx` | Dropdowns |
| `table.tsx` | Data tables |
| `toast.tsx` | Notifications |
| `badge.tsx` | Status indicators |

### Button Variants

```tsx
import { Button } from '@/components/ui/button'

<Button variant="default">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
```

### Card Pattern

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>Order Details</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

---

## Page Components

Located in `components/pages/`. Full page layouts.

| Component | Route |
|-----------|-------|
| `orders-page.tsx` | /admin/orders |
| `products-page.tsx` | /admin/products |
| `customers-page.tsx` | /admin/customers |
| `kds-page.tsx` | /admin/kds |
| `settings-page.tsx` | /admin/settings |

### Page Structure

```tsx
// components/pages/orders-page.tsx
'use client'

import { useOrders } from '@/lib/api-hooks'
import { OrderCard } from '@/components/order-card'

export function OrdersPage() {
  const { data, isLoading } = useOrders()

  if (isLoading) return <Skeleton />

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Orders</h1>
      <div className="grid gap-4">
        {data?.orders.map(order => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>
    </div>
  )
}
```

---

## Feature Components

### Order Card

```tsx
import { OrderCard } from '@/components/order-card'

<OrderCard
  order={order}
  onStatusChange={handleStatusChange}
  showActions={true}
/>
```

### Product Card

```tsx
import { ProductCard } from '@/components/product-card'

<ProductCard
  product={product}
  onAddToCart={handleAddToCart}
  currency="USD"
/>
```

### Cart Summary

```tsx
import { CartSummary } from '@/components/cart-summary'

<CartSummary
  items={cartItems}
  onCheckout={handleCheckout}
  currency={currency}
/>
```

---

## Layout Components

### Admin Dashboard

```tsx
import { AdminDashboard } from '@/components/admin-dashboard'

// Provides sidebar navigation and header
<AdminDashboard>
  <OrdersPage />
</AdminDashboard>
```

### Shop App

```tsx
import { ShopApp } from '@/components/shop-app'

// Provides shop layout with cart
<ShopApp />
```

---

## Common Patterns

### Loading States

```tsx
import { Skeleton } from '@/components/ui/skeleton'

if (isLoading) {
  return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  )
}
```

### Empty States

```tsx
if (data?.orders.length === 0) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <p>No orders found</p>
    </div>
  )
}
```

### Error States

```tsx
if (error) {
  return (
    <Alert variant="destructive">
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{error.message}</AlertDescription>
    </Alert>
  )
}
```

### Confirmation Dialog

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

<AlertDialog open={showDelete} onOpenChange={setShowDelete}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete Order?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete}>
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Form Patterns

### Controlled Form

```tsx
const [formData, setFormData] = useState({
  name: '',
  price: 0
})

<Input
  value={formData.name}
  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
/>
```

### Form with Mutation

```tsx
const createProduct = useCreateProduct()

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  try {
    await createProduct.mutateAsync(formData)
    toast({ title: 'Product created!' })
    onClose()
  } catch (error) {
    toast({ title: 'Error', variant: 'destructive' })
  }
}
```
