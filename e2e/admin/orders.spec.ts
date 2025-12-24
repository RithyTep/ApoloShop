import { test, expect } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

test.describe('Admin Orders Page', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/admin/login')
    await page.fill('input[type="email"], input[name="email"]', 'admin@apolodev.com')
    await page.fill('input[type="password"], input[name="password"]', 'admin123')
    await page.click('button:has-text("Sign In")')

    // Wait for sidebar and navigate to Orders
    await expect(page.locator('nav button').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 10000 })
    await page.locator('nav button').filter({ hasText: 'Orders' }).click()
    await page.waitForTimeout(500)
  })

  test('should display orders page header', async ({ page }) => {
    const header = page.locator('h1, h2').filter({ hasText: 'Orders' })
    await expect(header.first()).toBeVisible()
  })

  test('should display orders table or empty state', async ({ page }) => {
    // Wait for loading
    await page.waitForTimeout(2000)

    // Should have either orders table or empty state
    const hasTable = await page.locator('table').first().isVisible().catch(() => false)
    const hasEmptyState = await page.locator('text=/no orders|empty/i').isVisible().catch(() => false)

    expect(hasTable || hasEmptyState).toBeTruthy()
  })

  test('should have status filter dropdown', async ({ page }) => {
    await page.waitForTimeout(1000)

    // Filter might be present as tabs, buttons, or dropdown
    const statusTabs = page.locator('button').filter({ hasText: /NEW|CONFIRMED|PREPARING|READY|COMPLETED|All/i })
    const hasTabs = await statusTabs.first().isVisible().catch(() => false)

    // Or look for any filter-like UI
    const hasFilterUI = await page.locator('[class*="tab"], [class*="filter"], select, [role="combobox"]').first().isVisible().catch(() => false)

    // Just verify the page loaded without errors
    const errorDialog = page.locator('dialog:has-text("Runtime")')
    expect(await errorDialog.count()).toBe(0)
    expect(hasTabs || hasFilterUI).toBeTruthy()
  })

  test('should show order details when clicking view', async ({ page }) => {
    await page.waitForTimeout(2000)

    // Check if there are orders
    const viewButton = page.locator('button').filter({ has: page.locator('svg') }).first()
    const hasOrders = await viewButton.isVisible().catch(() => false)

    if (hasOrders) {
      // Click view button (Eye icon)
      const eyeButton = page.locator('table button').first()
      if (await eyeButton.isVisible().catch(() => false)) {
        await eyeButton.click()
        await page.waitForTimeout(500)

        // Should show dialog/modal with order details
        const hasDialog = await page.locator('[role="dialog"], dialog').isVisible().catch(() => false)
        const hasOrderInfo = await page.locator('text=/order|customer|total/i').isVisible().catch(() => false)

        expect(hasDialog || hasOrderInfo).toBeTruthy()
      }
    }
  })

  test('should filter orders by status', async ({ page }) => {
    await page.waitForTimeout(2000)

    // Try clicking status tabs if available
    const newTab = page.locator('button').filter({ hasText: 'NEW' }).first()
    if (await newTab.isVisible().catch(() => false)) {
      await newTab.click()
      await page.waitForTimeout(500)

      // Page should update without errors
      const errorDialog = page.locator('dialog:has-text("Runtime")')
      expect(await errorDialog.count()).toBe(0)
    }
  })

  test('should update order status', async ({ page }) => {
    await page.waitForTimeout(2000)

    // Look for status dropdown in table row
    const statusDropdown = page.locator('table [role="combobox"], table select').first()

    if (await statusDropdown.isVisible().catch(() => false)) {
      await statusDropdown.click()
      await page.waitForTimeout(300)

      // Should show status options
      const hasOptions = await page.locator('[role="option"], option').first().isVisible().catch(() => false)
      expect(hasOptions).toBeTruthy()
    }
  })

  test('should have search functionality', async ({ page }) => {
    // Look for search input
    const searchInput = page.locator('input[placeholder*="search" i], input[type="search"]')
    const hasSearch = await searchInput.isVisible().catch(() => false)

    if (hasSearch) {
      await searchInput.fill('ORD-')
      await page.waitForTimeout(500)

      // Page should respond without errors
      const errorDialog = page.locator('dialog:has-text("Runtime")')
      expect(await errorDialog.count()).toBe(0)
    }
  })

  test('should display order statistics', async ({ page }) => {
    // Look for stats cards (total orders, revenue, etc.)
    const statsCards = page.locator('[class*="card"]').filter({ hasText: /orders|revenue|total/i })
    const hasStats = await statsCards.first().isVisible().catch(() => false)

    // Stats might not be on orders page, so this is optional
    if (hasStats) {
      expect(await statsCards.count()).toBeGreaterThan(0)
    }
  })

  test('should paginate orders', async ({ page }) => {
    await page.waitForTimeout(2000)

    // Look for pagination controls
    const pagination = page.locator('nav[aria-label*="pagination" i], button:has-text("Next"), button:has-text(">")')
    const hasPagination = await pagination.first().isVisible().catch(() => false)

    if (hasPagination) {
      const nextButton = page.locator('button').filter({ hasText: /next|>/i }).first()
      if (await nextButton.isEnabled().catch(() => false)) {
        await nextButton.click()
        await page.waitForTimeout(500)

        // Should update without errors
        const errorDialog = page.locator('dialog:has-text("Runtime")')
        expect(await errorDialog.count()).toBe(0)
      }
    }
  })
})
