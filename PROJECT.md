# ApoloShop - Project Memory

> Last Updated: 2025-12-23

## Overview

**ApoloShop** (branded as "Simple Shop") is a Next.js e-commerce platform designed for small Cambodian businesses, primarily coffee shops and bakeries.

- **Framework:** Next.js 16.0.10 with React 19.2.0
- **Package Manager:** Bun
- **Deployment:** Vercel (auto-deployed from v0.app)
- **Repository Branch:** Develop (main branch: main)

---

## Project Structure

```
ApoloShop/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout with metadata
│   ├── page.tsx                 # Main landing page
│   └── globals.css              # Global Tailwind theme
├── components/                   # React components (32 total)
│   ├── ui/                      # Shadcn UI base components
│   ├── pages/                   # Admin dashboard pages (12)
│   ├── shop-app.tsx             # Main shop container
│   ├── header.tsx               # Navigation header
│   ├── product-grid.tsx         # Product listing
│   ├── cart-drawer.tsx          # Shopping cart sidebar
│   ├── checkout-page.tsx        # Checkout with messaging
│   ├── customer-order-history.tsx
│   ├── order-status-notification.tsx
│   ├── receipt-invoice.tsx      # Receipt generation
│   ├── admin-dashboard.tsx      # Admin container
│   └── sidebar.tsx              # Navigation sidebar
├── lib/
│   ├── i18n.ts                  # Translations (EN/KH)
│   └── utils.ts                 # Utility functions
├── public/                      # Static assets (images)
└── styles/                      # Additional stylesheets
```

---

## Tech Stack

### Core
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.0.10 | React framework |
| React | 19.2.0 | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.1.9 | Styling |

### UI Libraries
- **Shadcn/ui** - Component library
- **Radix UI** - Headless components
- **Lucide React** - Icons
- **Phosphor React** - Alternative icons
- **Recharts** - Analytics charts

### Forms & Validation
- **React Hook Form** - Form management
- **Zod** - Schema validation

### Utilities
- **date-fns** - Date manipulation
- **clsx / tailwind-merge** - Class utilities
- **Sonner** - Toast notifications

---

## Key Features

### Customer Storefront
- Product browsing with grid layout
- Shopping cart with quantity management
- Multi-language support (English/Khmer)
- Multi-currency (USD/KHR, 1 USD ≈ 4000 KHR)
- Checkout via Telegram or Facebook Messenger

### Admin Dashboard
| Page | Purpose |
|------|---------|
| Dashboard | KPIs, today's orders, revenue |
| Products | Product management with SKUs |
| Orders | Order tracking and status |
| Customers | CRM with tags and notes |
| Inventory | Stock monitoring |
| Categories | Product categorization |
| Promotions | Discounts and offers |
| Payments | Payment tracking |
| Reports | Analytics with charts |
| Settings | App configuration |
| Users | Staff management |
| Content | CMS for content |

### Special Features
- **Receipt/Invoice Generation** - Print-ready receipts
- **Order Status Workflow:** New → Confirmed → Preparing → Completed

---

## Internationalization

**Languages:** English (en), Khmer (kh)

Translations in `/lib/i18n.ts` cover:
- Order statuses
- UI labels
- Notifications
- Kitchen screen
- Receipt terminology

---

## Configuration

### TypeScript (`tsconfig.json`)
- Target: ES6, Module: ESNext
- Path alias: `@/*` → root
- Strict mode enabled

### Next.js (`next.config.mjs`)
- Image optimization disabled
- TypeScript build errors ignored

### Shadcn UI (`components.json`)
- Style: "new-york"
- RSC enabled
- Lucide icons

---

## Development

```bash
# Install dependencies
bun install

# Run development server
bun dev

# Build for production
bun run build

# Start production server
bun start
```

---

## Git Workflow

- **Main branch:** `main`
- **Development branch:** `Develop`
- **Recent commits:**
  - `421e993` - fix: resolve build and lint issues
  - `3fa9649` - feat: implement advanced shop features
  - `0e42b23` - Initial repository setup

---

## Architecture Notes

### State Management
- React `useState` hooks at component level
- Props drilling for language/currency

### Data Flow
- Currently client-side only with mock data
- Orders shared via external messaging (Telegram/Messenger)

### Future Backend Integration Points
- Order submission API
- Product catalog API
- Customer management
- Payment processing
- Inventory sync

---

## Component Hierarchy

```
shop-app.tsx (Main Container)
├── header.tsx (Navigation)
├── product-grid.tsx (Products)
├── cart-drawer.tsx (Cart)
└── checkout-page.tsx (Checkout)

admin-dashboard.tsx (Admin Container)
├── sidebar.tsx (Navigation)
└── pages/*.tsx (Dashboard Pages)
```

---

## File Naming Conventions

- Components: `kebab-case.tsx`
- Pages: `*-page.tsx`
- UI components: `/components/ui/*.tsx`
- Utilities: `/lib/*.ts`

---

*This documentation is auto-generated and updated on each commit.*
