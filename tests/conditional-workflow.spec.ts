/**
 * Comprehensive Playwright E2E Tests for Conditional Workflow Functionality
 *
 * Tests the complete conditional workflow feature including:
 * - Creating conditional workflows in the UI
 * - Setting condition expressions
 * - Connecting true/false branches
 * - Executing workflows with both branches
 * - UI state persistence and validation
 *
 * SOLID: Single responsibility - tests conditional workflows only
 * DRY: Reuses test utilities and patterns
 * KISS: Clear test structure and assertions
 */

import { test, expect, Page } from '@playwright/test'
import type { WorkflowStepDefinition } from '../web/server/schemas/workflow-builder'

// Test configuration
const TEST_TIMEOUT = 60000 // 1 minute per test
const WORKFLOW_EXECUTION_TIMEOUT = 30000 // 30 seconds for workflow execution

// Page Object Model for Workflow Builder
class WorkflowBuilderPage {
  constructor(private page: Page) {}

  // Navigation
  async navigateToWorkflowBuilder() {
    await this.page.goto('/workflows/new')
    await this.page.waitForSelector('[data-testid="workflow-builder"]', { timeout: 10000 })
  }

  // Node Palette Interactions
  async dragConditionalNodeToCanvas() {
    const palette = this.page.locator('[data-testid="node-palette"]')
    const conditionalNode = palette.locator('[data-testid="conditional-node-template"]')

    // Get the bounding box for more precise positioning
    const nodeBox = await conditionalNode.boundingBox()
    const canvas = this.page.locator('.react-flow__viewport')
    const canvasBox = await canvas.boundingBox()

    if (nodeBox && canvasBox) {
      // Start the drag from the center of the conditional node
      await this.page.mouse.move(nodeBox.x + nodeBox.width / 2, nodeBox.y + nodeBox.height / 2)
      await this.page.mouse.down()

      // Move to canvas center
      await this.page.mouse.move(canvasBox.x + 400, canvasBox.y + 300)
      await this.page.mouse.up()

      // Wait for the node to be added
      await this.page.waitForTimeout(500)
    }
  }

  async dragTaskNodeToCanvas(position: { x: number; y: number }) {
    const palette = this.page.locator('[data-testid="node-palette"]')
    const taskNode = palette.locator('[data-testid*="node-template"]').first()

    // Get the bounding box for more precise positioning
    const taskNodeBox = await taskNode.boundingBox()
    const canvas = this.page.locator('.react-flow__viewport')
    const canvasBox = await canvas.boundingBox()

    if (taskNodeBox && canvasBox) {
      // Start the drag from the center of the task node
      await this.page.mouse.move(
        taskNodeBox.x + taskNodeBox.width / 2,
        taskNodeBox.y + taskNodeBox.height / 2
      )
      await this.page.mouse.down()

      // Move to the target position on canvas
      await this.page.mouse.move(canvasBox.x + position.x, canvasBox.y + position.y)
      await this.page.mouse.up()

      // Wait for the node to be added
      await this.page.waitForTimeout(500)
    }
  }

  // Node Configuration
  async setConditionalNodeCondition(nodeId: string, condition: string) {
    const node = this.page.locator(`[data-id="${nodeId}"]`)
    await node.click()

    // Click to edit condition
    await node.locator('text=Click to set condition...').click()

    // Enter condition
    await node.locator('input[placeholder="Enter condition..."]').fill(condition)

    // Save condition
    await node.locator('button:has-text("Save")').click()
  }

  async setTaskNodeDetails(nodeId: string, task: string, role: string = 'developer') {
    const node = this.page.locator(`[data-id="${nodeId}"]`)
    await node.click()

    // Open settings
    await node.locator('[data-testid="node-settings"]').click()

    // Fill task details
    await this.page.locator('textarea[placeholder="Enter task description..."]').fill(task)
    await this.page.locator('select[name="role"]').selectOption(role)

    // Save
    await this.page.locator('button:has-text("Save")').click()
  }

  // Edge Connections
  async connectNodes(sourceNodeId: string, targetNodeId: string, sourceHandle?: string) {
    const sourceNode = this.page.locator(`[data-id="${sourceNodeId}"]`)
    const targetNode = this.page.locator(`[data-id="${targetNodeId}"]`)

    // Find the correct handle
    const sourceHandle_locator = sourceHandle
      ? sourceNode.locator(`[data-handleid="${sourceHandle}"]`)
      : sourceNode.locator('.react-flow__handle-right').first()

    const targetHandle = targetNode.locator('.react-flow__handle-left').first()

    // Create connection by dragging from source to target
    await sourceHandle_locator.dragTo(targetHandle)
  }

