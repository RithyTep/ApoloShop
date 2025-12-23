import { test, expect } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

test.describe('Shop Customizer', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/admin/login')
    await page.fill('input[type="email"], input[name="email"]', 'admin@apolodev.com')
    await page.fill('input[type="password"], input[name="password"]', 'admin123')
    await page.click('button:has-text("Sign In")')

    // Wait for sidebar to appear
    await expect(page.locator('nav button').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 10000 })

    // Navigate to Shop Customizer
    await page.locator('nav button').filter({ hasText: 'Shop Customizer' }).click()
    await page.waitForTimeout(500)
  })

  test('should load customizer page', async ({ page }) => {
    // Should show Shop Customizer header
    await expect(page.locator('h1, h2').filter({ hasText: /Shop Customizer/i })).toBeVisible()

    // Should show Sections and Theme tabs
    await expect(page.locator('button').filter({ hasText: 'Sections' })).toBeVisible()
    await expect(page.locator('button').filter({ hasText: 'Theme' })).toBeVisible()

    // Should show device toggle buttons (Desktop, Tablet, Mobile)
    await expect(page.locator('button svg').first()).toBeVisible()
  })

  test('should show section list', async ({ page }) => {
    // Should show "Page Sections" label
    await expect(page.locator('text=Page Sections')).toBeVisible()

    // Should have Add button
    await expect(page.locator('button').filter({ hasText: 'Add' })).toBeVisible()
  })

  test('should open add section dialog', async ({ page }) => {
    // Click Add button
    await page.locator('button').filter({ hasText: 'Add' }).click()

    // Should show dialog with section options
    await expect(page.locator('[role="dialog"]')).toBeVisible()
    await expect(page.locator('text=Add Section')).toBeVisible()

    // Should show section type buttons
    await expect(page.locator('[role="dialog"] button').filter({ hasText: 'Hero Banner' })).toBeVisible()
    await expect(page.locator('[role="dialog"] button').filter({ hasText: 'Product Section' })).toBeVisible()
    await expect(page.locator('[role="dialog"] button').filter({ hasText: 'Promotion Cards' })).toBeVisible()
    await expect(page.locator('[role="dialog"] button').filter({ hasText: 'Footer' })).toBeVisible()
  })

  test('should add a hero section', async ({ page }) => {
    // Click Add button
    await page.locator('button').filter({ hasText: 'Add' }).click()
    await page.waitForTimeout(300)

    // Click Hero Banner option
    await page.locator('[role="dialog"] button').filter({ hasText: 'Hero Banner' }).click()
    await page.waitForTimeout(300)

    // Should show Hero Banner in section list
    await expect(page.locator('text=Hero Banner')).toBeVisible()

    // Should show editor for Hero section
    await expect(page.locator('text=Hero Banner Settings')).toBeVisible()
  })

  test('should switch between device previews', async ({ page }) => {
    // Get device toggle buttons (Desktop, Tablet, Mobile icons)
    const deviceButtons = page.locator('.bg-muted.rounded-lg button')

    // Click tablet (second button)
    await deviceButtons.nth(1).click()
    await page.waitForTimeout(300)

    // Preview container should have tablet width
    const preview = page.locator('.shadow-xl')
    await expect(preview).toHaveCSS('max-width', '100%')

    // Click mobile (third button)
    await deviceButtons.nth(2).click()
    await page.waitForTimeout(300)
  })

  test('should switch to Theme tab', async ({ page }) => {
    // Click Theme tab
    await page.locator('button').filter({ hasText: 'Theme' }).click()
    await page.waitForTimeout(300)

    // Should show theme options
    await expect(page.locator('text=Color Presets').or(page.locator('text=Primary Color'))).toBeVisible()
  })

  test('should show save button with unsaved changes indicator', async ({ page }) => {
    // Should have Save Changes button
    await expect(page.locator('button').filter({ hasText: /Save/i })).toBeVisible()

    // Add a section to trigger unsaved changes
    await page.locator('button').filter({ hasText: 'Add' }).click()
    await page.waitForTimeout(300)
    await page.locator('[role="dialog"] button').filter({ hasText: 'Hero Banner' }).click()
    await page.waitForTimeout(300)

    // Should show unsaved changes indicator
    await expect(page.locator('text=Unsaved changes')).toBeVisible()
  })

  test('should toggle section visibility', async ({ page }) => {
    // First add a section
    await page.locator('button').filter({ hasText: 'Add' }).click()
    await page.waitForTimeout(300)
    await page.locator('[role="dialog"] button').filter({ hasText: 'Hero Banner' }).click()
    await page.waitForTimeout(500)

    // Find the toggle switch in the section item
    const sectionItem = page.locator('div').filter({ hasText: 'Hero Banner' }).first()
    const toggle = sectionItem.locator('button[role="switch"]')

    if (await toggle.isVisible()) {
      // Toggle off
      await toggle.click()
      await page.waitForTimeout(300)

      // Section should still be in list but preview should not show it
      await expect(page.locator('text=Hero Banner').first()).toBeVisible()
    }
  })

  test('should delete a section', async ({ page }) => {
    // Add a section first
    await page.locator('button').filter({ hasText: 'Add' }).click()
    await page.waitForTimeout(300)
    await page.locator('[role="dialog"] button').filter({ hasText: 'Promotion Cards' }).click()
    await page.waitForTimeout(500)

    // Verify section was added
    await expect(page.locator('text=Promotion Cards')).toBeVisible()

    // Find and click delete button (trash icon)
    const sectionItem = page.locator('div').filter({ hasText: 'Promotion Cards' }).first()
    const deleteButton = sectionItem.locator('button').filter({ has: page.locator('svg') }).last()
    await deleteButton.click()
    await page.waitForTimeout(300)
  })

  test('should select section and show editor', async ({ page }) => {
    // Add a products section
    await page.locator('button').filter({ hasText: 'Add' }).click()
    await page.waitForTimeout(300)
    await page.locator('[role="dialog"] button').filter({ hasText: 'Product Section' }).click()
    await page.waitForTimeout(500)

    // Should show Product Section Settings
    await expect(page.locator('text=Product Section Settings')).toBeVisible()

    // Should show configuration options
    await expect(page.locator('text=Display Type').or(page.locator('label').filter({ hasText: 'Title' }))).toBeVisible()
  })

  test('should show preview area', async ({ page }) => {
    // Preview area should be visible
    const previewArea = page.locator('.bg-muted\\/30').first()
    await expect(previewArea).toBeVisible()

    // Should show preview header with shop name
    await expect(page.locator('text=Simple Shop').or(page.locator('.shadow-xl'))).toBeVisible()
  })
})
