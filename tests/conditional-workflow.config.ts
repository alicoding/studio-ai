/**
 * Configuration for Conditional Workflow E2E Tests
 *
 * SOLID: Single responsibility - test configuration only
 * DRY: Centralized test configuration
 * KISS: Simple configuration structure
 */

export const ConditionalWorkflowTestConfig = {
  // Test timeouts
  TEST_TIMEOUT: 60000, // 1 minute per test
  WORKFLOW_EXECUTION_TIMEOUT: 30000, // 30 seconds for workflow execution
  PAGE_LOAD_TIMEOUT: 10000, // 10 seconds for page loads

  // Test environment
  MOCK_MODE_ENABLED: true,
  API_BASE_URL: 'http://localhost:3456/api',
  UI_BASE_URL: 'http://localhost:5175',

  // Test data
  DEFAULT_AGENT_ROLE: 'developer',

  // Performance expectations
  MAX_WORKFLOW_EXECUTION_TIME: 15000, // Mock mode should be fast
  MAX_PAGE_LOAD_TIME: 5000,

  // Retry configuration
  MAX_RETRIES: 2,
  RETRY_DELAY: 1000,

  // Screenshot configuration
  TAKE_SCREENSHOTS_ON_FAILURE: true,
  SCREENSHOT_PATH: 'tests/screenshots/',

  // Test conditions for validation
  VALID_CONDITIONS: [
    '{step1.output} === "success"',
    'parseInt({input.output}) > 5',
    '{design.output}.includes("API")',
    'true',
    'false',
  ],

  INVALID_CONDITIONS: [
    '{step1.output} === undefined syntax error',
    'invalid javascript',
    '{nonexistent.output}',
  ],
} as const

export type ConditionalWorkflowTestConfigType = typeof ConditionalWorkflowTestConfig
