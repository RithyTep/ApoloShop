# Database Schema

> PostgreSQL with Prisma ORM | Schema: `apolo` | Hosted on **Neon** (Serverless)

| Meta | Value |
|------|-------|
| **Format** | Markdown |
| **Updated** | 2025-01-12 |
| **Author** | ApoloDev Team |
| **Hosting** | Neon (neon.tech) |
| **Deployment** | Vercel |

## Tables Overview

| Table | Description |
|-------|-------------|
| `roles` | Permission roles |
| `users` | Admin users |
| `sessions` | Login sessions |
| `categories` | Product categories |
| `products` | Product catalog |
| `inventory` | Stock tracking |
| `customers` | Customer profiles |
| `orders` | Customer orders |
| `order_items` | Order line items |
| `payments` | Payment records |
| `promotions` | Discount codes |
| `cms_content` | CMS pages/blogs |
| `settings` | Shop settings |

## Entity Relationships

```
Role ──< User ──< Session

Category ──< Product ──< Inventory
                │
Customer ──< Order ──< OrderItem ──> Product
               │
               └──< Payment
               │
Promotion ──────┘

CMSContent    Setting
```

---

## Authentication Tables

### roles

| Column | Type | Description |
|--------|------|-------------|
| `id` | CUID | Primary key |
| `name` | String | Unique (admin, staff, cashier) |
| `permissions` | JSON | Permission object |
| `created_at` | DateTime | Created timestamp |
| `updated_at` | DateTime | Updated timestamp |

**Permissions JSON:**
```json
{
  "products": ["read", "write", "delete"],
  "orders": ["read", "write"],
  "settings": ["read"]
}
```

### users

| Column | Type | Description |
|--------|------|-------------|
| `id` | CUID | Primary key |
| `email` | String | Unique email |
| `password_hash` | String | Bcrypt hash |
| `name` | String | Display name |
| `role_id` | String | FK → roles |
| `is_active` | Boolean | Default: true |

### sessions

| Column | Type | Description |
|--------|------|-------------|
| `id` | CUID | Primary key |
| `user_id` | String | FK → users |
| `token` | String | JWT token |
| `expires_at` | DateTime | Expiration |

---

## Product Tables

### categories

| Column | Type | Description |
|--------|------|-------------|
| `id` | CUID | Primary key |
| `name_en` | String | English name |
| `name_kh` | String | Khmer name |
| `slug` | String | Unique URL slug |
| `sort_order` | Int | Display order |
| `is_active` | Boolean | Default: true |

### products

| Column | Type | Description |
|--------|------|-------------|
| `id` | CUID | Primary key |
| `name_en` | String | English name |
| `name_kh` | String | Khmer name |
| `description_en` | Text | English desc |
| `description_kh` | Text | Khmer desc |
| `price_usd` | Decimal(10,2) | USD price |
| `price_khr` | Int | KHR price |
| `category_id` | String | FK → categories |
| `sku` | String | Unique SKU |
| `image_url` | String | Main image |
| `images` | JSON | Extra images |
| `is_active` | Boolean | Default: true |

### inventory

| Column | Type | Description |
|--------|------|-------------|
| `id` | CUID | Primary key |
| `product_id` | String | Unique FK → products |
| `quantity` | Int | Stock count |
| `min_level` | Int | Low stock threshold |
| `last_updated` | DateTime | Last update |

---

## Order Tables

### customers

| Column | Type | Description |
|--------|------|-------------|
| `id` | CUID | Primary key |
| `name` | String | Customer name |
| `phone` | String | Unique phone |
| `email` | String | Optional email |
| `notes` | Text | Internal notes |
| `tags` | JSON | ["VIP", "Frequent"] |

### orders

| Column | Type | Description |
|--------|------|-------------|
| `id` | CUID | Primary key |
| `order_number` | String | Unique (ORD-YYYYMMDD-XXX) |
| `customer_id` | String | FK → customers |
| `status` | Enum | Order status |
| `total_usd` | Decimal | Total USD |
| `total_khr` | Int | Total KHR |
| `currency` | Enum | USD \| KHR |
| `channel` | Enum | Order channel |
| `note` | Text | Customer note |
| `promotion_id` | String | FK → promotions |

**Status Enum:** `NEW`, `CONFIRMED`, `PREPARING`, `READY`, `COMPLETED`, `CANCELLED`

**Channel Enum:** `WEBSITE`, `TELEGRAM`, `MESSENGER`, `PHONE`, `WALK_IN`

### order_items

| Column | Type | Description |
|--------|------|-------------|
| `id` | CUID | Primary key |
| `order_id` | String | FK → orders |
| `product_id` | String | FK → products |
| `quantity` | Int | Item count |
| `price_usd` | Decimal | Unit price USD |
| `price_khr` | Int | Unit price KHR |

### payments

| Column | Type | Description |
|--------|------|-------------|
| `id` | CUID | Primary key |
| `order_id` | String | FK → orders |
| `method` | Enum | Payment method |
| `amount` | Decimal | Amount |
| `currency` | Enum | USD \| KHR |
| `status` | Enum | Payment status |
| `transaction_id` | String | External ID |

**Method Enum:** `CASH`, `ABA_KHQR`, `WING`, `PAYWAY`, `BANK_TRANSFER`

**Status Enum:** `PENDING`, `COMPLETED`, `FAILED`, `REFUNDED`

---

## Other Tables

### promotions

| Column | Type | Description |
|--------|------|-------------|
| `id` | CUID | Primary key |
| `code` | String | Unique promo code |
| `type` | Enum | PERCENTAGE \| FIXED_AMOUNT |
| `value` | Decimal | Discount value |
| `min_order` | Decimal | Min order amount |
| `max_uses` | Int | Max usage count |
| `used_count` | Int | Current usage |
| `start_date` | DateTime | Start date |
| `end_date` | DateTime | End date |
| `is_active` | Boolean | Active status |

### cms_content

| Column | Type | Description |
|--------|------|-------------|
| `id` | CUID | Primary key |
| `slug` | String | Unique URL slug |
| `title_en` | String | English title |
| `title_kh` | String | Khmer title |
| `content_en` | Text | English content |
| `content_kh` | Text | Khmer content |
| `type` | Enum | PAGE \| BLOG \| BANNER \| FAQ |
| `status` | Enum | DRAFT \| PUBLISHED \| ARCHIVED |

### settings

| Column | Type | Description |
|--------|------|-------------|
| `key` | String | Primary key |
| `value` | JSON | Setting value |

**Default Keys:**
- `shop_name` - Shop name (EN/KH)
- `exchange_rate` - USD to KHR rate
- `contact_info` - Phone, email, address
- `business_hours` - Opening hours
- `tax_rate` - Tax percentage
- `payment_methods` - Enabled methods
