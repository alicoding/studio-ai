import { test, expect } from '@playwright/test'

test.describe('UI Visual Check', () => {
  test('home page layout and CSS', async ({ page }) => {
    await page.goto('/')

    // Check header is visible
    const header = page.locator('nav')
    await expect(header).toBeVisible()

    // Check sidebar is visible
    const sidebar = page.locator('aside')
    await expect(sidebar).toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/home.png', fullPage: true })

    // Check for CSS errors - no elements should have broken styles
    const brokenElements = await page.locator('.undefined, .null').count()
    expect(brokenElements).toBe(0)
  })

  test('agents page layout and CSS', async ({ page }) => {
    await page.goto('/agents')

    // Check page header
    const header = page.locator('h1:has-text("Agent Configurations")')
    await expect(header).toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/agents.png', fullPage: true })

    // Check grid layout exists
    const grid = page.locator('.grid')
    await expect(grid).toBeVisible()
  })

  test('teams page layout and CSS', async ({ page }) => {
    await page.goto('/teams')

    // Check page header
    const header = page.locator('h1:has-text("Team Templates")')
    await expect(header).toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/teams.png', fullPage: true })

    // Check grid layout exists
    const grid = page.locator('.grid')
    await expect(grid).toBeVisible()
  })

  test('modal functionality', async ({ page }) => {
    await page.goto('/')

    // Click settings button
    await page.locator('button[title="Settings"]').click()

    // Check modal is visible
    const modal = page.locator('.fixed.inset-0.z-50')
    await expect(modal).toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/modal.png', fullPage: true })

    // Close modal
    await page.keyboard.press('Escape')
    await expect(modal).not.toBeVisible()
  })

  test('check for console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await page.goto('/')
    await page.goto('/agents')
    await page.goto('/teams')

    expect(errors).toHaveLength(0)
  })
})
