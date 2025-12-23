import { test, expect } from '@playwright/test'

// Run tests serially to avoid auth state conflicts
test.describe.configure({ mode: 'serial' })

// All admin sidebar tabs with possible header variations
const adminTabs = [
  { name: 'Dashboard', headers: ['Dashboard'] },
  { name: 'Orders', headers: ['Orders'] },
  { name: 'Products', headers: ['Products'] },
  { name: 'Categories', headers: ['Categories'] },
  { name: 'Customers', headers: ['Customers'] },
  { name: 'Inventory', headers: ['Inventory'] },
  { name: 'Payments', headers: ['Payments', 'Payment Methods'] },
  { name: 'Promotions', headers: ['Promotions'] },
  { name: 'Content', headers: ['Content', 'CMS'] },
  { name: 'Shop Customizer', headers: ['Shop Customizer', 'Customizer'] },
  { name: 'Users', headers: ['Users', 'User'] },
  { name: 'Reports', headers: ['Reports'] },
  { name: 'Settings', headers: ['Settings'] },
]

test.describe('Admin All Pages', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/admin/login')
    await page.fill('input[type="email"], input[name="email"]', 'admin@apolodev.com')
    await page.fill('input[type="password"], input[name="password"]', 'admin123')
    await page.click('button:has-text("Sign In")')

    // Wait for sidebar to appear (indicates successful login)
    await expect(page.locator('nav button').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 10000 })
  })

  // Generate a test for each tab
  for (const tab of adminTabs) {
    test(`should load ${tab.name} page without errors`, async ({ page }) => {
      // Click on the tab in sidebar
      const tabButton = page.locator('nav button').filter({ hasText: tab.name })
      await tabButton.click()
      await page.waitForTimeout(500)

      // Should show page header (check any of the possible headers)
      let headerFound = false
      for (const headerText of tab.headers) {
        const header = page.locator('h1, h2, h3').filter({ hasText: headerText })
        if (await header.first().isVisible({ timeout: 2000 }).catch(() => false)) {
          headerFound = true
          break
        }
      }
      expect(headerFound).toBeTruthy()

      // Should NOT show runtime error dialog
      const errorDialog = page.locator('dialog:has-text("Runtime"), [role="dialog"]:has-text("Error")')
      expect(await errorDialog.count()).toBe(0)

      // Page should have content (table, cards, or form)
      const hasContent = await page.locator('table, [class*="card"], form, [class*="grid"]').first().isVisible({ timeout: 5000 }).catch(() => false)
      const hasEmptyState = await page.locator('text=/no .* found|empty|no data/i').isVisible().catch(() => false)

      expect(hasContent || hasEmptyState).toBeTruthy()
    })
  }

  test('should navigate between all tabs without errors', async ({ page }) => {
    // Navigate through all tabs quickly
    for (const tab of adminTabs) {
      const tabButton = page.locator('nav button').filter({ hasText: tab.name })
      await tabButton.click()
      await page.waitForTimeout(300)

      // Verify no error dialog appears
      const errorDialog = page.locator('dialog:has-text("Runtime")')
      expect(await errorDialog.count()).toBe(0)
    }

    // Should still be on admin page
    expect(page.url()).toContain('/admin')
  })
})
