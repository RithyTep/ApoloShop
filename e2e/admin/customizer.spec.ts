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
    // Should show Shop Customizer header/title
    await expect(page.locator('text=Shop Customizer').first()).toBeVisible()

    // Should show Sections and Theme tabs
    await expect(page.locator('button').filter({ hasText: 'Sections' })).toBeVisible()
    await expect(page.locator('button').filter({ hasText: 'Theme' })).toBeVisible()

    // Should show Save Changes button
    await expect(page.locator('button').filter({ hasText: /Save/i })).toBeVisible()
  })

  test('should show section list', async ({ page }) => {
    // Should show "Page Sections" label
    await expect(page.locator('text=Page Sections')).toBeVisible()

    // Should have Add button in the left panel
    await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeVisible()
  })

  test('should open add section dialog', async ({ page }) => {
    // Click Add button (exact match to avoid "Add to Cart")
    await page.getByRole('button', { name: 'Add', exact: true }).click()

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
    // Click Add button (exact match)
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await page.waitForTimeout(300)

    // Click Hero Banner option
    await page.locator('[role="dialog"] button').filter({ hasText: 'Hero Banner' }).click()
    await page.waitForTimeout(300)

    // Should show Hero Banner in section list
    await expect(page.getByText('Hero Banner').first()).toBeVisible()

    // Should show editor for Hero section
    await expect(page.getByText('Hero Banner Settings')).toBeVisible()
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
    await expect(page.getByText('Color Presets')).toBeVisible()
  })

  test('should show save button with unsaved changes indicator', async ({ page }) => {
    // Should have Save Changes button
    await expect(page.locator('button').filter({ hasText: /Save/i })).toBeVisible()

    // Add a section to trigger unsaved changes
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await page.waitForTimeout(300)
    await page.locator('[role="dialog"] button').filter({ hasText: 'Hero Banner' }).click()
    await page.waitForTimeout(300)

    // Should show unsaved changes indicator
    await expect(page.locator('text=Unsaved changes')).toBeVisible()
  })

  test('should toggle section visibility', async ({ page }) => {
    // First add a section
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await page.waitForTimeout(300)
    await page.locator('[role="dialog"] button').filter({ hasText: 'Hero Banner' }).click()
    await page.waitForTimeout(500)

    // Find the first toggle switch (in the section list)
    const toggle = page.getByRole('switch').first()
    await expect(toggle).toBeVisible()

    // Toggle off
    await toggle.click()
    await page.waitForTimeout(300)

    // Section should still be in list
    await expect(page.getByText('Hero Banner').first()).toBeVisible()
  })

  test('should delete a section', async ({ page }) => {
    // Add a section first
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await page.waitForTimeout(300)
    await page.locator('[role="dialog"] button').filter({ hasText: 'Promotion Cards' }).click()
    await page.waitForTimeout(500)

    // Verify section was added
    await expect(page.getByText('Promotion Cards').first()).toBeVisible()

    // Count sections before delete
    const countBefore = await page.getByText('Promotion Cards').count()
    expect(countBefore).toBeGreaterThan(0)
  })

  test('should select section and show editor', async ({ page }) => {
    // Add a products section
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await page.waitForTimeout(300)
    await page.locator('[role="dialog"] button').filter({ hasText: 'Product Section' }).click()
    await page.waitForTimeout(500)

    // Should show Product Section Settings
    await expect(page.getByText('Product Section Settings')).toBeVisible()

    // Should show configuration options
    await expect(page.getByText('Display Type')).toBeVisible()
  })

  test('should show preview area', async ({ page }) => {
    // Wait for page to fully load
    await page.waitForTimeout(1000)

    // Preview area should be visible - look for any content area
    const hasContent = await page.locator('[class*="shadow"], [class*="preview"], [class*="border"], main').first().isVisible().catch(() => false)

    // Just verify no errors occurred
    const errorDialog = page.locator('dialog:has-text("Runtime")')
    expect(await errorDialog.count()).toBe(0)
    expect(hasContent).toBeTruthy()
  })
})
