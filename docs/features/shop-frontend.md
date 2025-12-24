# Feature: Shop Frontend

> **Branch:** `Develop`
> **Status:** Complete
> **Last Updated:** 2025-12-24

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
5. **Multi-language** - English (EN) and Khmer (KH) support
6. **Multi-currency** - USD and KHR with live toggle
7. **Store Status** - Shows Open/Closed status with business hours

---

## Components

| Component | Path | Description |
|-----------|------|-------------|
| `ShopApp` | `components/shop-app.tsx` | Main shop container with cart state |
| `ProductGrid` | `components/product-grid.tsx` | Product listing with category filter |
| `CartDrawer` | `components/cart-drawer.tsx` | Sliding cart sidebar |
| `CheckoutPage` | `components/checkout-page.tsx` | Checkout form with order creation |
| `Header` | `components/header.tsx` | Shop header with pill toggles |
| `StoreStatus` | `components/shop/store-status.tsx` | Open/Closed status badge |

---

## Header Design

The header uses **pill toggle buttons** for language and currency switching:

```
┌─────────────────────────────────────────────────────────┐
│  [Logo] Shop Name  [Open●]    [EN|ខ្មែរ] [$|៛] [🛒]     │
└─────────────────────────────────────────────────────────┘
```

### Pill Toggle Features
- Compact design with rounded pill shape
- Active state shows solid background
- Inactive state shows muted text
- Smooth transition animations

### Store Status Badge
- Shows "Open" (green) or "Closed" (red)
- Pulsing indicator when open
- Tooltip shows business hours
- Respects holidays from BusinessHours module

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/products` | Fetch active products |
| `GET` | `/api/categories` | Fetch active categories |
| `POST` | `/api/orders` | Create new order |
| `GET` | `/api/business-hours/status` | Get store open/closed status |

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

**Note:** Prices are automatically fetched from the database - no need to send `priceUsd` or `priceKhr` in the request.

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
| `useStoreStatus` | `lib/api-hooks.ts` | Get store open/closed status |

### Example Usage

```typescript
import { useProducts, useCategories, useCreateOrder, useStoreStatus } from '@/lib/api-hooks';

function ProductList() {
  const { data, isLoading } = useProducts();
  const { data: status } = useStoreStatus();
  const createOrder = useCreateOrder();

  // Use data.products to render products
  // Use status.isOpen to check store status
  // Use createOrder.mutateAsync() to place orders
}
```

---

## User Flow

```
1. User visits /shop
   └── ProductGrid loads products and categories
   └── Header shows store status (Open/Closed)

2. User browses products
   └── Can filter by category
   └── Sees stock availability
   └── Can toggle language (EN/KH)
   └── Can toggle currency (USD/KHR)

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
| Open | "Open" | "បើក" |
| Closed | "Closed" | "បិទ" |

---

## Multi-currency Support

Prices display in both USD and KHR:
- Exchange rate: 1 USD = 4,100 KHR (configurable in settings)
- Currency toggle in header (pill buttons: $ | ៛)
- Prices stored as both `priceUsd` and `priceKhr` in products

---

## Related Files

- `app/shop/page.tsx` - Shop route entry point
- `components/shop-app.tsx` - Main shop container
- `components/header.tsx` - Header with pill toggles
- `components/shop/store-status.tsx` - Store status badge
- `components/product-grid.tsx` - Product display with hooks
- `components/checkout-page.tsx` - Checkout with order creation
- `components/cart-drawer.tsx` - Cart management
- `lib/api-hooks.ts` - React Query hooks
- `app/api/orders/route.ts` - Order API endpoint

---

## Testing

### E2E Tests (7 tests)
Located in `e2e/shop.spec.ts`:
- Display shop page header
- Display products or empty state
- Currency toggle in header
- Toggle currency
- Category filter buttons
- Add to cart button
- Cart icon in header

### Manual Testing

1. Visit `/shop`
2. Verify products load from database
3. Check store status badge (Open/Closed)
4. Toggle language with pill buttons
5. Toggle currency with pill buttons
6. Filter by category
7. Add items to cart
8. Proceed to checkout
9. Fill in contact details
10. Click "Order via Telegram"
11. Verify order appears in admin dashboard

---

## Changelog

### 2025-12-24
- Updated header to use pill toggle buttons for language/currency
- Currency toggles now show symbols ($ / ៛) instead of text
- Language toggles show "EN" and "ខ្មែរ"
- Added store status badge integration
- Order API now auto-fetches product prices

### 2025-12-23
- Initial shop frontend implementation
- Added category filtering
- Added cart and checkout functionality

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
