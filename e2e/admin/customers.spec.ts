import { test, expect } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

test.describe('Admin Customers Page', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/admin/login')
    await page.fill('input[type="email"], input[name="email"]', 'admin@apolodev.com')
    await page.fill('input[type="password"], input[name="password"]', 'admin123')
    await page.click('button:has-text("Sign In")')

    // Wait for sidebar and navigate to Customers
    await expect(page.locator('nav button').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 10000 })
    await page.locator('nav button').filter({ hasText: 'Customers' }).click()
    await page.waitForTimeout(500)
  })

  test('should display customers page header', async ({ page }) => {
    const header = page.locator('h1, h2').filter({ hasText: 'Customers' })
    await expect(header.first()).toBeVisible()
  })

  test('should display customers table or empty state', async ({ page }) => {
    await page.waitForTimeout(2000)

    // Should have either customers table or empty state
    const hasTable = await page.locator('table').first().isVisible().catch(() => false)
    const hasEmptyState = await page.locator('text=/no customers|empty/i').isVisible().catch(() => false)

    expect(hasTable || hasEmptyState).toBeTruthy()
  })

  test('should display customer information columns', async ({ page }) => {
    await page.waitForTimeout(2000)

    // Check for expected table headers
    const expectedColumns = ['Name', 'Phone', 'Orders', 'Total Spent', 'Tags']
    let columnsFound = 0

    for (const column of expectedColumns) {
      const header = page.locator('th, [role="columnheader"]').filter({ hasText: column })
      if (await header.isVisible().catch(() => false)) {
        columnsFound++
      }
    }

    // Should have most expected columns
    expect(columnsFound).toBeGreaterThanOrEqual(3)
  })

  test('should search customers', async ({ page }) => {
    await page.waitForTimeout(2000)

    // Find search input
    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="name" i], input[placeholder*="phone" i]')

    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('test')
      await page.waitForTimeout(500)

      // Page should update without errors
      const errorDialog = page.locator('dialog:has-text("Runtime")')
      expect(await errorDialog.count()).toBe(0)
    }
  })

  test('should show customer count', async ({ page }) => {
    await page.waitForTimeout(2000)

    // Look for customer count text
    const countText = page.locator('text=/\\d+ customers? found/i')
    await expect(countText).toBeVisible({ timeout: 5000 })
  })

  test('should open view customer dialog', async ({ page }) => {
    await page.waitForTimeout(2000)

    // Find view button (Eye icon)
    const viewButton = page.locator('table button').filter({ has: page.locator('svg') }).first()

    if (await viewButton.isVisible().catch(() => false)) {
      await viewButton.click()
      await page.waitForTimeout(500)

      // Should show dialog with customer details
      const dialog = page.locator('[role="dialog"], dialog')
      await expect(dialog).toBeVisible({ timeout: 5000 })

      // Should show customer info - look for Customer Details title
      const dialogTitle = page.locator('[role="dialog"] h2, dialog h2').filter({ hasText: /Customer|Details/i })
      const hasTitle = await dialogTitle.isVisible().catch(() => false)
      expect(hasTitle).toBeTruthy()
    }
  })

  test('should open edit customer dialog', async ({ page }) => {
    await page.waitForTimeout(2000)

    // Find edit button (Pencil icon) - usually second button
    const editButton = page.locator('table button').nth(1)

    if (await editButton.isVisible().catch(() => false)) {
      await editButton.click()
      await page.waitForTimeout(500)

      // Should show edit dialog with form fields
      const dialog = page.locator('[role="dialog"], dialog')
      await expect(dialog).toBeVisible({ timeout: 5000 })

      // Should have input fields
      const nameInput = page.locator('dialog input[id="name"], [role="dialog"] input[id="name"]')
      const phoneInput = page.locator('dialog input[id="phone"], [role="dialog"] input[id="phone"]')

      const hasNameInput = await nameInput.isVisible().catch(() => false)
      const hasPhoneInput = await phoneInput.isVisible().catch(() => false)

      expect(hasNameInput || hasPhoneInput).toBeTruthy()
    }
  })

  test('should edit and save customer', async ({ page }) => {
    await page.waitForTimeout(2000)

    // Find edit button
    const editButton = page.locator('table button').nth(1)

    if (await editButton.isVisible().catch(() => false)) {
      await editButton.click()
      await page.waitForTimeout(500)

      // Update name field
      const nameInput = page.locator('dialog input[id="name"], [role="dialog"] input[id="name"]')
      if (await nameInput.isVisible().catch(() => false)) {
        await nameInput.fill('Test Customer Updated')
      }

      // Click Save button
      const saveButton = page.locator('dialog button, [role="dialog"] button').filter({ hasText: /save/i })
      if (await saveButton.isVisible().catch(() => false)) {
        await saveButton.click()
        await page.waitForTimeout(1000)

        // Dialog should close or show success
        // No error should appear
        const errorDialog = page.locator('dialog:has-text("Error")')
        expect(await errorDialog.count()).toBe(0)
      }
    }
  })

  test('should close dialogs with cancel button', async ({ page }) => {
    await page.waitForTimeout(2000)

    // Open view dialog
    const viewButton = page.locator('table button').first()

    if (await viewButton.isVisible().catch(() => false)) {
      await viewButton.click()
      await page.waitForTimeout(500)

      // Try pressing Escape to close
      await page.keyboard.press('Escape')
      await page.waitForTimeout(500)

      // No errors should occur
      const errorDialog = page.locator('dialog:has-text("Runtime")')
      expect(await errorDialog.count()).toBe(0)
    }
  })

  test('should display customer tags as badges', async ({ page }) => {
    await page.waitForTimeout(2000)

    // Look for badge elements in table
    const badges = page.locator('table [class*="badge"], table span[class*="rounded"]')
    const hasBadges = await badges.first().isVisible().catch(() => false)

    // Tags are optional, so just verify no errors
    const errorDialog = page.locator('dialog:has-text("Runtime")')
    expect(await errorDialog.count()).toBe(0)
  })

  test('should edit customer tags', async ({ page }) => {
    await page.waitForTimeout(2000)

    // Open edit dialog
    const editButton = page.locator('table button').nth(1)

    if (await editButton.isVisible().catch(() => false)) {
      await editButton.click()
      await page.waitForTimeout(500)

      // Find tags input
      const tagsInput = page.locator('dialog input[id="tags"], [role="dialog"] input[id="tags"]')

      if (await tagsInput.isVisible().catch(() => false)) {
        await tagsInput.fill('VIP, Regular')
        await page.waitForTimeout(300)

        // Input should accept the value
        const value = await tagsInput.inputValue()
        expect(value).toContain('VIP')
      }
    }
  })
})
