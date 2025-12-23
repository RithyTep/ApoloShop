# Feature: Shop Frontend

> **Branch:** `Feature/shop-frontend`
> **Status:** Complete
> **Last Updated:** 2025-12-23

---

## Overview

The Shop Frontend provides a customer-facing storefront for ApoloShop. It displays products from the database, supports category filtering, and allows customers to add items to cart and complete checkout via Telegram or Facebook Messenger.

---

## Usage

### Accessing the Shop

Navigate to `/shop` to access the customer storefront.

### Features

1. **Product Browsing** - View all active products with images, prices, and stock status
2. **Category Filtering** - Filter products by category
3. **Cart Management** - Add/remove items, adjust quantities
4. **Checkout** - Place orders via Telegram or Messenger

---

## Components

| Component | Path | Description |
|-----------|------|-------------|
| `ShopApp` | `components/shop-app.tsx` | Main shop container with cart state |
| `ProductGrid` | `components/product-grid.tsx` | Product listing with category filter |
| `CartDrawer` | `components/cart-drawer.tsx` | Sliding cart sidebar |
| `CheckoutPage` | `components/checkout-page.tsx` | Checkout form with order creation |
| `Header` | `components/header.tsx` | Shop header with cart icon |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/products` | Fetch active products |
| `GET` | `/api/categories` | Fetch active categories |
| `POST` | `/api/orders` | Create new order |

### Order Creation Request

```json
POST /api/orders
{
  "customerName": "John Doe",
  "customerPhone": "+855123456789",
  "items": [
    { "productId": "prod_123", "quantity": 2 }
  ],
  "channel": "TELEGRAM",
  "currency": "USD",
  "note": "Delivery instructions"
}
```

### Order Creation Response

```json
{
  "id": "order_abc",
  "orderNumber": "ORD-20251223-001",
  "status": "NEW",
  "totalUsd": 25.00,
  "totalKhr": 100000
}
```

---

## React Query Hooks

| Hook | File | Description |
|------|------|-------------|
| `useProducts` | `lib/api-hooks.ts` | Fetch products with optional category filter |
| `useCategories` | `lib/api-hooks.ts` | Fetch all categories |
| `useCreateOrder` | `lib/api-hooks.ts` | Create new order mutation |

### Example Usage

```typescript
import { useProducts, useCategories, useCreateOrder } from '@/lib/api-hooks';

function ProductList() {
  const { data, isLoading } = useProducts();
  const createOrder = useCreateOrder();

  // Use data.products to render products
  // Use createOrder.mutateAsync() to place orders
}
```

---

## User Flow

```
1. User visits /shop
   └── ProductGrid loads products and categories

2. User browses products
   └── Can filter by category
   └── Sees stock availability

3. User adds to cart
   └── Cart drawer shows items
   └── Can adjust quantities

4. User proceeds to checkout
   └── Fills in name and phone
   └── Chooses Telegram or Messenger

5. Order is created
   └── Order saved to database
   └── Order number displayed
   └── Share message opened
```

---

## Multi-language Support

All text supports English (EN) and Khmer (KH):

| Element | English | Khmer |
|---------|---------|-------|
| Page title | "Our Products" | "ផលិតផលរបស់យើង" |
| Add to Cart | "Add to Cart" | "បន្ថែមទៅរទុក" |
| In Stock | "In Stock" | "មាននៅក្នុងស្តុក" |
| Out of Stock | "Out of Stock" | "អស់ស្តុក" |
| Checkout | "Checkout" | "ឈានទៅការលម្អិត" |

---

## Multi-currency Support

Prices display in both USD and KHR:
- Exchange rate: 1 USD = 4000 KHR
- Currency toggle in header
- Prices stored as both `priceUsd` and `priceKhr` in products

---

## Related Files

- `app/shop/page.tsx` - Shop route entry point
- `components/shop-app.tsx` - Main shop container
- `components/product-grid.tsx` - Product display with hooks
- `components/checkout-page.tsx` - Checkout with order creation
- `components/cart-drawer.tsx` - Cart management
- `lib/api-hooks.ts` - React Query hooks
- `app/api/orders/route.ts` - Order API endpoint

---

## Testing

### Manual Testing

1. Visit `/shop`
2. Verify products load from database
3. Filter by category
4. Add items to cart
5. Proceed to checkout
6. Fill in contact details
7. Click "Order via Telegram"
8. Verify order appears in admin dashboard

### Checklist

- [ ] Products display correctly
- [ ] Category filter works
- [ ] Cart updates properly
- [ ] Checkout creates order in database
- [ ] Success message shows order number
- [ ] Share links open correctly

---

## Known Issues

None currently.

---

## Future Improvements

- [ ] Add product search functionality
- [ ] Implement wishlist feature
- [ ] Add product reviews/ratings
- [ ] Support promotional codes at checkout
- [ ] Add order tracking for customers