  // Workflow Actions
  async saveWorkflow(name: string = 'Test Conditional Workflow') {
    await this.page.locator('button:has-text("Save")').click()

    // Fill workflow name if modal appears
    const nameInput = this.page.locator('input[placeholder="Enter workflow name..."]')
    if (await nameInput.isVisible()) {
      await nameInput.fill(name)
      await this.page.locator('button:has-text("Save Workflow")').click()
    }
  }

  async executeWorkflow() {
    await this.page.locator('button:has-text("Execute")').click()
  }

  // Validation
  async waitForWorkflowExecution() {
    // Wait for execution to start
    await expect(this.page.locator('text=Workflow started')).toBeVisible({ timeout: 5000 })

    // Wait for completion indicator
    await expect(
      this.page.locator('text=Workflow completed').or(this.page.locator('text=Workflow failed'))
    ).toBeVisible({ timeout: WORKFLOW_EXECUTION_TIMEOUT })
  }

  async getWorkflowStatus() {
    const statusElement = this.page.locator('[data-testid="workflow-status"]')
    return await statusElement.textContent()
  }

  async getExecutedSteps(): Promise<string[]> {
    const completedSteps = this.page.locator('[data-testid="completed-step"]')
    const stepIds = await completedSteps.evaluateAll((elements) =>
      elements.map((el) => el.getAttribute('data-step-id')).filter(Boolean)
    )
    return stepIds as string[]
  }

  // Node State Verification
  async verifyConditionalNodeState(nodeId: string, expectedCondition: string) {
    const node = this.page.locator(`[data-id="${nodeId}"]`)
    const conditionText = await node.locator('[data-testid="condition-display"]').textContent()
    expect(conditionText).toContain(expectedCondition)
  }

  async verifyNodeConnections(nodeId: string, expectedConnections: string[]) {
    // Verify edges exist in the graph
    for (const targetId of expectedConnections) {
      const edge = this.page.locator(`[data-testid="edge-${nodeId}-${targetId}"]`)
      await expect(edge).toBeVisible()
    }
  }
}

// Test Setup and Utilities
test.beforeEach(async ({ page }) => {
  // Ensure mock mode is enabled for consistent testing
  await page.addInitScript(() => {
    window.localStorage.setItem('USE_MOCK_AI', 'true')
  })
})

