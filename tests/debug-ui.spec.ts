/**
 * Debug UI Test - Check what elements are actually available
 */

import { test, expect } from '@playwright/test'

test('Debug UI elements on workflow builder page', async ({ page }) => {
  await page.goto('/workflows/new')
  await page.waitForSelector('[data-testid="workflow-builder"]', { timeout: 10000 })

  // Get all elements with data-testid
  const testIds = await page.evaluate(() => {
    const elements = document.querySelectorAll('[data-testid]')
    return Array.from(elements).map((el) => el.getAttribute('data-testid'))
  })

  console.log('Available data-testids:', testIds)

  // Check node palette specifically
  const paletteElements = await page.locator('[data-testid="node-palette"] *').all()
  console.log('Node palette children count:', paletteElements.length)

  // Check for any elements containing "template"
  const templateElements = await page.locator('[data-testid*="template"]').all()
  console.log('Template elements count:', templateElements.length)

  // Get all draggable elements
  const draggableElements = await page.locator('[draggable="true"]').all()
  console.log('Draggable elements count:', draggableElements.length)

  // Get the actual HTML of the node palette
  const paletteHTML = await page.locator('[data-testid="node-palette"]').innerHTML()
  console.log('Node palette HTML (first 500 chars):', paletteHTML.substring(0, 500))

  expect(testIds.length).toBeGreaterThan(0)
})
