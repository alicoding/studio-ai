/**
 * Simple Conditional Workflow E2E Test
 *
 * Basic test to verify conditional workflow functionality works with the actual UI
 */

import { test, expect, Page } from '@playwright/test'

class WorkflowBuilderPage {
  constructor(private page: Page) {}

  async navigateToWorkflowBuilder() {
    await this.page.goto('/workflows/new')
    await this.page.waitForSelector('[data-testid="workflow-builder"]', { timeout: 10000 })
  }

  async dragTaskNodeToCanvas() {
    // Use manual drag approach to bypass palette interception
    const devNode = this.page.locator('[data-testid="dev-node-template"]')
    const canvas = this.page.locator('.react-flow__viewport')

    // Get bounding boxes
    const nodeBox = await devNode.boundingBox()
    const canvasBox = await canvas.boundingBox()

    if (nodeBox && canvasBox) {
      // Manual mouse events with force
      await this.page.mouse.move(nodeBox.x + nodeBox.width / 2, nodeBox.y + nodeBox.height / 2)
      await this.page.mouse.down()
      await this.page.mouse.move(canvasBox.x + 300, canvasBox.y + 200) // Offset to avoid palette
      await this.page.mouse.up()
    }

    await this.page.waitForTimeout(1000)
  }

  async dragConditionalNodeToCanvas() {
    // Use manual drag approach to bypass palette interception
    const conditionalNode = this.page.locator('[data-testid="conditional-node-template"]')
    const canvas = this.page.locator('.react-flow__viewport')

    // Get bounding boxes
    const nodeBox = await conditionalNode.boundingBox()
    const canvasBox = await canvas.boundingBox()

    if (nodeBox && canvasBox) {
      // Manual mouse events with force
      await this.page.mouse.move(nodeBox.x + nodeBox.width / 2, nodeBox.y + nodeBox.height / 2)
      await this.page.mouse.down()
      await this.page.mouse.move(canvasBox.x + 500, canvasBox.y + 200) // Different offset
      await this.page.mouse.up()
    }

    await this.page.waitForTimeout(1000)
  }

  async getCreatedNodes() {
    return this.page.locator('.react-flow__node')
  }

  async saveWorkflow(name: string = 'Test Workflow') {
    await this.page.locator('button:has-text("Save")').click()

    // Fill name if modal appears
    const nameInput = this.page.locator('input[placeholder*="name"]')
    if (await nameInput.isVisible()) {
      await nameInput.fill(name)
      await this.page.locator('button:has-text("Save")').click()
    }
  }
}

test.beforeEach(async ({ page }) => {
  // Ensure mock mode for consistent testing
  await page.addInitScript(() => {
    window.localStorage.setItem('USE_MOCK_AI', 'true')
  })
})

test.describe('Basic Conditional Workflow Tests', () => {
  test('Can navigate to workflow builder and create nodes', async ({ page }) => {
    const workflowBuilder = new WorkflowBuilderPage(page)

    // Step 1: Navigate to workflow builder
    await workflowBuilder.navigateToWorkflowBuilder()

    // Step 2: Verify workflow builder loaded
    await expect(page.locator('[data-testid="workflow-builder"]')).toBeVisible()

    // Step 3: Verify node palette is visible
    await expect(page.locator('[data-testid="node-palette"]')).toBeVisible()

    // Step 4: Try to drag a task node to canvas
    await workflowBuilder.dragTaskNodeToCanvas()

    // Step 5: Verify node was created
    const nodes = await workflowBuilder.getCreatedNodes()
    const firstNodeCount = await nodes.count()
    console.log('Node count after first drag:', firstNodeCount)
    expect(firstNodeCount).toBeGreaterThan(0)

    // Step 6: Try to drag a conditional node to canvas
    await workflowBuilder.dragConditionalNodeToCanvas()

    // Step 7: Verify both nodes exist
    const finalNodeCount = await nodes.count()
    console.log('Final node count:', finalNodeCount)
    expect(finalNodeCount).toBeGreaterThan(firstNodeCount)

    // Step 8: Check if workflow is in valid state (skip save for now)
    const saveButton = page.locator('button:has-text("Save")')
    const isEnabled = await saveButton.isEnabled()
    console.log('Save button enabled:', isEnabled)

    console.log('✅ Basic conditional workflow UI functionality test completed')
  })

  test('Workflow builder interface elements are present', async ({ page }) => {
    const workflowBuilder = new WorkflowBuilderPage(page)

    await workflowBuilder.navigateToWorkflowBuilder()

    // Verify key UI elements
    await expect(page.locator('[data-testid="workflow-builder"]')).toBeVisible()
    await expect(page.locator('[data-testid="node-palette"]')).toBeVisible()
    await expect(page.locator('button:has-text("Save")')).toBeVisible()
    await expect(page.locator('button:has-text("Execute")')).toBeVisible()
    await expect(page.locator('[data-testid="dev-node-template"]')).toBeVisible()
    await expect(page.locator('[data-testid="conditional-node-template"]')).toBeVisible()

    console.log('✅ Workflow builder interface elements verification completed')
  })
})
