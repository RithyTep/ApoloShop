# ApoloShop Developer Documentation

This document provides technical documentation for developers working on the ApoloShop e-commerce CMS.

## Table of Contents

- [Getting Started](#getting-started)
- [Project Architecture](#project-architecture)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Authentication](#authentication)
- [Internationalization (i18n)](#internationalization-i18n)
- [Payment Integration](#payment-integration)
- [Development Workflow](#development-workflow)

---

## Getting Started

### Prerequisites

- Node.js 18+ or Bun runtime
- PostgreSQL database (Railway recommended)
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/RithyTep/ApoloShop.git
cd ApoloShop

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Generate Prisma client
bun run db:generate

# Push database schema
bun run db:push

# Seed initial data
bun run db:seed

# Start development server
bun dev
```

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:port/db` |
| `JWT_SECRET` | Secret for JWT tokens (min 32 chars) | `your-super-secret-key-here` |
| `NEXT_PUBLIC_APP_URL` | Application URL | `http://localhost:3000` |
| `NEXT_PUBLIC_EXCHANGE_RATE` | USD to KHR rate | `4100` |
| `ABA_MERCHANT_ID` | ABA Bank merchant ID | `merchant@aba` |
| `WING_API_KEY` | Wing payment API key | `your-wing-key` |

---

## Project Architecture

### Directory Structure

```
ApoloShop/
├── app/                    # Next.js App Router
│   ├── admin/              # Admin dashboard pages
│   │   ├── login/          # Login page
│   │   └── page.tsx        # Main admin dashboard
│   ├── api/                # API routes
│   │   ├── auth/           # Authentication endpoints
│   │   ├── products/       # Product CRUD
│   │   ├── orders/         # Order management
│   │   ├── customers/      # Customer management
│   │   ├── categories/     # Category CRUD
│   │   ├── inventory/      # Inventory tracking
│   │   ├── payments/       # Payment processing
│   │   ├── settings/       # Shop settings
│   │   └── export/         # Data export
│   ├── layout.tsx          # Root layout with providers
│   └── page.tsx            # Landing page
├── components/             # React components
│   ├── ui/                 # Shadcn UI primitives
│   ├── pages/              # Admin page components
│   ├── admin-dashboard.tsx # Main dashboard component
│   └── sidebar.tsx         # Navigation sidebar
├── lib/                    # Utilities and helpers
│   ├── i18n/               # Translation files (en.json, kh.json)
│   ├── api-hooks.ts        # React Query hooks
│   ├── auth-middleware.ts  # Auth utilities
│   ├── export.ts           # Excel/PDF export
│   ├── jwt.ts              # JWT utilities
│   ├── khqr.ts             # KHQR payment generation
│   ├── prisma.ts           # Prisma client singleton
│   └── utils.ts            # General utilities
├── providers/              # React context providers
│   ├── cart-provider.tsx   # Shopping cart state
│   ├── i18n-provider.tsx   # Language/currency state
│   └── query-provider.tsx  # React Query client
├── prisma/                 # Database
│   ├── schema.prisma       # Database schema
│   └── seed.ts             # Seed script
└── docs/                   # Documentation
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Runtime | Bun |
| UI Components | Shadcn/ui + Radix UI |
| Styling | Tailwind CSS 4 |
| Database | PostgreSQL + Prisma ORM |
| State Management | React Query + Context |
| Authentication | JWT + HTTP-only cookies |
| Payments | KHQR (ABA, Wing, Bakong) |

---

## Database Schema

### Entity Relationship

```
┌─────────────┐     ┌─────────────┐
│    Role     │────<│    User     │
└─────────────┘     └─────────────┘
                          │
                          │
                    ┌─────────────┐
                    │   Session   │
                    └─────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Category   │────<│   Product   │────<│  Inventory  │
└─────────────┘     └─────────────┘     └─────────────┘
                          │
                          │
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Customer   │────<│    Order    │────<│  OrderItem  │
└─────────────┘     └─────────────┘     └─────────────┘
                          │
                    ┌─────────────┐
                    │   Payment   │
                    └─────────────┘
```

### Models

#### User & Authentication

| Model | Description |
|-------|-------------|
| `User` | Admin users with email/password |
| `Role` | Permission roles (admin, staff, cashier) |
| `Session` | Active login sessions |

#### Products

| Model | Description |
|-------|-------------|
| `Category` | Product categories (EN/KH names) |
| `Product` | Products with dual pricing (USD/KHR) |
| `Inventory` | Stock levels and min thresholds |

#### Orders

| Model | Description |
|-------|-------------|
| `Customer` | Customer profiles with phone/tags |
| `Order` | Orders with status tracking |
| `OrderItem` | Individual items in an order |
| `Payment` | Payment records (cash, KHQR, etc.) |

#### Other

| Model | Description |
|-------|-------------|
| `Promotion` | Discount codes and promotions |
| `CMSContent` | Pages, blogs, banners, FAQs |
| `Setting` | Key-value shop settings |

---

## API Reference

### Authentication

#### POST /api/auth/login
Login and receive auth cookie.

```typescript
// Request
{ email: string, password: string }

// Response
{ user: { id, email, name, role, permissions } }
// Sets: auth-token cookie
```

#### POST /api/auth/logout
Clear session and cookie.

#### GET /api/auth/session
Get current authenticated user.

```typescript
// Response
{ authenticated: boolean, user?: { id, email, name, role } }
```

### Products

#### GET /api/products
List products with optional filters.

```typescript
// Query params
?categoryId=xxx    // Filter by category
?active=true       // Filter by status
?page=1&limit=20   // Pagination

// Response
{ products: Product[], total: number }
```

#### POST /api/products
Create new product.

```typescript
// Request
{
  nameEn: string,
  nameKh: string,
  priceUsd: number,
  priceKhr: number,
  categoryId: string,
  sku: string,
  imageUrl?: string
}
```

#### PUT /api/products
Update product.

#### DELETE /api/products?id=xxx
Delete product.

### Orders

#### GET /api/orders
List orders with filters.

```typescript
// Query params
?status=NEW|CONFIRMED|PREPARING|READY|COMPLETED|CANCELLED
?dateFrom=2024-01-01
?dateTo=2024-12-31
```

#### POST /api/orders
Create new order.

```typescript
// Request
{
  customerId?: string,
  customerName?: string,
  customerPhone?: string,
  items: [{ productId: string, quantity: number }],
  channel?: 'WEBSITE' | 'TELEGRAM' | 'MESSENGER' | 'PHONE' | 'WALK_IN',
  currency?: 'USD' | 'KHR',
  note?: string
}
```

#### PUT /api/orders
Update order status.

### Categories

#### GET /api/categories
List all categories.

#### POST /api/categories
Create category.

#### PUT /api/categories
Update category.

#### DELETE /api/categories?id=xxx
Delete category.

### Customers

#### GET /api/customers
List customers with optional search.

```typescript
?search=phone_or_name
```

#### POST /api/customers
Create customer.

#### PUT /api/customers
Update customer.

### Inventory

#### GET /api/inventory
List all inventory.

```typescript
?lowStock=true  // Only items below minLevel
```

#### PUT /api/inventory
Update stock levels.

```typescript
// Request
{
  productId: string,
  quantity?: number,    // Set absolute quantity
  adjustment?: number   // Add/subtract from current
}
```

### Payments

#### GET /api/payments
List payments.

#### POST /api/payments
Create payment record.

#### POST /api/payments/khqr
Generate KHQR QR code for payment.

```typescript
// Request
{ orderId: string, method: 'ABA_KHQR' | 'WING' }

// Response
{ qrImage: string, paymentId: string, amount: number, currency: string }
```

### Settings

#### GET /api/settings
Get all settings or specific key.

```typescript
?key=shop_name
```

#### PUT /api/settings
Update settings.

```typescript
// Request
{ settings: { key1: value1, key2: value2 } }
```

### Export

#### GET /api/export
Export data as CSV or JSON.

```typescript
?type=orders|products|customers|inventory|sales
?format=json|csv
?dateFrom=2024-01-01
?dateTo=2024-12-31
```

---

## Authentication

### Flow

1. User submits credentials to `/api/auth/login`
2. Server validates and creates session in database
3. JWT token set as HTTP-only cookie (`auth-token`)
4. Subsequent requests include cookie automatically
5. Protected routes check session via `/api/auth/session`

### JWT Payload

```typescript
{
  userId: string,
  roleId: string,
  email: string,
  iat: number,
  exp: number
}
```

### Role Permissions

```typescript
// Example: admin role
{
  products: ['read', 'write', 'delete'],
  orders: ['read', 'write', 'delete'],
  customers: ['read', 'write', 'delete'],
  inventory: ['read', 'write'],
  settings: ['read', 'write'],
  users: ['read', 'write', 'delete'],
  // ... more resources
}
```

---

## Internationalization (i18n)

### Supported Languages

- **English (en)** - Default
- **Khmer (kh)** - ភាសាខ្មែរ

### Supported Currencies

- **USD** - US Dollar ($)
- **KHR** - Cambodian Riel (៛)

### Usage

```tsx
import { useI18n } from '@/providers/i18n-provider'

function MyComponent() {
  const { language, currency, t, formatPrice, setLanguage, setCurrency } = useI18n()

  return (
    <div>
      <p>{t('common.welcome')}</p>
      <p>{formatPrice(10.00, 41000)}</p>
      <button onClick={() => setLanguage('kh')}>ខ្មែរ</button>
    </div>
  )
}
```

### Translation Files

Located in `lib/i18n/`:
- `en.json` - English translations
- `kh.json` - Khmer translations

---

## Payment Integration

### KHQR (Bakong Standard)

ApoloShop supports Cambodia's KHQR payment standard for:
- ABA Bank
- Wing
- Other Bakong-enabled banks

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

// qrImage is a base64 data URL
```

### Payment Methods

| Method | Code | Description |
|--------|------|-------------|
| Cash | `CASH` | Direct cash payment |
| ABA KHQR | `ABA_KHQR` | ABA Bank QR |
| Wing | `WING` | Wing mobile payment |
| PayWay | `PAYWAY` | PayWay gateway |
| Bank Transfer | `BANK_TRANSFER` | Manual transfer |

---

## Development Workflow

### Git Branching

```
main              # Production
└── Develop       # Development integration
    └── Feature/xxx   # Feature branches
    └── Bugfix/xxx    # Bug fixes
```

### Commit Convention

```
[feature-name] Description of changes

Examples:
[developer-docs] Add comprehensive developer documentation
[auth] Fix login redirect issue
[payments] Add Wing payment integration
```

### Scripts

```bash
bun dev           # Start dev server
bun build         # Production build
bun start         # Start production server
bun run db:seed   # Seed database
bun run db:push   # Push schema changes
bun run db:studio # Open Prisma Studio
```

### Adding a New API Endpoint

1. Create route file in `app/api/[resource]/route.ts`
2. Implement HTTP methods (GET, POST, PUT, DELETE)
3. Add types to `lib/api-hooks.ts`
4. Create React Query hook
5. Update this documentation

### Adding a New Admin Page

1. Create page component in `components/pages/[name]-page.tsx`
2. Add to `NavItem` type in `components/sidebar.tsx`
3. Add navigation item to `navItems` array
4. Add case to `renderPage()` in `components/admin-dashboard.tsx`

---

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@apolodev.com | admin123 |

---

## Support

- GitHub Issues: [github.com/RithyTep/ApoloShop/issues](https://github.com/RithyTep/ApoloShop/issues)
