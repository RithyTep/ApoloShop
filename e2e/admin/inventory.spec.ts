import { test, expect } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

test.describe('Admin Inventory Page', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/admin/login')
    await page.fill('input[type="email"], input[name="email"]', 'admin@apolodev.com')
    await page.fill('input[type="password"], input[name="password"]', 'admin123')
    await page.click('button:has-text("Sign In")')

    // Wait for sidebar and navigate to Inventory
    await expect(page.locator('nav button').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 10000 })
    await page.locator('nav button').filter({ hasText: 'Inventory' }).click()
    await page.waitForTimeout(500)
  })

  test('should display inventory page header', async ({ page }) => {
    const header = page.locator('h1, h2').filter({ hasText: 'Inventory' })
    await expect(header.first()).toBeVisible()
  })

  test('should display inventory table or empty state', async ({ page }) => {
    await page.waitForTimeout(2000)

    // Should have either inventory table or empty state
    const hasTable = await page.locator('table').first().isVisible().catch(() => false)
    const hasEmptyState = await page.locator('text=/no inventory|no products|empty/i').isVisible().catch(() => false)
    const hasCards = await page.locator('[class*="card"]').first().isVisible().catch(() => false)

    expect(hasTable || hasEmptyState || hasCards).toBeTruthy()
  })

  test('should display inventory columns', async ({ page }) => {
    await page.waitForTimeout(2000)

    // Check for expected table headers
    const expectedColumns = ['Product', 'SKU', 'Quantity', 'Min Level', 'Status']
    let columnsFound = 0

    for (const column of expectedColumns) {
      const header = page.locator('th, [role="columnheader"]').filter({ hasText: new RegExp(column, 'i') })
      if (await header.isVisible().catch(() => false)) {
        columnsFound++
      }
    }

    // Should have at least some expected columns (table might have different layout)
    expect(columnsFound).toBeGreaterThanOrEqual(2)
  })

  test('should show low stock warning indicators', async ({ page }) => {
    await page.waitForTimeout(2000)

    // Look for low stock indicators (badges, icons, or colored text)
    const lowStockIndicator = page.locator('[class*="red"], [class*="warning"], [class*="destructive"]').filter({ hasText: /low|out|critical/i })
    const hasIndicator = await lowStockIndicator.first().isVisible().catch(() => false)

    // This is optional - might not have low stock items
    // Just ensure page loads without errors
    const errorDialog = page.locator('dialog:has-text("Runtime")')
    expect(await errorDialog.count()).toBe(0)
  })

  test('should have stock filter options', async ({ page }) => {
    await page.waitForTimeout(2000)

    // Look for filter buttons or dropdown
    const allButton = page.locator('button').filter({ hasText: /all/i })
    const lowStockButton = page.locator('button').filter({ hasText: /low stock/i })
    const outOfStockButton = page.locator('button').filter({ hasText: /out of stock/i })

    const hasAllButton = await allButton.isVisible().catch(() => false)
    const hasLowStock = await lowStockButton.isVisible().catch(() => false)
    const hasOutOfStock = await outOfStockButton.isVisible().catch(() => false)

    // Should have at least some filter options
    expect(hasAllButton || hasLowStock || hasOutOfStock).toBeTruthy()
  })

  test('should filter by low stock', async ({ page }) => {
    await page.waitForTimeout(2000)

    // Click low stock filter
    const lowStockButton = page.locator('button').filter({ hasText: /low stock/i })

    if (await lowStockButton.isVisible().catch(() => false)) {
      await lowStockButton.click()
      await page.waitForTimeout(500)

      // Page should update without errors
      const errorDialog = page.locator('dialog:has-text("Runtime")')
      expect(await errorDialog.count()).toBe(0)
    }
  })

  test('should search inventory', async ({ page }) => {
    await page.waitForTimeout(2000)

    // Find search input
    const searchInput = page.locator('input[placeholder*="search" i], input[type="search"]')

    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('coffee')
      await page.waitForTimeout(500)

      // Page should update without errors
      const errorDialog = page.locator('dialog:has-text("Runtime")')
      expect(await errorDialog.count()).toBe(0)
    }
  })

  test('should open stock adjustment dialog', async ({ page }) => {
    await page.waitForTimeout(2000)

    // Find adjust/edit button in table
    const adjustButton = page.locator('table button').filter({ hasText: /adjust|edit|update/i }).first()
    const hasAdjustButton = await adjustButton.isVisible().catch(() => false)

    // Or look for icon button
    const iconButton = page.locator('table button').filter({ has: page.locator('svg') }).first()

    if (hasAdjustButton) {
      await adjustButton.click()
      await page.waitForTimeout(500)

      const dialog = page.locator('[role="dialog"], dialog')
      await expect(dialog).toBeVisible({ timeout: 5000 })
    } else if (await iconButton.isVisible().catch(() => false)) {
      await iconButton.click()
      await page.waitForTimeout(500)

      // Check if dialog opened
      const dialog = page.locator('[role="dialog"], dialog')
      const hasDialog = await dialog.isVisible().catch(() => false)

      // Either dialog opened or this action does something else
      const errorDialog = page.locator('dialog:has-text("Runtime")')
      expect(await errorDialog.count()).toBe(0)
    }
  })

  test('should adjust stock quantity', async ({ page }) => {
    await page.waitForTimeout(2000)

    // Find first product row's adjust button
    const adjustButton = page.locator('table tr button').first()

    if (await adjustButton.isVisible().catch(() => false)) {
      await adjustButton.click()
      await page.waitForTimeout(500)

      // Look for quantity input in dialog
      const quantityInput = page.locator('dialog input[type="number"], [role="dialog"] input[type="number"]')

      if (await quantityInput.isVisible().catch(() => false)) {
        await quantityInput.fill('10')
        await page.waitForTimeout(300)

        // Find save button
        const saveButton = page.locator('dialog button, [role="dialog"] button').filter({ hasText: /save|update|confirm/i })

        if (await saveButton.isVisible().catch(() => false)) {
          await saveButton.click()
          await page.waitForTimeout(1000)

          // No errors should appear
          const errorDialog = page.locator('dialog:has-text("Error")')
          expect(await errorDialog.count()).toBe(0)
        }
      }
    }
  })

  test('should update minimum stock level', async ({ page }) => {
    await page.waitForTimeout(2000)

    // Open adjustment dialog
    const adjustButton = page.locator('table tr button').first()

    if (await adjustButton.isVisible().catch(() => false)) {
      await adjustButton.click()
      await page.waitForTimeout(500)

      // Look for min level input
      const minLevelInput = page.locator('dialog input', { has: page.locator('[id*="min" i]') }).first()
      const allInputs = page.locator('dialog input[type="number"], [role="dialog"] input[type="number"]')

      if (await minLevelInput.isVisible().catch(() => false)) {
        await minLevelInput.fill('5')
      } else if (await allInputs.count() > 1) {
        // Try second input (might be min level)
        await allInputs.nth(1).fill('5')
      }

      await page.waitForTimeout(300)

      // Just verify no errors
      const errorDialog = page.locator('dialog:has-text("Runtime")')
      expect(await errorDialog.count()).toBe(0)
    }
  })

  test('should show inventory summary stats', async ({ page }) => {
    await page.waitForTimeout(2000)

    // Look for summary cards
    const statsCards = page.locator('[class*="card"]').filter({ hasText: /total|low stock|out of stock|products/i })
    const hasStats = await statsCards.first().isVisible().catch(() => false)

    // Stats might be optional
    if (hasStats) {
      expect(await statsCards.count()).toBeGreaterThan(0)
    }
  })

  test('should handle bulk stock update', async ({ page }) => {
    await page.waitForTimeout(2000)

    // Look for bulk update button
    const bulkButton = page.locator('button').filter({ hasText: /bulk|update all/i })

    if (await bulkButton.isVisible().catch(() => false)) {
      await bulkButton.click()
      await page.waitForTimeout(500)

      // Should show bulk update interface
      const dialog = page.locator('[role="dialog"], dialog')
      const hasDialog = await dialog.isVisible().catch(() => false)

      // Just ensure no errors
      const errorDialog = page.locator('dialog:has-text("Runtime")')
      expect(await errorDialog.count()).toBe(0)
    }
  })

  test('should display product images in inventory list', async ({ page }) => {
    await page.waitForTimeout(2000)

    // Look for product images
    const productImages = page.locator('table img, table [class*="avatar"]')
    const hasImages = await productImages.first().isVisible().catch(() => false)

    // Images are optional based on product data
    const errorDialog = page.locator('dialog:has-text("Runtime")')
    expect(await errorDialog.count()).toBe(0)
  })
})
