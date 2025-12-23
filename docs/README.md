# ApoloShop Documentation

> E-commerce CMS for Cambodian Small Businesses

| Meta | Value |
|------|-------|
| **Format** | Markdown |
| **Updated** | 2024-12-23 |
| **Author** | ApoloDev Team |
| **Version** | 1.0.0 |

## Quick Links

| Document | Description |
|----------|-------------|
| [Getting Started](./guides/getting-started.md) | Setup and installation |
| [Database Schema](./database/schema.md) | All tables and relationships |
| [API Reference](./api/README.md) | All API endpoints |
| [Code Conventions](./guides/conventions.md) | Coding standards |
| [Components Guide](./guides/components.md) | UI component patterns |

## Project Summary

**Tech Stack**: Next.js 16, TypeScript, Prisma, PostgreSQL, Tailwind CSS

**Key Features**:
- Multi-language (EN/KH)
- Multi-currency (USD/KHR)
- KHQR Payments (ABA, Wing)
- 12 Admin Dashboard Pages

**Default Login**: `admin@apolodev.com` / `admin123`

## Documentation Structure

```
docs/
├── README.md              # This file
├── database/
│   └── schema.md          # Database tables & relations
├── api/
│   ├── README.md          # API overview
│   ├── auth.md            # Authentication endpoints
│   ├── products.md        # Products CRUD
│   ├── orders.md          # Orders management
│   ├── customers.md       # Customer management
│   ├── payments.md        # Payment processing
│   ├── settings.md        # Shop settings
│   └── export.md          # Data export
├── guides/
│   ├── getting-started.md # Setup instructions
│   ├── conventions.md     # Code standards
│   └── components.md      # Component patterns
└── reference/
    ├── i18n.md            # Internationalization
    └── troubleshooting.md # Common issues
```

---

## API Endpoints

| Endpoint | Doc | Description |
|----------|-----|-------------|
| `/api/auth/*` | [auth.md](./api/auth.md) | Login, logout, session |
| `/api/products` | [products.md](./api/products.md) | Products CRUD |
| `/api/categories` | [products.md](./api/products.md#categories) | Categories CRUD |
| `/api/inventory` | [products.md](./api/products.md#inventory) | Stock tracking |
| `/api/orders` | [orders.md](./api/orders.md) | Order management |
| `/api/customers` | [customers.md](./api/customers.md) | Customer profiles |
| `/api/payments` | [payments.md](./api/payments.md) | Payment processing |
| `/api/settings` | [settings.md](./api/settings.md) | Shop configuration |
| `/api/export` | [export.md](./api/export.md) | Excel/PDF export |

---

## Reference

| Topic | Doc |
|-------|-----|
| i18n (EN/KH) | [reference/i18n.md](./reference/i18n.md) |
| Troubleshooting | [reference/troubleshooting.md](./reference/troubleshooting.md) |
