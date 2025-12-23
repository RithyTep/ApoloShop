# Feature: Testing Infrastructure

> **Branch:** `Feature/testing`
> **Status:** In Progress
> **Last Updated: 2025-12-23*

---

## Overview

Comprehensive testing infrastructure for ApoloShop using **Vitest** (unit/component tests) and **Playwright** (E2E tests). This ensures code quality, prevents regressions, and validates critical business flows.

---

## Usage

### Run All Unit Tests

```bash
bun test              # Watch mode
bun test:run          # Single run
bun test:coverage     # With coverage report
```

### Run E2E Tests

```bash
bun test:e2e          # Headless mode
bun test:e2e:ui       # Interactive UI mode
```

---

## Test Structure

```
tests/
├── setup.ts                    # Vitest global setup
├── unit/
│   └── api/
│       ├── products.test.ts    # Products API tests (11 tests)
│       ├── orders.test.ts      # Orders API tests (13 tests)
│       └── auth.test.ts        # Auth API tests (8 tests)
├── components/
│   ├── product-grid.test.tsx   # ProductGrid tests (8 tests)
│   └── checkout-page.test.tsx  # Checkout tests
e2e/
├── shop.spec.ts                # Shop browsing E2E
├── checkout.spec.ts            # Checkout flow E2E
└── admin/
    ├── all-pages.spec.ts       # All admin pages E2E (13 tests)
    ├── login.spec.ts           # Admin login E2E (9 tests)
    └── products.spec.ts        # Product management E2E (3 tests)
```

---

## Configuration Files

| File | Purpose |
|------|---------|
| `vitest.config.mts` | Vitest configuration |
| `playwright.config.ts` | Playwright configuration |
| `tests/setup.ts` | Test setup and matchers |

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

## Test Categories

### Unit Tests (Vitest)

Test isolated functions and API route handlers.

| Test File | Coverage |
|-----------|----------|
| `products.test.ts` | CRUD, validation, SKU uniqueness |
| `orders.test.ts` | Creation, status transitions, inventory |
| `auth.test.ts` | Login, logout, session validation |

### Component Tests (Vitest + Testing Library)

Test React components in isolation.

| Test File | Coverage |
|-----------|----------|
| `product-grid.test.tsx` | Rendering, filtering, add to cart |
| `checkout-page.test.tsx` | Form validation, order submission |

### E2E Tests (Playwright)

Test complete user journeys.

| Test File | Coverage |
|-----------|----------|
| `shop.spec.ts` | Browse products, filter, view details |
| `checkout.spec.ts` | Add to cart, checkout, order confirmation |
| `admin/login.spec.ts` | Admin authentication flow |
| `admin/products.spec.ts` | Product CRUD in admin |

---

## Writing Tests

### Unit Test Example

```typescript
// tests/unit/api/products.test.ts
import { describe, it, expect, vi } from 'vitest'

describe('Products API', () => {
  it('should validate required fields', async () => {
    // Test implementation
  })

  it('should reject duplicate SKU', async () => {
    // Test implementation
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
// e2e/checkout.spec.ts
import { test, expect } from '@playwright/test'

test('complete checkout flow', async ({ page }) => {
  await page.goto('/shop')
  await page.click('[data-testid="add-to-cart"]')
  await page.click('[data-testid="checkout"]')
  await expect(page).toHaveURL('/checkout')
})
```

---

## Related Files

- `vitest.config.mts` - Vitest configuration
- `playwright.config.ts` - Playwright configuration
- `tests/setup.ts` - Test setup file
- `package.json` - Test scripts

---

## Commands Reference

| Command | Description |
|---------|-------------|
| `bun test` | Run Vitest in watch mode |
| `bun test:run` | Run Vitest once |
| `bun test:coverage` | Run with coverage report |
| `bun test:e2e` | Run Playwright tests |
| `bun test:e2e:ui` | Run Playwright with UI |

---

## Known Issues

- Async Server Components require E2E tests (Vitest limitation)

---

## Future Improvements

- [ ] Add visual regression testing
- [ ] Add API contract testing
- [ ] Add performance testing
- [ ] CI/CD integration with GitHub Actions
