# Claude Code Project Memory - ApoloShop

This file provides context for Claude Code when working on this project.

## Project Overview

**ApoloShop** is a Next.js 16 e-commerce platform for small Cambodian businesses (coffee shops, bakeries).

## Quick Reference

| Aspect | Details |
|--------|---------|
| Framework | Next.js 16.0.10, React 19.2.0 |
| Styling | Tailwind CSS 4.1.9, Shadcn/ui |
| Language | TypeScript |
| Package Manager | Bun |
| Deployment | Vercel |

## Key Directories

- `app/` - Next.js App Router pages
- `components/` - React components (32 total)
- `components/ui/` - Shadcn UI components
- `components/pages/` - Admin dashboard pages
- `lib/` - Utilities and i18n translations
- `public/` - Static assets

## Important Files

- `components/shop-app.tsx` - Main shop container
- `components/admin-dashboard.tsx` - Admin dashboard
- `lib/i18n.ts` - English/Khmer translations
- `PROJECT.md` - Full project documentation

## Development Commands

```bash
bun dev      # Start dev server
bun build    # Production build
bun start    # Start production
```

## Code Conventions

- Components: `kebab-case.tsx`
- Page components: `*-page.tsx`
- UI primitives: `components/ui/`
- Translations in `lib/i18n.ts`

## Features to Know

1. **Multi-language**: English (en) / Khmer (kh)
2. **Multi-currency**: USD / KHR (1 USD = 4000 KHR)
3. **Checkout**: Via Telegram or Facebook Messenger
4. **Admin**: 12 dashboard pages for shop management
5. **KDS**: Kitchen Display System for order tracking

## Git Workflow

- Main branch: `main`
- Development: `Develop`
- Docs auto-update on commit via pre-commit hook

## MCP Integration

This project uses MCP servers for:
- `filesystem` - File access
- `memory` - Persistent context

See `.claude/settings.local.json` for configuration.

---

*For full documentation, see PROJECT.md*
