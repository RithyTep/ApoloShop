# Changelog

All notable changes to ApoloShop will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Shop frontend with real data integration
- Checkout page with order creation API
- Product grid with category filtering
- **Product detail page** with dynamic routing (`/shop/product/[id]`)
- Dashboard stats API
- Promotions management
- CMS content management
- User and role management
- Semantic CSS variables for status colors (--success, --warning, --info)
- **Real CSV/Excel export** for reports (sales, orders, products, inventory, customers)
- **Drag-and-drop reordering** for categories using @dnd-kit
- Language switcher (EN/KH) in shop header
- **Category preloading** - Zero-loading experience when switching categories

### Changed
- **Enhanced ProductGrid UX** with React Query prefetching for instant category switching
- Sticky category filter bar with backdrop blur effect
- Smooth transitions with `useTransition` and CSS animations on product cards
- Updated ProductGrid to use React Query hooks
- Improved checkout flow with loading states
- Replaced all native `<select>` elements with shadcn/ui Select component (8 files)
- Replaced all native checkboxes with shadcn/ui Switch component (6 files)
- Replaced hardcoded Tailwind colors with semantic CSS variables (11 files)
- Unified UI styling across all admin pages for consistency

### Fixed
- Fixed icon import in checkout page

---

## [0.1.0] - 2025-12-23

### Added
- Initial project setup with Next.js 16
- Admin dashboard with 12 management pages
- Product, Category, Order, Customer management
- Multi-language support (English/Khmer)
- Multi-currency support (USD/KHR)
- Kitchen Display System (KDS)
- Telegram/Messenger checkout integration
- Prisma ORM with PostgreSQL
- Shadcn/ui component library
- React Query for data fetching

### Documentation
- Project documentation (PROJECT.md)
- API documentation (docs/api/)
- Developer guides (docs/guides/)
- Database schema documentation

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| 0.1.0 | 2025-12-23 | Initial release |

---

*For detailed changes, see the [commit history](../../commits/main).*
