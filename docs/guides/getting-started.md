# Getting Started

| Meta | Value |
|------|-------|
| **Format** | Markdown |
| **Updated** | 2024-12-23 |
| **Author** | ApoloDev Team |

---

## Prerequisites

- Node.js 18+
- Bun package manager
- PostgreSQL database

## Setup

### 1. Clone Repository

```bash
git clone <repo-url>
cd ApoloShop
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Environment Variables

Create `.env` file:

```env
# Database
DATABASE_URL="postgresql://user:pass@host:5432/db?schema=apolo"

# Auth
JWT_SECRET="your-32-char-secret-key"

# Optional: Payment integration
ABA_MERCHANT_ID="your-aba-merchant-id"
```

### 4. Database Setup

```bash
# Generate Prisma client
bunx prisma generate

# Push schema to database
bunx prisma db push

# Seed initial data
bun run db:seed
```

### 5. Run Development Server

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Default Credentials

After seeding:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@apolodev.com | admin123 |

---

## Project Structure

```
ApoloShop/
├── app/                  # Next.js App Router
│   ├── admin/           # Admin dashboard pages
│   ├── api/             # API routes
│   └── page.tsx         # Landing page
├── components/          # React components
│   ├── ui/             # Shadcn UI primitives
│   └── pages/          # Page-level components
├── lib/                 # Utilities
│   ├── api-hooks.ts    # React Query hooks
│   ├── i18n/           # Translations
│   └── prisma.ts       # Database client
├── prisma/             # Database schema
└── docs/               # Documentation
```

---

## Key URLs

| URL | Description |
|-----|-------------|
| `/` | Landing page |
| `/shop` | Customer shop |
| `/admin` | Admin dashboard |
| `/admin/login` | Admin login |

---

## Development Commands

```bash
bun dev          # Start dev server
bun build        # Production build
bun start        # Start production
bun lint         # Run ESLint
bun db:seed      # Seed database
```

---

## Next Steps

1. Read [Conventions](./conventions.md) for code style
2. Review [Components](./components.md) for UI patterns
3. Check [API Reference](../api/README.md) for endpoints
