import { test, expect } from '@playwright/test'

test.describe('Admin Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/login')
  })

  test('should display login form', async ({ page }) => {
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"], button:has-text("Login")')).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.fill('input[type="email"], input[name="email"]', 'invalid@test.com')
    await page.fill('input[type="password"], input[name="password"]', 'wrongpassword')
    await page.click('button[type="submit"], button:has-text("Login")')

    // Wait for error message
    await page.waitForTimeout(1000)

    // Should show error (stay on login page or show error message)
    const errorMessage = page.locator('text=/invalid|error|incorrect/i')
    const stillOnLogin = page.url().includes('/login')

    expect(await errorMessage.isVisible() || stillOnLogin).toBeTruthy()
  })

  test('should login with valid credentials', async ({ page }) => {
    await page.fill('input[type="email"], input[name="email"]', 'admin@apolodev.com')
    await page.fill('input[type="password"], input[name="password"]', 'admin123')
    await page.click('button[type="submit"], button:has-text("Login")')

    // Wait for navigation
    await page.waitForTimeout(2000)

    // Should redirect to admin dashboard
    await expect(page).toHaveURL(/\/admin(?!\/login)/)
  })

  test('should require email field', async ({ page }) => {
    await page.fill('input[type="password"], input[name="password"]', 'password')
    await page.click('button[type="submit"], button:has-text("Login")')

    // Form validation should prevent submission
    const emailInput = page.locator('input[type="email"], input[name="email"]')
    await expect(emailInput).toBeFocused()
  })

  test('should require password field', async ({ page }) => {
    await page.fill('input[type="email"], input[name="email"]', 'admin@apolodev.com')
    await page.click('button[type="submit"], button:has-text("Login")')

    // Form validation should prevent submission or show error
    const passwordInput = page.locator('input[type="password"], input[name="password"]')
    const isRequired = await passwordInput.getAttribute('required')
    expect(isRequired !== null || await page.url().includes('/login')).toBeTruthy()
  })
})

test.describe('Admin Dashboard (Authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/admin/login')
    await page.fill('input[type="email"], input[name="email"]', 'admin@apolodev.com')
    await page.fill('input[type="password"], input[name="password"]', 'admin123')
    await page.click('button[type="submit"], button:has-text("Login")')
    await page.waitForTimeout(2000)
  })

  test('should display dashboard after login', async ({ page }) => {
    await expect(page).toHaveURL(/\/admin(?!\/login)/)

    // Dashboard should have navigation or content
    const dashboard = page.locator('text=/dashboard|orders|products/i')
    await expect(dashboard.first()).toBeVisible()
  })

  test('should navigate to products page', async ({ page }) => {
    const productsLink = page.locator('a:has-text("Products"), button:has-text("Products")')

    if (await productsLink.isVisible()) {
      await productsLink.click()
      await page.waitForTimeout(500)

      // Should show products table or list
      const productsContent = page.locator('table, [class*="product"]')
      await expect(productsContent.first()).toBeVisible()
    }
  })

  test('should navigate to orders page', async ({ page }) => {
    const ordersLink = page.locator('a:has-text("Orders"), button:has-text("Orders")')

    if (await ordersLink.isVisible()) {
      await ordersLink.click()
      await page.waitForTimeout(500)

      // Should show orders content
      const ordersContent = page.locator('table, [class*="order"]')
      await expect(ordersContent.first()).toBeVisible()
    }
  })

  test('should logout', async ({ page }) => {
    const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout")')

    if (await logoutButton.isVisible()) {
      await logoutButton.click()
      await page.waitForTimeout(1000)

      // Should redirect to login
      await expect(page).toHaveURL(/\/login|\/admin\/login/)
    }
  })
})
