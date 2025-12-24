# ApoloShop

A modern, open-source e-commerce platform built for small Cambodian businesses (coffee shops, bakeries, retail stores).

[![MIT License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![Open Source](https://img.shields.io/badge/Open%20Source-Yes-brightgreen?style=for-the-badge&logo=opensourceinitiative)](https://github.com/RithyTep/ApoloShop)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen?style=for-the-badge)](https://github.com/RithyTep/ApoloShop/pulls)
[![Built with Next.js](https://img.shields.io/badge/Next.js-16.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com)

> **We welcome contributors!** Whether you're fixing bugs, adding features, improving docs, or suggesting ideas - all contributions are appreciated.

## Screenshots

<table>
  <tr>
    <td width="50%"><strong>Promotions</strong><br><img src="screenshort/screenshort-2.png" alt="Promotions"></td>
    <td width="50%"><strong>Shop Homepage</strong><br><img src="screenshort/screenshort-1.png" alt="Shop Homepage"></td>
  </tr>
  <tr>
    <td><strong>Product Detail</strong><br><img src="screenshort/screenshort-3.png" alt="Product Detail"></td>
    <td><strong>Footer</strong><br><img src="screenshort/screenshort-4.png" alt="Footer"></td>
  </tr>
  <tr>
    <td><strong>Admin Orders</strong><br><img src="screenshort/screenshort-5.png" alt="Orders Management"></td>
    <td><strong>Shop Customizer</strong><br><img src="screenshort/screenshort-6.png" alt="Shop Customizer"></td>
  </tr>
  <tr>
    <td><strong>Customizer Preview</strong><br><img src="screenshort/screenshort-7.png" alt="Customizer Preview"></td>
    <td><strong>PostgreSQL Database</strong><br><img src="screenshort/screenshort-8.png" alt="PostgreSQL Database"></td>
  </tr>
</table>

## Features

### Shop Frontend
- Product catalog with category filtering
- **Product detail page** with quantity selector
- Multi-currency support (USD / KHR)
- Multi-language support (English / Khmer) with language switcher
- Shopping cart with real-time updates
- Checkout via Telegram or Facebook Messenger with pre-filled message

### Admin Dashboard
- **Dashboard** - Sales analytics and statistics with charts
- **Orders** - Order management with status tracking
- **Products** - Product CRUD with inventory and image upload
- **Categories** - Category management with **drag & drop reordering**
- **Customers** - Customer database with order history
- **Inventory** - Stock management with low-stock alerts
- **Payments** - Payment gateway configuration (ABA KHQR, Wing, PayWay)
- **Promotions** - Discount codes and campaigns
- **Content** - CMS for pages, blogs, banners, FAQs
- **Users** - User and role management with permissions
- **Reports** - Sales and inventory reports with **CSV/Excel export**
- **Settings** - Shop info, currency, and social links configuration
- **Shop Customizer** - Visual page builder with drag & drop sections

### Shop Customizer (White Label)
- **Hero Banner** - Customizable hero with image/video, title, CTA button
- **Promotion Cards** - Grid layout with badge support
- **Product Sections** - Configurable product display (featured, by category)
- **Footer** - Multi-column footer with social links
- **Theme Editor** - Primary color, accent color, border radius presets
- **Live Preview** - Desktop, tablet, and mobile preview modes
- **Drag & Drop** - Reorder sections with drag and drop

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4, shadcn/ui |
| Database | PostgreSQL + Prisma ORM |
| State | React Query (TanStack) |
| Auth | JWT with bcrypt |
| Testing | Vitest + Playwright |
| Deployment | Vercel |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (recommended) or Node.js 18+
- PostgreSQL database

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/apoloshop.git
cd apoloshop

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your database URL

# Generate Prisma client
bun db:generate

# Push database schema
bun db:push

# Seed the database (optional)
bun db:seed

# Start development server
bun dev
```

### Environment Variables

```env
DATABASE_URL="postgresql://user:password@localhost:5432/apoloshop"
JWT_SECRET="your-secret-key"
```

## Scripts

| Command | Description |
|---------|-------------|
| `bun dev` | Start development server |
| `bun build` | Build for production |
| `bun start` | Start production server |
| `bun test` | Run unit tests (watch mode) |
| `bun test:run` | Run unit tests once |
| `bun test:e2e` | Run E2E tests |
| `bun db:push` | Push schema to database |
| `bun db:seed` | Seed database with sample data |
| `bun db:studio` | Open Prisma Studio |

## Project Structure

```
apoloshop/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── admin/             # Admin pages
│   └── shop/              # Shop pages
├── components/
│   ├── ui/                # shadcn/ui components
│   └── pages/             # Admin dashboard pages
├── lib/
│   ├── api-hooks.ts       # React Query hooks
│   ├── i18n.ts            # Translations (EN/KH)
│   └── utils.ts           # Utility functions
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Seed script
├── tests/
│   ├── unit/              # Vitest unit tests
│   └── e2e/               # Playwright E2E tests
└── docs/                  # Documentation
```

## API Endpoints

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/products` | GET, POST, PUT, DELETE | Product management |
| `/api/categories` | GET, POST, PUT, DELETE | Category management |
| `/api/orders` | GET, POST, PUT | Order management |
| `/api/customers` | GET, POST, PUT, DELETE | Customer management |
| `/api/promotions` | GET, POST, PUT, DELETE | Promotion codes |
| `/api/cms` | GET, POST, PUT, DELETE | CMS content |
| `/api/users` | GET, POST, PUT, DELETE | User management |
| `/api/roles` | GET | Role listing |
| `/api/settings` | GET, PUT | Shop settings |
| `/api/customizer` | GET, PUT | Shop customization config |
| `/api/dashboard` | GET | Dashboard statistics |
| `/api/auth/*` | POST | Authentication |

## Testing

```bash
# Unit tests
bun test:run

# E2E tests
bun test:e2e

# E2E tests with UI
bun test:e2e:ui
```

## Currency & Language

### Multi-Currency
- USD (default)
- KHR (Cambodian Riel)
- Configurable exchange rate (default: 1 USD = 4,100 KHR)

### Multi-Language
- English (en)
- Khmer (kh)
- Translations in `lib/i18n.ts`

## Contributing

We love contributions! ApoloShop is open source and we welcome developers of all skill levels.

### Ways to Contribute

- **Bug Reports** - Found a bug? [Open an issue](https://github.com/RithyTep/ApoloShop/issues/new)
- **Feature Requests** - Have an idea? [Start a discussion](https://github.com/RithyTep/ApoloShop/discussions)
- **Code** - Pick an issue and submit a PR
- **Documentation** - Help improve our docs
- **Translations** - Add support for more languages

### Quick Start for Contributors

```bash
# 1. Fork and clone the repo
git clone https://github.com/YOUR_USERNAME/ApoloShop.git
cd ApoloShop

# 2. Install dependencies
bun install

# 3. Set up environment
cp .env.example .env

# 4. Create a feature branch
git checkout -b Feature/your-feature

# 5. Make changes and commit
git commit -m "[feat] Add your feature"

# 6. Push and create PR
git push origin Feature/your-feature
```

### Commit Convention

| Prefix | Description |
|--------|-------------|
| `[feat]` | New feature |
| `[fix]` | Bug fix |
| `[docs]` | Documentation |
| `[refactor]` | Code refactoring |
| `[test]` | Tests |
| `[chore]` | Maintenance |

See [GIT_WORKFLOW.md](./GIT_WORKFLOW.md) for detailed guidelines.

### Good First Issues

Look for issues labeled [`good first issue`](https://github.com/RithyTep/ApoloShop/labels/good%20first%20issue) - these are great for newcomers!

## Documentation

- [Project Documentation](./docs/README.md)
- [API Documentation](./docs/api/)
- [Feature Documentation](./docs/features/)
- [Changelog](./CHANGELOG.md)

## Community & Support

- [GitHub Issues](https://github.com/RithyTep/ApoloShop/issues) - Bug reports & feature requests
- [GitHub Discussions](https://github.com/RithyTep/ApoloShop/discussions) - Questions & ideas
- [Changelog](./CHANGELOG.md) - See what's new

## Roadmap

- [ ] Multi-branch support
- [ ] Loyalty/rewards system
- [ ] Product variants (size, color)
- [ ] Order notifications (Telegram)
- [ ] Analytics dashboard
- [ ] Reviews & ratings

See [white-label-modules.md](./docs/features/white-label-modules.md) for the full roadmap.

## License

MIT License - see [LICENSE](./LICENSE) for details.

This means you can:
- Use it for commercial projects
- Modify and distribute
- Use privately

---

**Built with love for Cambodian small businesses**

[Next.js](https://nextjs.org) | [shadcn/ui](https://ui.shadcn.com) | [Prisma](https://prisma.io) | [Tailwind CSS](https://tailwindcss.com)
