import { test, expect } from '@playwright/test'

// Run tests serially to avoid auth state conflicts
test.describe.configure({ mode: 'serial' })

test.describe('Admin Products Page', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/admin/login')
    await page.fill('input[type="email"], input[name="email"]', 'admin@apolodev.com')
    await page.fill('input[type="password"], input[name="password"]', 'admin123')
    await page.click('button:has-text("Sign In")')

    // Wait for sidebar to appear (indicates successful login)
    await expect(page.locator('nav button').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 10000 })

    // Navigate to products
    const productsButton = page.locator('nav button').filter({ hasText: 'Products' })
    await productsButton.click()
    await page.waitForTimeout(500)
  })

  test('should navigate to products tab without errors', async ({ page }) => {
    // Should show products page header
    const header = page.locator('h1').filter({ hasText: 'Products' })
    await expect(header).toBeVisible({ timeout: 10000 })

    // Should show products content (table or "No products found")
    const hasTable = await page.locator('table').isVisible()
    const hasEmptyState = await page.locator('text="No products found"').isVisible()

    expect(hasTable || hasEmptyState).toBeTruthy()
  })

  test('should display products table or list', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(1000)

    // Check for table or empty state
    const hasTable = await page.locator('table').isVisible()
    const hasEmptyState = await page.locator('text="No products found"').isVisible()

    expect(hasTable || hasEmptyState).toBeTruthy()
  })

  test('should have add product button', async ({ page }) => {
    // Look for "Add Product" button
    const addButton = page.locator('button').filter({ hasText: 'Add Product' })
    await expect(addButton).toBeVisible({ timeout: 10000 })
  })
})
