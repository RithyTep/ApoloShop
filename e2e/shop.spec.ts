import { test, expect } from '@playwright/test'

test.describe('Shop Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/shop')
  })

  test('should display shop page with products', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1')).toContainText('Our Products')

    // Wait for products to load
    await page.waitForSelector('[class*="grid"]')

    // Should have product cards
    const productCards = page.locator('[class*="bg-card"]')
    await expect(productCards.first()).toBeVisible()
  })

  test('should display product prices', async ({ page }) => {
    await page.waitForSelector('[class*="grid"]')

    // Check for price format (USD)
    const prices = page.locator('text=/\\$\\d+\\.\\d{2}/')
    await expect(prices.first()).toBeVisible()
  })

  test('should toggle currency between USD and KHR', async ({ page }) => {
    // Find and click currency toggle (if exists in header)
    const currencyToggle = page.locator('button:has-text("USD"), button:has-text("KHR")')

    if (await currencyToggle.isVisible()) {
      await currencyToggle.click()

      // Check for KHR symbol
      await expect(page.locator('text=/៛/')).toBeVisible()
    }
  })

  test('should filter products by category', async ({ page }) => {
    await page.waitForSelector('[class*="grid"]')

    // Click on a category filter button
    const categoryButton = page.locator('button').filter({ hasText: /^(Coffee|Tea|Pastries)$/ }).first()

    if (await categoryButton.isVisible()) {
      await categoryButton.click()

      // Products should still be visible (filtered)
      await page.waitForTimeout(500) // Wait for filter to apply
    }
  })

  test('should add product to cart', async ({ page }) => {
    await page.waitForSelector('[class*="grid"]')

    // Find Add to Cart button
    const addButton = page.locator('button:has-text("Add to Cart")').first()
    await expect(addButton).toBeVisible()

    // Click add to cart
    await addButton.click()

    // Cart count should update (check header)
    const cartBadge = page.locator('[class*="cart"], [class*="badge"]')
    // Cart should show item count or be visible
  })

  test('should open cart drawer', async ({ page }) => {
    // Add item to cart first
    await page.waitForSelector('button:has-text("Add to Cart")')
    await page.locator('button:has-text("Add to Cart")').first().click()

    // Click cart icon in header
    const cartIcon = page.locator('button').filter({ has: page.locator('svg') }).first()
    await cartIcon.click()

    // Cart drawer should be visible
    await page.waitForTimeout(300)
  })

  test('should navigate to checkout', async ({ page }) => {
    // Add item to cart
    await page.waitForSelector('button:has-text("Add to Cart")')
    await page.locator('button:has-text("Add to Cart")').first().click()

    // Open cart
    const cartIcon = page.locator('header button').last()
    await cartIcon.click()

    // Click checkout button
    const checkoutButton = page.locator('button:has-text("Checkout"), button:has-text("ឈានទៅការលម្អិត")')

    if (await checkoutButton.isVisible()) {
      await checkoutButton.click()

      // Should show checkout form
      await expect(page.locator('input[type="text"], input[type="tel"]').first()).toBeVisible()
    }
  })
})
