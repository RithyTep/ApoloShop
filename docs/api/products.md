# Products API

| Meta | Value |
|------|-------|
| **Format** | Markdown |
| **Updated** | 2024-12-23 |
| **Author** | ApoloDev Team |

---

## GET /api/products

List products with optional filters.

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `categoryId` | string | Filter by category |
| `active` | boolean | Filter active only |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20) |

**Response:**
```json
{
  "products": [
    {
      "id": "clx...",
      "nameEn": "Cappuccino",
      "nameKh": "កាពូឈីណូ",
      "priceUsd": 3.50,
      "priceKhr": 14350,
      "sku": "HC-002",
      "isActive": true,
      "category": { "id": "...", "nameEn": "Hot Coffee" },
      "inventory": { "quantity": 50, "minLevel": 10 }
    }
  ],
  "total": 25
}
```

---

## POST /api/products

Create new product.

**Request:**
```json
{
  "nameEn": "Latte",
  "nameKh": "ឡាតេ",
  "priceUsd": 4.00,
  "priceKhr": 16400,
  "categoryId": "clx...",
  "sku": "HC-003",
  "imageUrl": "/images/latte.jpg"
}
```

**Response (201):**
```json
{ "id": "clx...", "nameEn": "Latte", ... }
```

---

## PUT /api/products

Update product.

**Request:**
```json
{
  "id": "clx...",
  "priceUsd": 4.50,
  "isActive": false
}
```

---

## DELETE /api/products?id=xxx

Delete product.

**Response:**
```json
{ "success": true }
```

---

# Categories API

## GET /api/categories

List all categories.

**Response:**
```json
{
  "categories": [
    {
      "id": "clx...",
      "nameEn": "Hot Coffee",
      "nameKh": "កាហ្វេក្តៅ",
      "slug": "hot-coffee",
      "sortOrder": 1,
      "isActive": true
    }
  ]
}
```

## POST /api/categories

```json
{
  "nameEn": "Tea",
  "nameKh": "តែ",
  "slug": "tea",
  "sortOrder": 3
}
```

## PUT /api/categories

```json
{ "id": "clx...", "sortOrder": 5 }
```

## DELETE /api/categories?id=xxx

---

# Inventory API

## GET /api/inventory

List all inventory.

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `lowStock` | boolean | Only items below minLevel |

**Response:**
```json
{
  "inventory": [
    {
      "id": "clx...",
      "productId": "clx...",
      "quantity": 5,
      "minLevel": 10,
      "product": { "nameEn": "Cappuccino", "sku": "HC-002" }
    }
  ]
}
```

## PUT /api/inventory

Update stock.

**Request:**
```json
{
  "productId": "clx...",
  "quantity": 100
}
// OR
{
  "productId": "clx...",
  "adjustment": -5
}
```

---

# React Query Hooks

```tsx
import {
  useProducts,
  useCreateProduct,
  useCategories,
  useInventory
} from '@/lib/api-hooks'

// List products
const { data } = useProducts(categoryId)

// Create product
const create = useCreateProduct()
await create.mutateAsync({ nameEn: "Latte", ... })

// List categories
const { data: cats } = useCategories()

// Low stock items
const { data: lowStock } = useInventory()
```
