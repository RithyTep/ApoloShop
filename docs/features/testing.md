# Feature: Testing Infrastructure

> **Branch:** `Develop`
> **Status:** Complete
> **Last Updated:** 2025-12-24

---

## Overview

Comprehensive testing infrastructure for ApoloShop using **Vitest** (unit/component tests) and **Playwright** (E2E tests). This ensures code quality, prevents regressions, and validates critical business flows.

**Total Tests: 156** (79 unit + 77 E2E)

---

## Usage

### Run All Unit Tests

```bash
bun test              # Watch mode
bun test:run          # Single run (79 tests)
bun test:coverage     # With coverage report
```

### Run E2E Tests

```bash
bun test:e2e          # Headless mode (77 tests)
bun test:e2e:ui       # Interactive UI mode
```

---

## Test Structure

```
tests/
├── setup.ts                      # Vitest global setup
├── unit/
│   ├── api/
│   │   ├── products.test.ts      # Products API tests (11 tests)
│   │   ├── orders.test.ts        # Orders API tests (13 tests)
│   │   ├── customers.test.ts     # Customers API tests (12 tests)
│   │   ├── customizer.test.ts    # Customizer API tests (7 tests)
│   │   └── auth.test.ts          # Auth API tests (8 tests)
│   └── lib/
│       ├── utils.test.ts         # Utility functions (9 tests)
│       └── r2.test.ts            # R2 upload utilities (11 tests)
├── components/
│   └── product-grid.test.tsx     # ProductGrid tests (8 tests)

e2e/
├── shop.spec.ts                  # Shop browsing E2E (7 tests)
└── admin/
    ├── all-pages.spec.ts         # All admin pages E2E (14 tests)
    ├── login.spec.ts             # Admin login E2E (8 tests)
    ├── products.spec.ts          # Product management E2E (3 tests)
    ├── orders.spec.ts            # Order management E2E (9 tests)
    ├── customers.spec.ts         # Customer management E2E (10 tests)
    ├── inventory.spec.ts         # Inventory management E2E (10 tests)
    └── customizer.spec.ts        # Shop customizer E2E (12 tests)
```

---

## Test Summary

### Unit Tests (Vitest) - 79 tests

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `api/products.test.ts` | 11 | CRUD, validation, SKU uniqueness |
| `api/orders.test.ts` | 13 | Creation, status transitions, validation |
| `api/customers.test.ts` | 12 | CRUD, phone uniqueness, tags |
| `api/customizer.test.ts` | 7 | Config CRUD, validation |
| `api/auth.test.ts` | 8 | Login, logout, session validation |
| `lib/utils.test.ts` | 9 | cn() function, Tailwind merging |
| `lib/r2.test.ts` | 11 | File naming, URL generation, key extraction |
| `components/product-grid.test.tsx` | 8 | Rendering, filtering, add to cart |

### E2E Tests (Playwright) - 77 tests

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `admin/all-pages.spec.ts` | 14 | All admin sidebar navigation |
| `admin/login.spec.ts` | 8 | Authentication flow |
| `admin/orders.spec.ts` | 9 | Order listing, filtering, status updates |
| `admin/customers.spec.ts` | 10 | Customer CRUD, search, tags |
| `admin/inventory.spec.ts` | 10 | Stock management, low stock alerts |
| `admin/customizer.spec.ts` | 12 | Shop customization, sections, theme |
| `admin/products.spec.ts` | 3 | Product CRUD |
| `shop.spec.ts` | 7 | Shop browsing, cart, currency toggle |

---

## Configuration Files

| File | Purpose |
|------|---------|
| `vitest.config.ts` | Vitest configuration with React and tsconfig paths |
| `playwright.config.ts` | Playwright configuration |
| `tests/setup.ts` | Test setup, mocks, and matchers |

---

## Dependencies

```bash
# Vitest & Testing Library
bun add -D vitest @vitejs/plugin-react jsdom
bun add -D @testing-library/react @testing-library/dom @testing-library/user-event
bun add -D @testing-library/jest-dom vite-tsconfig-paths

# Playwright
bun add -D @playwright/test
bunx playwright install
```

---

## Writing Tests

### Unit Test Example (API)

```typescript
// tests/unit/api/customers.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    customer: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}))

import { GET, POST } from '@/app/api/customers/route'
import { prisma } from '@/lib/prisma'

describe('Customers API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a customer', async () => {
    vi.mocked(prisma.customer.create).mockResolvedValue({ id: '1', name: 'Test' })

    const request = new NextRequest('http://localhost/api/customers', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', phone: '+855123456789' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(201)
  })
})
```

### Unit Test Example (Utility)

```typescript
// tests/unit/lib/utils.test.ts
import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn utility', () => {
  it('should merge Tailwind classes', () => {
    expect(cn('px-4', 'px-6')).toBe('px-6')
  })

  it('should handle conditional classes', () => {
    expect(cn('base', true && 'active', false && 'disabled')).toBe('base active')
  })
})
```

### Component Test Example

```tsx
// tests/components/product-grid.test.tsx
import { render, screen } from '@testing-library/react'
import { ProductGrid } from '@/components/product-grid'

describe('ProductGrid', () => {
  it('should render products', () => {
    render(<ProductGrid onAddToCart={vi.fn()} currency="USD" language="EN" />)
    expect(screen.getByText('Our Products')).toBeInTheDocument()
  })
})
```

### E2E Test Example

```typescript
// e2e/admin/customers.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Admin Customers Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/login')
    await page.fill('input[name="email"]', 'admin@apolodev.com')
    await page.fill('input[name="password"]', 'admin123')
    await page.click('button:has-text("Sign In")')
    await page.locator('nav button').filter({ hasText: 'Customers' }).click()
  })

  test('should display customers table', async ({ page }) => {
    const table = page.locator('table')
    await expect(table).toBeVisible()
  })
})
```

---

## Commands Reference

| Command | Description |
|---------|-------------|
| `bun test` | Run Vitest in watch mode |
| `bun test:run` | Run Vitest once (79 tests) |
| `bun test:coverage` | Run with coverage report |
| `bun test:e2e` | Run Playwright tests (77 tests) |
| `bun test:e2e:ui` | Run Playwright with UI |

---

## Related Files

- `vitest.config.ts` - Vitest configuration
- `playwright.config.ts` - Playwright configuration
- `tests/setup.ts` - Test setup file
- `package.json` - Test scripts

---

## Known Issues

- Async Server Components require E2E tests (Vitest limitation)
- E2E tests require dev server running (auto-started by Playwright)

---

## Changelog

### 2025-12-24
- Added `vitest.config.ts` configuration file
- Added unit tests for R2 utilities (11 tests)
- Added unit tests for cn() utility (9 tests)
- Added unit tests for Customers API (12 tests)
- Added E2E tests for Orders page (9 tests)
- Added E2E tests for Customers page (10 tests)
- Added E2E tests for Inventory page (10 tests)
- Fixed existing tests for header pill toggle redesign
- **Total: 156 tests (79 unit + 77 E2E)**

### 2025-12-23
- Initial testing infrastructure setup
- Added Products, Orders, Auth API tests
- Added ProductGrid component tests
- Added Admin pages E2E tests
