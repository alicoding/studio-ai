/**
 * Test Utilities and Helpers for Playwright E2E Tests
 *
 * SOLID: Single responsibility - test utilities only
 * DRY: Reusable test patterns and assertions
 * KISS: Simple, focused helper functions
 * Library-First: Uses Playwright's built-in capabilities
 */

import { Page, expect } from '@playwright/test'

/**
 * Test data attributes for reliable element selection
 * Follows the pattern of using data-testid for test-specific selectors
 */
export const TestSelectors = {
  // Workflow Builder
  WORKFLOW_BUILDER: '[data-testid="workflow-builder"]',
  NODE_PALETTE: '[data-testid="node-palette"]',
  WORKFLOW_CANVAS: '.react-flow__viewport',

  // Node Templates
  CONDITIONAL_NODE_TEMPLATE: '[data-testid="conditional-node-template"]',
  TASK_NODE_TEMPLATE: '[data-testid="task-node-template"]',
  LOOP_NODE_TEMPLATE: '[data-testid="loop-node-template"]',

  // Node Elements
  NODE_SETTINGS: '[data-testid="node-settings"]',
  CONDITION_DISPLAY: '[data-testid="condition-display"]',
  COMPLETED_STEP: '[data-testid="completed-step"]',

  // Workflow Status
  WORKFLOW_STATUS: '[data-testid="workflow-status"]',
  EXECUTION_PROGRESS: '[data-testid="execution-progress"]',

  // Common UI Elements
  SAVE_BUTTON: 'button:has-text("Save")',
  EXECUTE_BUTTON: 'button:has-text("Execute")',
  CANCEL_BUTTON: 'button:has-text("Cancel")',
} as const

/**
 * Common test assertions for workflow functionality
 */
export class WorkflowTestAssertions {
  constructor(private page: Page) {}

  /**
   * Assert that a workflow node exists and is visible
   */
  async assertNodeExists(nodeId: string) {
    const node = this.page.locator(`[data-id="${nodeId}"]`)
    await expect(node).toBeVisible()
  }

  /**
   * Assert that an edge connection exists between two nodes
   */
  async assertEdgeExists(sourceId: string, targetId: string) {
    const edge = this.page.locator(`[data-testid="edge-${sourceId}-${targetId}"]`)
    await expect(edge).toBeVisible()
  }

  /**
   * Assert workflow execution completed successfully
   */
  async assertWorkflowCompleted() {
    await expect(
      this.page
        .locator('text=Workflow completed')
        .or(this.page.locator('[data-testid="workflow-status"]:has-text("completed")'))
    ).toBeVisible({ timeout: 30000 })
  }

  /**
   * Assert workflow execution failed
   */
  async assertWorkflowFailed() {
    await expect(
      this.page
        .locator('text=Workflow failed')
        .or(this.page.locator('[data-testid="workflow-status"]:has-text("failed")'))
    ).toBeVisible({ timeout: 30000 })
  }

  /**
   * Assert specific steps were executed
   */
  async assertStepsExecuted(stepIds: string[]) {
    for (const stepId of stepIds) {
      const stepElement = this.page.locator(
        `[data-testid="completed-step"][data-step-id="${stepId}"]`
      )
      await expect(stepElement).toBeVisible()
    }
  }

  /**
   * Assert specific steps were NOT executed
   */
  async assertStepsNotExecuted(stepIds: string[]) {
    for (const stepId of stepIds) {
      const stepElement = this.page.locator(
        `[data-testid="completed-step"][data-step-id="${stepId}"]`
      )
      await expect(stepElement).not.toBeVisible()
    }
  }

  /**
   * Assert conditional node has correct condition text
   */
  async assertConditionalNodeCondition(nodeId: string, expectedCondition: string) {
    const node = this.page.locator(`[data-id="${nodeId}"]`)
    const conditionText = await node.locator(TestSelectors.CONDITION_DISPLAY).textContent()
    expect(conditionText).toContain(expectedCondition)
  }

  /**
   * Assert mock mode is active (for testing environment verification)
   */
  async assertMockModeActive() {
    await expect(
      this.page
        .locator('text=Mock Mode')
        .or(this.page.locator('[data-testid="mock-mode-indicator"]'))
    ).toBeVisible({ timeout: 5000 })
  }
}

/**
 * Test data factory for creating consistent test workflows
 */