test.describe('Conditional Workflow E2E Tests', () => {
  test('Create conditional workflow with true branch execution', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const workflowBuilder = new WorkflowBuilderPage(page)

    // Step 1: Navigate to workflow builder
    await workflowBuilder.navigateToWorkflowBuilder()

    // Step 2: Create workflow structure
    // Add initial task node
    await workflowBuilder.dragTaskNodeToCanvas({ x: 200, y: 200 })
    await workflowBuilder.setTaskNodeDetails('step1', 'Return the word "success"', 'developer')

    // Add conditional node
    await workflowBuilder.dragConditionalNodeToCanvas()
    await workflowBuilder.setConditionalNodeCondition(
      'conditional1',
      '{step1.output} === "success"'
    )

    // Add true branch task
    await workflowBuilder.dragTaskNodeToCanvas({ x: 600, y: 200 })
    await workflowBuilder.setTaskNodeDetails(
      'step2',
      'Execute TRUE branch - Say "Condition was true!"',
      'developer'
    )

    // Add false branch task
    await workflowBuilder.dragTaskNodeToCanvas({ x: 600, y: 400 })
    await workflowBuilder.setTaskNodeDetails(
      'step3',
      'Execute FALSE branch - Say "Condition was false!"',
      'developer'
    )

    // Step 3: Connect nodes
    await workflowBuilder.connectNodes('step1', 'conditional1')
    await workflowBuilder.connectNodes('conditional1', 'step2', 'true')
    await workflowBuilder.connectNodes('conditional1', 'step3', 'false')

    // Step 4: Verify UI state before execution
    await workflowBuilder.verifyConditionalNodeState('conditional1', '{step1.output} === "success"')
    await workflowBuilder.verifyNodeConnections('conditional1', ['step2', 'step3'])

    // Step 5: Save workflow
    await workflowBuilder.saveWorkflow('Test True Branch Workflow')

    // Step 6: Execute workflow
    await workflowBuilder.executeWorkflow()
    await workflowBuilder.waitForWorkflowExecution()

    // Step 7: Verify execution results
    const executedSteps = await workflowBuilder.getExecutedSteps()
    expect(executedSteps).toContain('step1')
    expect(executedSteps).toContain('conditional1')
    expect(executedSteps).toContain('step2') // True branch should execute
    expect(executedSteps).not.toContain('step3') // False branch should not execute

    // Step 8: Verify workflow completed successfully
    const status = await workflowBuilder.getWorkflowStatus()
    expect(status).toContain('completed')
  })

  test('Create conditional workflow with false branch execution', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const workflowBuilder = new WorkflowBuilderPage(page)

    // Step 1: Navigate to workflow builder
    await workflowBuilder.navigateToWorkflowBuilder()

    // Step 2: Create workflow structure with false condition
    await workflowBuilder.dragTaskNodeToCanvas({ x: 200, y: 200 })
    await workflowBuilder.setTaskNodeDetails('step1', 'Return the word "failure"', 'developer')

    await workflowBuilder.dragConditionalNodeToCanvas()
    await workflowBuilder.setConditionalNodeCondition(
      'conditional1',
      '{step1.output} === "success"'
    )

    await workflowBuilder.dragTaskNodeToCanvas({ x: 600, y: 200 })
    await workflowBuilder.setTaskNodeDetails(
      'step2',
      'Execute TRUE branch - Say "Condition was true!"',
      'developer'
    )

    await workflowBuilder.dragTaskNodeToCanvas({ x: 600, y: 400 })
    await workflowBuilder.setTaskNodeDetails(
      'step3',
      'Execute FALSE branch - Say "Condition was false!"',
      'developer'
    )

    // Step 3: Connect nodes
    await workflowBuilder.connectNodes('step1', 'conditional1')
    await workflowBuilder.connectNodes('conditional1', 'step2', 'true')
    await workflowBuilder.connectNodes('conditional1', 'step3', 'false')

    // Step 4: Save and execute
    await workflowBuilder.saveWorkflow('Test False Branch Workflow')
    await workflowBuilder.executeWorkflow()
    await workflowBuilder.waitForWorkflowExecution()

    // Step 5: Verify false branch execution
    const executedSteps = await workflowBuilder.getExecutedSteps()
    expect(executedSteps).toContain('step1')
    expect(executedSteps).toContain('conditional1')
    expect(executedSteps).not.toContain('step2') // True branch should not execute
    expect(executedSteps).toContain('step3') // False branch should execute
  })

  test('Workflow state persistence after page reload', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const workflowBuilder = new WorkflowBuilderPage(page)

    // Step 1: Create and save workflow
    await workflowBuilder.navigateToWorkflowBuilder()

    await workflowBuilder.dragTaskNodeToCanvas({ x: 200, y: 200 })
    await workflowBuilder.setTaskNodeDetails('step1', 'Initial task', 'developer')

    await workflowBuilder.dragConditionalNodeToCanvas()
    await workflowBuilder.setConditionalNodeCondition('conditional1', '{step1.output} === "test"')

    await workflowBuilder.connectNodes('step1', 'conditional1')
    await workflowBuilder.saveWorkflow('Persistence Test Workflow')

    // Step 2: Reload page
    await page.reload()
    await page.waitForSelector('[data-testid="workflow-builder"]', { timeout: 10000 })

    // Step 3: Verify state persisted
    await workflowBuilder.verifyConditionalNodeState('conditional1', '{step1.output} === "test"')
    await workflowBuilder.verifyNodeConnections('step1', ['conditional1'])

    // Step 4: Verify workflow can still be edited
    await workflowBuilder.setConditionalNodeCondition(
      'conditional1',
      '{step1.output} === "updated"'
    )
    await workflowBuilder.verifyConditionalNodeState('conditional1', '{step1.output} === "updated"')
  })

  test('Template variable resolution in conditions', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const workflowBuilder = new WorkflowBuilderPage(page)

    // Step 1: Create workflow with complex template variables
    await workflowBuilder.navigateToWorkflowBuilder()

    // First task
    await workflowBuilder.dragTaskNodeToCanvas({ x: 100, y: 100 })
    await workflowBuilder.setTaskNodeDetails('design', 'Design a REST API', 'architect')

    // Second task
    await workflowBuilder.dragTaskNodeToCanvas({ x: 100, y: 300 })
    await workflowBuilder.setTaskNodeDetails('implement', 'Implement {design.output}', 'developer')

    // Conditional with multiple variables
    await workflowBuilder.dragConditionalNodeToCanvas()
    await workflowBuilder.setConditionalNodeCondition(
      'conditional1',
      '{design.output}.includes("API") && {implement.output}.includes("success")'
    )

    // True branch
    await workflowBuilder.dragTaskNodeToCanvas({ x: 600, y: 200 })
    await workflowBuilder.setTaskNodeDetails('deploy', 'Deploy the API', 'developer')

    // False branch
    await workflowBuilder.dragTaskNodeToCanvas({ x: 600, y: 400 })
    await workflowBuilder.setTaskNodeDetails('debug', 'Debug the implementation', 'developer')

    // Step 2: Connect with dependencies
    await workflowBuilder.connectNodes('design', 'implement')
    await workflowBuilder.connectNodes('implement', 'conditional1')
    await workflowBuilder.connectNodes('conditional1', 'deploy', 'true')
    await workflowBuilder.connectNodes('conditional1', 'debug', 'false')

    // Step 3: Verify condition with template variables
    await workflowBuilder.verifyConditionalNodeState(
      'conditional1',
      '{design.output}.includes("API") && {implement.output}.includes("success")'
    )

    // Step 4: Execute and verify template resolution works
    await workflowBuilder.saveWorkflow('Template Variable Test')
    await workflowBuilder.executeWorkflow()
    await workflowBuilder.waitForWorkflowExecution()

    // Should execute successfully without template errors
    const status = await workflowBuilder.getWorkflowStatus()
    expect(status).not.toContain('failed')
  })

  test('Error handling for invalid conditions', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const workflowBuilder = new WorkflowBuilderPage(page)

    // Step 1: Create workflow with invalid condition
    await workflowBuilder.navigateToWorkflowBuilder()

    await workflowBuilder.dragTaskNodeToCanvas({ x: 200, y: 200 })
    await workflowBuilder.setTaskNodeDetails('step1', 'Test task', 'developer')

    await workflowBuilder.dragConditionalNodeToCanvas()

    // Set invalid JavaScript condition
    await workflowBuilder.setConditionalNodeCondition(
      'conditional1',
      '{step1.output} === undefined syntax error'
    )

    // Step 2: Try to save - should show validation error
    await workflowBuilder.saveWorkflow('Invalid Condition Test')

    // Step 3: Verify error message appears
    await expect(page.locator('text=Invalid condition')).toBeVisible({ timeout: 5000 })

    // Step 4: Fix condition and verify it works
    await workflowBuilder.setConditionalNodeCondition('conditional1', '{step1.output} === "valid"')
    await workflowBuilder.saveWorkflow('Fixed Condition Test')

    // Should save successfully now
    await expect(page.locator('text=Workflow saved')).toBeVisible({ timeout: 5000 })
  })

  test('Complex conditional workflow with multiple branches', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT * 2) // Longer timeout for complex workflow

    const workflowBuilder = new WorkflowBuilderPage(page)

    // Step 1: Create complex branching workflow
    await workflowBuilder.navigateToWorkflowBuilder()

    // Initial task
    await workflowBuilder.dragTaskNodeToCanvas({ x: 100, y: 200 })
    await workflowBuilder.setTaskNodeDetails(
      'input',
      'Return a random number between 1-10',
      'developer'
    )

    // First conditional (check if > 5)
    await workflowBuilder.dragConditionalNodeToCanvas()
    await workflowBuilder.setConditionalNodeCondition('condition1', 'parseInt({input.output}) > 5')

    // Second conditional (check if even)
    await workflowBuilder.dragConditionalNodeToCanvas()
    await workflowBuilder.setConditionalNodeCondition(
      'condition2',
      'parseInt({input.output}) % 2 === 0'
    )

    // Various outcome tasks
    await workflowBuilder.dragTaskNodeToCanvas({ x: 700, y: 100 })
    await workflowBuilder.setTaskNodeDetails('high_even', 'Number is high and even', 'developer')

    await workflowBuilder.dragTaskNodeToCanvas({ x: 700, y: 200 })
    await workflowBuilder.setTaskNodeDetails('high_odd', 'Number is high and odd', 'developer')

    await workflowBuilder.dragTaskNodeToCanvas({ x: 700, y: 300 })
    await workflowBuilder.setTaskNodeDetails('low_even', 'Number is low and even', 'developer')

    await workflowBuilder.dragTaskNodeToCanvas({ x: 700, y: 400 })
    await workflowBuilder.setTaskNodeDetails('low_odd', 'Number is low and odd', 'developer')

    // Step 2: Connect the complex logic
    await workflowBuilder.connectNodes('input', 'condition1')
    await workflowBuilder.connectNodes('input', 'condition2')

    // Note: This creates a more complex flow that tests the conditional system
    // The actual connections would depend on the UI's ability to handle complex branching

    // Step 3: Save and verify the structure is maintained
    await workflowBuilder.saveWorkflow('Complex Conditional Test')

    // Step 4: Reload and verify persistence
    await page.reload()
    await page.waitForSelector('[data-testid="workflow-builder"]', { timeout: 10000 })

    // Verify conditions persisted
    await workflowBuilder.verifyConditionalNodeState('condition1', 'parseInt({input.output}) > 5')
    await workflowBuilder.verifyConditionalNodeState(
      'condition2',
      'parseInt({input.output}) % 2 === 0'
    )
  })

  test('Conditional workflow performance with mock AI', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const workflowBuilder = new WorkflowBuilderPage(page)

    // Step 1: Verify mock mode is active
    await workflowBuilder.navigateToWorkflowBuilder()

    // Check for mock mode indicator in UI
    await expect(page.locator('text=Mock Mode')).toBeVisible({ timeout: 5000 })

    // Step 2: Create simple conditional workflow
    await workflowBuilder.dragTaskNodeToCanvas({ x: 200, y: 200 })
    await workflowBuilder.setTaskNodeDetails('step1', 'Quick test', 'developer')

    await workflowBuilder.dragConditionalNodeToCanvas()
    await workflowBuilder.setConditionalNodeCondition(
      'conditional1',
      '{step1.output} === "success"'
    )

    await workflowBuilder.dragTaskNodeToCanvas({ x: 600, y: 200 })
    await workflowBuilder.setTaskNodeDetails('step2', 'Success path', 'developer')

    await workflowBuilder.connectNodes('step1', 'conditional1')
    await workflowBuilder.connectNodes('conditional1', 'step2', 'true')

    // Step 3: Measure execution time
    const startTime = Date.now()

    await workflowBuilder.saveWorkflow('Performance Test')
    await workflowBuilder.executeWorkflow()
    await workflowBuilder.waitForWorkflowExecution()

    const executionTime = Date.now() - startTime

    // Step 4: Verify reasonable performance (mock should be fast)
    expect(executionTime).toBeLessThan(15000) // Should complete within 15 seconds

    // Step 5: Verify execution completed successfully
    const status = await workflowBuilder.getWorkflowStatus()
    expect(status).toContain('completed')
  })
})

