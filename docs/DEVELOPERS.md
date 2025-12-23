# ApoloShop Developer Documentation

> **AI Context Memory**: This document serves as the complete reference for the ApoloShop e-commerce CMS project. It contains all project features, conventions, and guidelines for developers and AI assistants.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Getting Started](#getting-started)
3. [Project Architecture](#project-architecture)
4. [Database Schema (Complete)](#database-schema-complete)
5. [API Reference](#api-reference)
6. [Authentication System](#authentication-system)
7. [Internationalization (i18n)](#internationalization-i18n)
8. [Payment Integration](#payment-integration)
9. [Code Conventions](#code-conventions)
10. [Component Guidelines](#component-guidelines)
11. [Development Workflow](#development-workflow)
12. [Troubleshooting](#troubleshooting)

---

## Project Overview

### What is ApoloShop?

ApoloShop is a **Next.js 16 e-commerce CMS** designed specifically for **small Cambodian businesses** (coffee shops, bakeries, restaurants). It provides:

- **Multi-language support**: English (EN) and Khmer (KH)
- **Multi-currency**: USD and KHR (Cambodian Riel)
- **Local payment methods**: KHQR (ABA, Wing, Bakong)
- **Social checkout**: Telegram and Facebook Messenger integration
- **Shop Customizer**: Visual page builder with drag & drop sections

### Key Features

| Feature | Description |
|---------|-------------|
| Product Management | CRUD products with dual pricing (USD/KHR), categories, SKU |
| Order Management | Track orders through status workflow (NEW → COMPLETED) |
| Customer Management | Customer profiles, order history, tags |
| Inventory Tracking | Stock levels, low-stock alerts, auto-deduction |
| Payment Processing | Cash, KHQR (ABA, Wing), bank transfer |
| Admin Dashboard | 12 management pages with role-based access |
| Reports & Export | Sales reports, Excel/PDF export |
| CMS Content | Pages, blogs, banners, FAQs |
| Promotions | Discount codes, percentage/fixed discounts |

### Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Next.js (App Router) | 16.0.10 |
| Runtime | Bun | Latest |
| Language | TypeScript | 5.x |
| UI Components | Shadcn/ui + Radix UI | Latest |
| Styling | Tailwind CSS | 4.1.9 |
| Database | PostgreSQL | 15+ |
| ORM | Prisma | 5.22.0 |
| State Management | React Query + Context | 5.x |
| Authentication | JWT + HTTP-only cookies | - |
| Icons | Lucide React | 0.454.0 |

---

## Getting Started

### Prerequisites

- **Node.js 18+** or **Bun runtime** (recommended)
- **PostgreSQL database** (Railway.com recommended for hosting)
- **Git** for version control

### Installation Steps

```bash
# 1. Clone repository
git clone https://github.com/RithyTep/ApoloShop.git
cd ApoloShop

# 2. Install dependencies
bun install

# 3. Set up environment
cp .env.example .env
# Edit .env with your database credentials

# 4. Generate Prisma client
bun run db:generate

# 5. Push schema to database
bun run db:push

# 6. Seed initial data
bun run db:seed

# 7. Start development
bun dev
```

### Environment Variables

```env
# Required
DATABASE_URL="postgresql://user:pass@host:port/database"
JWT_SECRET="min-32-character-secret-key-here"

# Optional
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_EXCHANGE_RATE="4100"
ABA_MERCHANT_ID=""
WING_API_KEY=""
```

### NPM Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `bun dev` | Start development server |
| `build` | `bun build` | Production build |
| `start` | `bun start` | Start production server |
| `db:generate` | `bunx prisma generate` | Generate Prisma client |
| `db:push` | `bunx prisma db push` | Push schema to database |
| `db:seed` | `bun prisma/seed.ts` | Seed initial data |
| `db:studio` | `bunx prisma studio` | Open Prisma Studio GUI |

---

## Project Architecture

### Directory Structure

```
ApoloShop/
├── app/                        # Next.js App Router
│   ├── admin/                  # Admin dashboard
│   │   ├── login/page.tsx      # Login page
│   │   └── page.tsx            # Dashboard (protected)
│   ├── api/                    # API routes
│   │   ├── auth/               # Authentication
│   │   │   ├── login/route.ts
│   │   │   ├── logout/route.ts
│   │   │   └── session/route.ts
│   │   ├── products/route.ts
│   │   ├── categories/route.ts
│   │   ├── orders/route.ts
│   │   ├── customers/route.ts
│   │   ├── inventory/route.ts
│   │   ├── payments/
│   │   │   ├── route.ts
│   │   │   └── khqr/route.ts
│   │   ├── settings/route.ts
│   │   └── export/route.ts
│   ├── globals.css             # Global styles
│   ├── layout.tsx              # Root layout (providers)
│   └── page.tsx                # Landing page
│
├── components/                 # React components
│   ├── ui/                     # Shadcn UI primitives
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── table.tsx
│   │   ├── dialog.tsx
│   │   ├── toast.tsx
│   │   └── ...
│   ├── pages/                  # Admin page components
│   │   ├── dashboard-page.tsx
│   │   ├── orders-page.tsx
│   │   ├── products-page.tsx
│   │   ├── categories-page.tsx
│   │   ├── customers-page.tsx
│   │   ├── inventory-page.tsx
│   │   ├── payments-page.tsx
│   │   ├── promotions-page.tsx
│   │   ├── content-page.tsx
│   │   ├── users-page.tsx
│   │   ├── reports-page.tsx
│   │   └── settings-page.tsx
│   ├── admin-dashboard.tsx     # Main dashboard container
│   ├── sidebar.tsx             # Navigation sidebar
│   └── ...                     # Other components
│
├── lib/                        # Utilities and helpers
│   ├── i18n/                   # Translations
│   │   ├── en.json             # English
│   │   └── kh.json             # Khmer
│   ├── api-hooks.ts            # React Query hooks
│   ├── auth-middleware.ts      # Auth utilities
│   ├── export.ts               # Excel/PDF export
│   ├── jwt.ts                  # JWT sign/verify
│   ├── khqr.ts                 # KHQR generation
│   ├── prisma.ts               # Prisma singleton
│   └── utils.ts                # General utilities
│
├── providers/                  # React Context providers
│   ├── cart-provider.tsx       # Shopping cart state
│   ├── i18n-provider.tsx       # Language/currency
│   └── query-provider.tsx      # React Query client
│
├── prisma/                     # Database
│   ├── schema.prisma           # Schema definition
│   └── seed.ts                 # Seed script
│
├── docs/                       # Documentation
│   └── DEVELOPERS.md           # This file
│
├── public/                     # Static assets
├── .env.example                # Environment template
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## Database Schema (Complete)

### Schema Overview

The database uses PostgreSQL with Prisma ORM. All tables are in the `apolo` schema to avoid conflicts.

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐         ┌──────────┐         ┌──────────┐        │
│  │   Role   │────────<│   User   │────────<│ Session  │        │
│  └──────────┘         └──────────┘         └──────────┘        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    PRODUCT CATALOG                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐         ┌──────────┐         ┌──────────┐        │
│  │ Category │────────<│ Product  │────────<│Inventory │        │
│  └──────────┘         └──────────┘         └──────────┘        │
│                             │                                    │
└─────────────────────────────│────────────────────────────────────┘
                              │
┌─────────────────────────────│────────────────────────────────────┐
│                    ORDER MANAGEMENT                              │
├─────────────────────────────│────────────────────────────────────┤
│                             │                                    │
│  ┌──────────┐         ┌─────▼────┐         ┌──────────┐        │
│  │ Customer │────────<│  Order   │────────<│OrderItem │        │
│  └──────────┘         └──────────┘         └──────────┘        │
│                             │                                    │
│                       ┌─────▼────┐                              │
│                       │ Payment  │                              │
│                       └──────────┘                              │
│                             │                                    │
│  ┌──────────┐               │                                    │
│  │Promotion │───────────────┘                                    │
│  └──────────┘                                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    CONTENT & SETTINGS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐         ┌──────────┐                              │
│  │CMSContent│         │ Setting  │                              │
│  └──────────┘         └──────────┘                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Table Definitions

#### 1. Role (roles)

Defines permission roles for admin users.

| Column | Type | Description |
|--------|------|-------------|
| `id` | String (CUID) | Primary key |
| `name` | String | Unique role name (admin, staff, cashier) |
| `permissions` | JSON | Permission object |
| `created_at` | DateTime | Creation timestamp |
| `updated_at` | DateTime | Last update timestamp |

**Permissions Structure:**
```json
{
  "products": ["read", "write", "delete"],
  "categories": ["read", "write", "delete"],
  "orders": ["read", "write", "delete"],
  "customers": ["read", "write", "delete"],
  "inventory": ["read", "write"],
  "settings": ["read", "write"],
  "users": ["read", "write", "delete"],
  "cms": ["read", "write", "delete"],
  "promotions": ["read", "write", "delete"],
  "reports": ["read"]
}
```

**Default Roles:**
- `admin` - Full access to all features
- `staff` - Can manage orders, customers, inventory
- `cashier` - Can view products, manage orders

---

#### 2. User (users)

Admin users who can access the dashboard.

| Column | Type | Description |
|--------|------|-------------|
| `id` | String (CUID) | Primary key |
| `email` | String | Unique email address |
| `password_hash` | String | Bcrypt hashed password |
| `name` | String | Display name |
| `role_id` | String | FK to Role |
| `is_active` | Boolean | Account status (default: true) |
| `created_at` | DateTime | Creation timestamp |
| `updated_at` | DateTime | Last update timestamp |

**Relations:**
- `role` → Role (many-to-one)
- `sessions` → Session[] (one-to-many)

---

#### 3. Session (sessions)

Active login sessions for users.

| Column | Type | Description |
|--------|------|-------------|
| `id` | String (CUID) | Primary key |
| `user_id` | String | FK to User |
| `token` | String | Unique JWT token |
| `expires_at` | DateTime | Session expiration |
| `created_at` | DateTime | Creation timestamp |

**Relations:**
- `user` → User (many-to-one, cascade delete)

---

#### 4. Category (categories)

Product categories with bilingual names.

| Column | Type | Description |
|--------|------|-------------|
| `id` | String (CUID) | Primary key |
| `name_en` | String | English name |
| `name_kh` | String | Khmer name |
| `slug` | String | Unique URL slug |
| `sort_order` | Int | Display order (default: 0) |
| `is_active` | Boolean | Active status (default: true) |
| `created_at` | DateTime | Creation timestamp |
| `updated_at` | DateTime | Last update timestamp |

**Relations:**
- `products` → Product[] (one-to-many)

**Example:**
```json
{
  "id": "clx...",
  "name_en": "Hot Coffee",
  "name_kh": "កាហ្វេក្តៅ",
  "slug": "hot-coffee",
  "sort_order": 1,
  "is_active": true
}
```

---

#### 5. Product (products)

Products with dual pricing for USD and KHR.

| Column | Type | Description |
|--------|------|-------------|
| `id` | String (CUID) | Primary key |
| `name_en` | String | English name |
| `name_kh` | String | Khmer name |
| `description_en` | Text | English description (optional) |
| `description_kh` | Text | Khmer description (optional) |
| `price_usd` | Decimal(10,2) | Price in USD |
| `price_khr` | Int | Price in KHR |
| `category_id` | String | FK to Category |
| `sku` | String | Unique SKU code |
| `image_url` | String | Main image URL (optional) |
| `images` | JSON | Additional images array (optional) |
| `is_active` | Boolean | Active status (default: true) |
| `created_at` | DateTime | Creation timestamp |
| `updated_at` | DateTime | Last update timestamp |

**Relations:**
- `category` → Category (many-to-one)
- `inventory` → Inventory (one-to-one)
- `orderItems` → OrderItem[] (one-to-many)

**Example:**
```json
{
  "id": "clx...",
  "name_en": "Cappuccino",
  "name_kh": "កាពូឈីណូ",
  "description_en": "Espresso with steamed milk",
  "price_usd": 3.50,
  "price_khr": 14350,
  "category_id": "clx...",
  "sku": "HC-002",
  "image_url": "/images/cappuccino.jpg",
  "is_active": true
}
```

---

#### 6. Inventory (inventory)

Stock tracking for products.

| Column | Type | Description |
|--------|------|-------------|
| `id` | String (CUID) | Primary key |
| `product_id` | String | Unique FK to Product |
| `quantity` | Int | Current stock (default: 0) |
| `min_level` | Int | Low stock threshold (default: 10) |
| `last_updated` | DateTime | Last stock update |

**Relations:**
- `product` → Product (one-to-one, cascade delete)

**Low Stock Alert:** When `quantity <= min_level`

---

#### 7. Customer (customers)

Customer profiles for order tracking.

| Column | Type | Description |
|--------|------|-------------|
| `id` | String (CUID) | Primary key |
| `name` | String | Customer name |
| `phone` | String | Unique phone number |
| `email` | String | Email address (optional) |
| `notes` | Text | Internal notes (optional) |
| `tags` | JSON | Tags array (e.g., ["VIP", "Frequent"]) |
| `created_at` | DateTime | Creation timestamp |
| `updated_at` | DateTime | Last update timestamp |

**Relations:**
- `orders` → Order[] (one-to-many)

---

#### 8. Order (orders)

Customer orders with status tracking.

| Column | Type | Description |
|--------|------|-------------|
| `id` | String (CUID) | Primary key |
| `order_number` | String | Unique order number (e.g., ORD-20241223-001) |
| `customer_id` | String | FK to Customer |
| `status` | Enum | Order status |
| `total_usd` | Decimal(10,2) | Total in USD |
| `total_khr` | Int | Total in KHR |
| `currency` | Enum | USD or KHR |
| `channel` | Enum | Order channel |
| `note` | Text | Customer note (optional) |
| `promotion_id` | String | FK to Promotion (optional) |
| `discount_usd` | Decimal(10,2) | Discount in USD (optional) |
| `discount_khr` | Int | Discount in KHR (optional) |
| `created_at` | DateTime | Order timestamp |
| `updated_at` | DateTime | Last update timestamp |

**Order Status Enum:**
- `NEW` - Just placed
- `CONFIRMED` - Payment confirmed
- `PREPARING` - Being prepared
- `READY` - Ready for pickup/delivery
- `COMPLETED` - Delivered/picked up
- `CANCELLED` - Cancelled

**Order Channel Enum:**
- `WEBSITE` - Web order
- `TELEGRAM` - Telegram bot
- `MESSENGER` - Facebook Messenger
- `PHONE` - Phone order
- `WALK_IN` - Walk-in customer

**Relations:**
- `customer` → Customer (many-to-one)
- `promotion` → Promotion (many-to-one, optional)
- `items` → OrderItem[] (one-to-many)
- `payments` → Payment[] (one-to-many)

---

#### 9. OrderItem (order_items)

Individual items within an order.

| Column | Type | Description |
|--------|------|-------------|
| `id` | String (CUID) | Primary key |
| `order_id` | String | FK to Order |
| `product_id` | String | FK to Product |
| `quantity` | Int | Item quantity |
| `price_usd` | Decimal(10,2) | Unit price in USD |
| `price_khr` | Int | Unit price in KHR |

**Relations:**
- `order` → Order (many-to-one, cascade delete)
- `product` → Product (many-to-one)

---

#### 10. Payment (payments)

Payment records for orders.

| Column | Type | Description |
|--------|------|-------------|
| `id` | String (CUID) | Primary key |
| `order_id` | String | FK to Order |
| `method` | Enum | Payment method |
| `amount` | Decimal(10,2) | Payment amount |
| `currency` | Enum | USD or KHR |
| `status` | Enum | Payment status |
| `transaction_id` | String | External transaction ID (optional) |
| `metadata` | JSON | Additional data (optional) |
| `created_at` | DateTime | Payment timestamp |
| `updated_at` | DateTime | Last update timestamp |

**Payment Method Enum:**
- `CASH` - Cash payment
- `ABA_KHQR` - ABA Bank KHQR
- `WING` - Wing mobile payment
- `PAYWAY` - PayWay gateway
- `BANK_TRANSFER` - Manual bank transfer

**Payment Status Enum:**
- `PENDING` - Awaiting payment
- `COMPLETED` - Payment received
- `FAILED` - Payment failed
- `REFUNDED` - Payment refunded

---

#### 11. Promotion (promotions)

Discount codes and promotions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | String (CUID) | Primary key |
| `code` | String | Unique promo code |
| `type` | Enum | PERCENTAGE or FIXED_AMOUNT |
| `value` | Decimal(10,2) | Discount value |
| `min_order` | Decimal(10,2) | Minimum order amount (optional) |
| `max_uses` | Int | Maximum total uses (optional) |
| `used_count` | Int | Current use count (default: 0) |
| `start_date` | DateTime | Promotion start |
| `end_date` | DateTime | Promotion end |
| `is_active` | Boolean | Active status (default: true) |
| `created_at` | DateTime | Creation timestamp |
| `updated_at` | DateTime | Last update timestamp |

**Example:**
```json
{
  "code": "WELCOME10",
  "type": "PERCENTAGE",
  "value": 10.00,
  "min_order": 5.00,
  "max_uses": 100,
  "used_count": 23,
  "is_active": true
}
```

---

#### 12. CMSContent (cms_content)

Content management for pages, blogs, etc.

| Column | Type | Description |
|--------|------|-------------|
| `id` | String (CUID) | Primary key |
| `slug` | String | Unique URL slug |
| `title_en` | String | English title |
| `title_kh` | String | Khmer title |
| `content_en` | Text | English content |
| `content_kh` | Text | Khmer content |
| `type` | Enum | Content type |
| `status` | Enum | Content status |
| `metadata` | JSON | Additional data (optional) |
| `created_at` | DateTime | Creation timestamp |
| `updated_at` | DateTime | Last update timestamp |

**Content Type Enum:**
- `PAGE` - Static page
- `BLOG` - Blog post
- `BANNER` - Promotional banner
- `FAQ` - FAQ entry

**Content Status Enum:**
- `DRAFT` - Not published
- `PUBLISHED` - Live
- `ARCHIVED` - Hidden

---

#### 13. Setting (settings)

Key-value store for shop settings.

| Column | Type | Description |
|--------|------|-------------|
| `key` | String | Primary key (setting name) |
| `value` | JSON | Setting value |
| `updated_at` | DateTime | Last update timestamp |

**Default Settings:**
```json
{
  "shop_name": { "en": "ApoloShop", "kh": "អាប៉ូឡូហាង" },
  "exchange_rate": { "usd_to_khr": 4100 },
  "contact_info": {
    "phone": "+855 12 345 678",
    "email": "contact@apolodev.com",
    "telegram": "@apolodev"
  },
  "business_hours": {
    "monday": { "open": "07:00", "close": "21:00" }
  },
  "tax_rate": { "percentage": 10 },
  "payment_methods": {
    "cash": true,
    "aba_khqr": true,
    "wing": true
  }
}
```

---

## API Reference

### Base URL

```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

### Response Format

All API responses follow this structure:

```typescript
// Success
{ data: T, message?: string }

// Error
{ error: string, details?: object }
```

### Authentication Endpoints

#### POST /api/auth/login

```typescript
// Request
{
  "email": "admin@apolodev.com",
  "password": "admin123"
}

// Response (200)
{
  "user": {
    "id": "clx...",
    "email": "admin@apolodev.com",
    "name": "Admin User",
    "role": "admin",
    "permissions": { ... }
  }
}
// Cookie: auth-token (HTTP-only)

// Error (401)
{ "error": "Invalid credentials" }
```

#### POST /api/auth/logout

```typescript
// Response (200)
{ "success": true }
// Cookie: auth-token (deleted)
```

#### GET /api/auth/session

```typescript
// Response (authenticated)
{
  "authenticated": true,
  "user": {
    "id": "clx...",
    "email": "admin@apolodev.com",
    "name": "Admin User",
    "role": "admin"
  }
}

// Response (not authenticated)
{ "authenticated": false, "user": null }
```

### Products API

#### GET /api/products

```typescript
// Query params
?categoryId=xxx     // Filter by category
?active=true        // Filter active only
?page=1             // Page number
?limit=20           // Items per page

// Response
{
  "products": [
    {
      "id": "clx...",
      "nameEn": "Cappuccino",
      "nameKh": "កាពូឈីណូ",
      "priceUsd": 3.50,
      "priceKhr": 14350,
      "sku": "HC-002",
      "category": { "id": "...", "nameEn": "Hot Coffee" },
      "inventory": { "quantity": 50, "minLevel": 10 }
    }
  ],
  "total": 25
}
```

#### POST /api/products

```typescript
// Request
{
  "nameEn": "Latte",
  "nameKh": "ឡាតេ",
  "priceUsd": 4.00,
  "priceKhr": 16400,
  "categoryId": "clx...",
  "sku": "HC-003"
}

// Response (201)
{ "id": "clx...", ... }
```

#### PUT /api/products

```typescript
// Request
{
  "id": "clx...",
  "priceUsd": 4.50,
  "isActive": false
}
```

#### DELETE /api/products?id=xxx

```typescript
// Response
{ "success": true }
```

### Orders API

#### GET /api/orders

```typescript
// Query params
?status=NEW
?dateFrom=2024-01-01
?dateTo=2024-12-31
?page=1&limit=20

// Response
{
  "orders": [
    {
      "id": "clx...",
      "orderNumber": "ORD-20241223-001",
      "status": "NEW",
      "totalUsd": 15.50,
      "customer": { "name": "John", "phone": "+855..." },
      "items": [...]
    }
  ],
  "total": 150
}
```

#### POST /api/orders

```typescript
// Request
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

// Response (201)
{
  "id": "clx...",
  "orderNumber": "ORD-20241223-001",
  "status": "NEW",
  "totalUsd": 15.50
}
```

#### PUT /api/orders

```typescript
// Update status
{ "id": "clx...", "status": "CONFIRMED" }
```

### Payments API

#### POST /api/payments/khqr

```typescript
// Request
{
  "orderId": "clx...",
  "method": "ABA_KHQR"
}

// Response
{
  "qrImage": "data:image/png;base64,...",
  "paymentId": "clx...",
  "amount": 15.50,
  "currency": "USD",
  "orderNumber": "ORD-20241223-001",
  "expiresIn": 900
}
```

### Export API

#### GET /api/export

```typescript
// Query params
?type=orders|products|customers|inventory|sales
?format=json|csv
?dateFrom=2024-01-01
?dateTo=2024-12-31

// Response (JSON)
{
  "data": [...],
  "filename": "orders-2024-12-23",
  "exportedAt": "2024-12-23T10:00:00Z",
  "count": 150
}

// Response (CSV)
// Content-Type: text/csv
// Content-Disposition: attachment; filename="orders-2024-12-23.csv"
```

---

## Authentication System

### Flow Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────>│  /api/auth  │────>│  Database   │
│  (Browser)  │     │   /login    │     │  (Session)  │
└─────────────┘     └─────────────┘     └─────────────┘
      │                    │
      │  Set Cookie        │  Create Session
      │<───────────────────│
      │
      │  Subsequent Requests (with cookie)
      │──────────────────────────────────>
```

### JWT Token Structure

```typescript
// Header
{ "alg": "HS256", "typ": "JWT" }

// Payload
{
  "userId": "clx...",
  "roleId": "clx...",
  "email": "admin@apolodev.com",
  "iat": 1703318400,
  "exp": 1703923200  // 7 days
}
```

### Protected Routes

```typescript
// In admin page component
import { useSession } from '@/lib/api-hooks'

function AdminPage() {
  const { data: session, isLoading } = useSession()

  useEffect(() => {
    if (!isLoading && !session?.authenticated) {
      router.push('/admin/login')
    }
  }, [session, isLoading])

  if (!session?.authenticated) return null

  return <Dashboard />
}
```

---

## Internationalization (i18n)

### Usage in Components

```tsx
import { useI18n } from '@/providers/i18n-provider'

function ProductCard({ product }) {
  const { language, currency, t, formatPrice } = useI18n()

  return (
    <div>
      <h3>{language === 'en' ? product.nameEn : product.nameKh}</h3>
      <p>{formatPrice(product.priceUsd, product.priceKhr)}</p>
      <button>{t('common.addToCart')}</button>
    </div>
  )
}
```

### Translation Keys

Located in `lib/i18n/en.json` and `lib/i18n/kh.json`:

```json
{
  "common": {
    "welcome": "Welcome",
    "addToCart": "Add to Cart",
    "checkout": "Checkout"
  },
  "orders": {
    "status": {
      "new": "New",
      "confirmed": "Confirmed",
      "preparing": "Preparing",
      "ready": "Ready",
      "completed": "Completed"
    }
  }
}
```

### Currency Formatting

```typescript
const { formatPrice } = useI18n()

// When currency is USD
formatPrice(10.50)  // "$10.50"

// When currency is KHR
formatPrice(10.50, 43050)  // "43,050 ៛"
```

---

## Payment Integration

### KHQR Standard

ApoloShop implements Cambodia's KHQR (Bakong QR) standard for payments.

### Generating QR Code

```typescript
import { generateKHQRImage } from '@/lib/khqr'

const qrImage = await generateKHQRImage({
  merchantName: 'ApoloShop',
  merchantId: 'merchant@aba',
  amount: 10.00,
  currency: 'USD',
  orderId: 'ORD-001',
  description: 'Order payment'
})

// Returns base64 data URL
// <img src={qrImage} />
```

### Supported Banks

| Bank | Method Code | Merchant ID Format |
|------|-------------|-------------------|
| ABA Bank | `ABA_KHQR` | `account@aba` |
| Wing | `WING` | `wing@wingid` |
| Bakong | `BAKONG` | `account@bakong` |

---

## Code Conventions

### File Naming

| Type | Convention | Example |
|------|------------|---------|
| Components | `kebab-case.tsx` | `product-card.tsx` |
| Pages | `*-page.tsx` | `orders-page.tsx` |
| API Routes | `route.ts` | `app/api/products/route.ts` |
| Utilities | `kebab-case.ts` | `api-hooks.ts` |
| Types | PascalCase | `interface Product {}` |

### Component Structure

```tsx
"use client"  // If client component

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useProducts } from "@/lib/api-hooks"

interface ProductListProps {
  categoryId?: string
}

export function ProductList({ categoryId }: ProductListProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const { data, isLoading } = useProducts(categoryId)

  if (isLoading) return <div>Loading...</div>

  return (
    <div className="grid gap-4">
      {data?.products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
```

### API Route Structure

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - List/Read
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (id) {
      const item = await prisma.product.findUnique({ where: { id } })
      return NextResponse.json(item)
    }

    const items = await prisma.product.findMany()
    return NextResponse.json({ products: items, total: items.length })
  } catch (error) {
    console.error("GET /api/products error:", error)
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 })
  }
}

// POST - Create
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const item = await prisma.product.create({ data: body })
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to create" }, { status: 500 })
  }
}

// PUT - Update
export async function PUT(request: NextRequest) { ... }

// DELETE - Delete
export async function DELETE(request: NextRequest) { ... }
```

### React Query Hooks

```typescript
// lib/api-hooks.ts

export function useProducts(categoryId?: string) {
  return useQuery({
    queryKey: ["products", categoryId],
    queryFn: () => fetchAPI<{ products: Product[] }>(
      `/api/products${categoryId ? `?categoryId=${categoryId}` : ""}`
    ),
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Product>) =>
      fetchAPI<Product>("/api/products", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
    },
  })
}
```

### Tailwind CSS Classes

```tsx
// Use Tailwind utilities
<div className="flex items-center gap-4 p-6 bg-white rounded-lg shadow">
  <span className="text-lg font-semibold text-gray-900">Title</span>
</div>

// Use cn() for conditional classes
import { cn } from "@/lib/utils"

<button className={cn(
  "px-4 py-2 rounded",
  isActive ? "bg-pink-600 text-white" : "bg-gray-100"
)}>
  Click
</button>
```

---

## Component Guidelines

### Adding a New UI Component

1. Create file in `components/ui/`
2. Use Radix UI primitives if needed
3. Apply Tailwind styles
4. Export from the file

```tsx
// components/ui/badge.tsx
import { cn } from "@/lib/utils"

interface BadgeProps {
  variant?: "default" | "success" | "warning" | "error"
  children: React.ReactNode
}

export function Badge({ variant = "default", children }: BadgeProps) {
  return (
    <span className={cn(
      "px-2 py-1 text-xs font-medium rounded",
      variant === "default" && "bg-gray-100 text-gray-800",
      variant === "success" && "bg-green-100 text-green-800",
      variant === "warning" && "bg-yellow-100 text-yellow-800",
      variant === "error" && "bg-red-100 text-red-800"
    )}>
      {children}
    </span>
  )
}
```

### Adding a New Admin Page

1. Create component in `components/pages/`
2. Add to sidebar navigation
3. Add to dashboard switch

```tsx
// 1. components/pages/new-page.tsx
export function NewPage() {
  return <div>New Page Content</div>
}

// 2. components/sidebar.tsx - Add to navItems
const navItems = [
  ...existing,
  { id: "new", label: "New Feature", icon: Star },
]

// 3. components/admin-dashboard.tsx - Add case
case "new":
  return <NewPage />
```

---

## Development Workflow

### Git Branching Strategy

```
main                    # Production (protected)
└── Develop             # Development integration
    ├── Feature/xxx     # New features
    ├── Bugfix/xxx      # Bug fixes
    └── Hotfix/xxx      # Urgent fixes
```

### Commit Message Format

```
[feature-name] Short description

Examples:
[auth] Add password reset functionality
[orders] Fix status update bug
[ui] Add dark mode support
[docs] Update API documentation
```

### Pull Request Process

1. Create feature branch from `Develop`
2. Make changes and commit
3. Push branch to origin
4. Create PR to `Develop`
5. Request review
6. Merge after approval

### Testing Checklist

- [ ] Build passes (`bun build`)
- [ ] No TypeScript errors
- [ ] API endpoints work correctly
- [ ] UI renders properly
- [ ] Mobile responsive
- [ ] Translations complete (EN/KH)

---

## Troubleshooting

### Common Issues

#### Database Connection Error

```
Error: Can't reach database server
```

**Solution:** Check `DATABASE_URL` in `.env` and ensure PostgreSQL is running.

#### Prisma Schema Error

```
Error: Schema validation error
```

**Solution:** Run `bun run db:generate` after schema changes.

#### JWT Token Invalid

```
Error: Invalid token
```

**Solution:** Check `JWT_SECRET` matches between login and session verification.

#### Build Error - Module Not Found

```
Module not found: Can't resolve '@/components/...'
```

**Solution:** Check import path and ensure file exists. Use `@/` for absolute imports.

---

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@apolodev.com | admin123 |

---

## Quick Reference

### Useful Commands

```bash
bun dev                 # Start dev server
bun build               # Build for production
bun run db:studio       # Open Prisma Studio
bun run db:seed         # Reset and seed database
```

### Important Files

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Database schema |
| `lib/api-hooks.ts` | React Query hooks |
| `lib/i18n/*.json` | Translations |
| `providers/*.tsx` | Context providers |
| `.env` | Environment config |

### Admin Dashboard Pages

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/admin` | Overview stats |
| Orders | `/admin` → Orders | Order management |
| Products | `/admin` → Products | Product CRUD |
| Categories | `/admin` → Categories | Category management |
| Customers | `/admin` → Customers | Customer profiles |
| Inventory | `/admin` → Inventory | Stock tracking |
| Payments | `/admin` → Payments | Payment records |
| Promotions | `/admin` → Promotions | Discount codes |
| Content | `/admin` → Content | CMS pages |
| Users | `/admin` → Users | User management |
| Reports | `/admin` → Reports | Sales reports |
| Settings | `/admin` → Settings | Shop settings |

---

*Last Updated: December 23, 2024*