export class WorkflowTestDataFactory {
  /**
   * Create a simple conditional workflow for true branch testing
   */
  static createTrueBranchWorkflow() {
    return {
      name: 'True Branch Test Workflow',
      description: 'Tests conditional true branch execution',
      steps: [
        {
          id: 'step1',
          type: 'task' as const,
          role: 'developer',
          task: 'Return the word "success"',
          deps: [],
        },
        {
          id: 'conditional1',
          type: 'conditional' as const,
          task: 'Check if step1 returned success',
          condition: '{step1.output} === "success"',
          trueBranch: 'step2',
          falseBranch: 'step3',
          deps: ['step1'],
        },
        {
          id: 'step2',
          type: 'task' as const,
          role: 'developer',
          task: 'Execute TRUE branch - Say "Condition was true!"',
          deps: ['conditional1'],
        },
        {
          id: 'step3',
          type: 'task' as const,
          role: 'developer',
          task: 'Execute FALSE branch - Say "Condition was false!"',
          deps: ['conditional1'],
        },
      ],
    }
  }

  /**
   * Create a simple conditional workflow for false branch testing
   */
  static createFalseBranchWorkflow() {
    return {
      name: 'False Branch Test Workflow',
      description: 'Tests conditional false branch execution',
      steps: [
        {
          id: 'step1',
          type: 'task' as const,
          role: 'developer',
          task: 'Return the word "failure"',
          deps: [],
        },
        {
          id: 'conditional1',
          type: 'conditional' as const,
          task: 'Check if step1 returned success',
          condition: '{step1.output} === "success"',
          trueBranch: 'step2',
          falseBranch: 'step3',
          deps: ['step1'],
        },
        {
          id: 'step2',
          type: 'task' as const,
          role: 'developer',
          task: 'Execute TRUE branch - Say "Condition was true!"',
          deps: ['conditional1'],
        },
        {
          id: 'step3',
          type: 'task' as const,
          role: 'developer',
          task: 'Execute FALSE branch - Say "Condition was false!"',
          deps: ['conditional1'],
        },
      ],
    }
  }

  /**
   * Create a complex conditional workflow with multiple branches
   */
  static createComplexConditionalWorkflow() {
    return {
      name: 'Complex Conditional Test Workflow',
      description: 'Tests complex conditional branching with multiple conditions',
      steps: [
        {
          id: 'input',
          type: 'task' as const,
          role: 'developer',
          task: 'Return a random number between 1-10',
          deps: [],
        },
        {
          id: 'condition1',
          type: 'conditional' as const,
          task: 'Check if number is greater than 5',
          condition: 'parseInt({input.output}) > 5',
          trueBranch: 'high_path',
          falseBranch: 'low_path',
          deps: ['input'],
        },
        {
          id: 'condition2',
          type: 'conditional' as const,
          task: 'Check if number is even',
          condition: 'parseInt({input.output}) % 2 === 0',
          trueBranch: 'even_path',
          falseBranch: 'odd_path',
          deps: ['input'],
        },
        {
          id: 'high_path',
          type: 'task' as const,
          role: 'developer',
          task: 'Number is high (>5)',
          deps: ['condition1'],
        },
        {
          id: 'low_path',
          type: 'task' as const,
          role: 'developer',
          task: 'Number is low (<=5)',
          deps: ['condition1'],
        },
        {
          id: 'even_path',
          type: 'task' as const,
          role: 'developer',
          task: 'Number is even',
          deps: ['condition2'],
        },
        {
          id: 'odd_path',
          type: 'task' as const,
          role: 'developer',
          task: 'Number is odd',
          deps: ['condition2'],
        },
      ],
    }
  }
}

/**
 * Common test setup and teardown utilities
 */
export class TestSetupUtils {
  /**
   * Setup test environment with mock mode and clean state
   */
  static async setupTestEnvironment(page: Page) {
    // Enable mock mode
    await page.addInitScript(() => {
      window.localStorage.setItem('USE_MOCK_AI', 'true')
    })

    // Clear any existing workflow state
    await page.addInitScript(() => {
      window.localStorage.removeItem('workflow-builder-state')
    })

    // Set up error monitoring
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    return { errors }
  }

  /**
   * Wait for page to be fully loaded and interactive
   */
  static async waitForPageReady(page: Page) {
    await page.waitForLoadState('networkidle')
    await page.waitForFunction(() => document.readyState === 'complete')
  }

  /**
   * Take a screenshot for debugging failed tests
   */
  static async takeDebugScreenshot(page: Page, testName: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `tests/screenshots/debug-${testName}-${timestamp}.png`
    await page.screenshot({ path: filename, fullPage: true })
    console.log(`Debug screenshot saved: ${filename}`)
  }
}

/**
 * Performance testing utilities
 */
export class PerformanceTestUtils {
  /**
   * Measure the time taken for a workflow execution
   */
  static async measureWorkflowExecution(
    page: Page,
    executionFn: () => Promise<void>
  ): Promise<number> {
    const startTime = Date.now()
    await executionFn()
    return Date.now() - startTime
  }

  /**
   * Assert that execution completed within expected time
   */
  static assertExecutionTime(actualTime: number, expectedMaxTime: number) {
    expect(actualTime).toBeLessThan(expectedMaxTime)
  }
}