// Test Data Validation
test.describe('Conditional Workflow Data Validation', () => {
  test('Validate workflow definition structure', async ({ page }) => {
    const workflowBuilder = new WorkflowBuilderPage(page)

    await workflowBuilder.navigateToWorkflowBuilder()

    // Create minimal conditional workflow
    await workflowBuilder.dragTaskNodeToCanvas({ x: 200, y: 200 })
    await workflowBuilder.setTaskNodeDetails('step1', 'Test', 'developer')

    await workflowBuilder.dragConditionalNodeToCanvas()
    await workflowBuilder.setConditionalNodeCondition('conditional1', 'true')

    await workflowBuilder.connectNodes('step1', 'conditional1')

    // Save and verify structure
    await workflowBuilder.saveWorkflow('Structure Validation Test')

    // Check that the saved workflow has proper structure
    const workflowData = await page.evaluate(() => {
      return window.localStorage.getItem('workflow-builder-state')
    })

    expect(workflowData).toBeTruthy()

    const parsed = JSON.parse(workflowData as string)
    expect(parsed.workflow).toBeTruthy()
    expect(parsed.workflow.steps).toBeInstanceOf(Array)

    // Find conditional step
    const conditionalStep = parsed.workflow.steps.find(
      (step: WorkflowStepDefinition) => step.type === 'conditional'
    )
    expect(conditionalStep).toBeTruthy()
    expect(conditionalStep.condition).toBe('true')
  })
})
