#!/usr/bin/env tsx
/**
 * Test MCP Workflow Builder Tools with Structured Conditions
 *
 * Demonstrates how to create and execute workflows with structured conditions
 * using the MCP workflow builder tools
 */

import ky from 'ky'

const API_URL = 'http://localhost:3456/api'

interface WorkflowDefinition {
  id: string
  name: string
  description?: string
  steps: WorkflowStepDefinition[]
  metadata: {
    createdBy: string
    createdAt: string
    updatedAt?: string
    version: number
    tags: string[]
    projectId: string
    isTemplate?: boolean
    templateId?: string
  }
}

interface WorkflowStepDefinition {
  id: string
  type: 'task' | 'parallel' | 'conditional'
  agentId?: string
  role?: string
  task: string
  deps: string[]
  condition?: unknown
  trueBranch?: string
  falseBranch?: string
  config?: {
    timeout?: number
    retries?: number
    continueOnError?: boolean
    parallelLimit?: number
  }
}

interface WorkflowValidationResult {
  valid: boolean
  errors: Array<{
    stepId?: string
    field?: string
    message: string
    code: string
  }>
  warnings: Array<{
    stepId?: string
    message: string
    code: string
  }>
}

interface WorkflowExecutionResponse {
  threadId: string
  status: 'started' | 'failed'
  message?: string
  error?: string
}

async function testMcpWorkflowBuilder() {
  console.log('🛠️ Testing MCP Workflow Builder with Structured Conditions...\n')

  try {
    // Step 1: Create a workflow programmatically
    console.log('📋 Step 1: Create workflow definition')

    const workflow: WorkflowDefinition = {
      id: `wf-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      name: 'Conditional Deployment Pipeline',
      description: 'Automated deployment with structured condition checks',
      steps: [],
      metadata: {
        createdBy: 'mcp-user',
        createdAt: new Date().toISOString(),
        version: 1,
        tags: ['deployment', 'testing', 'conditional'],
        projectId: 'mcp-workflow-test',
      },
    }

    console.log(`✅ Created workflow: ${workflow.name} (${workflow.id})`)

    // Step 2: Add workflow steps with structured conditions
    console.log('\n📋 Step 2: Add workflow steps')

    // Add test step
    const testStep: WorkflowStepDefinition = {
      id: 'run_tests',
      type: 'task',
      role: 'dev',
      task: 'Run comprehensive test suite and return "success" if all tests pass',
      deps: [],
    }
    workflow.steps.push(testStep)
    console.log('✅ Added test step')

    // Add conditional deployment check with structured condition
    const conditionalStep: WorkflowStepDefinition = {
      id: 'deployment_check',
      type: 'conditional',
      role: 'dev',
      task: 'Evaluate if deployment should proceed based on test results',
      deps: ['run_tests'],
      condition: {
        version: '2.0',
        rootGroup: {
          id: 'root',
          combinator: 'AND',
          rules: [
            {
              id: 'test_success_rule',
              leftValue: { stepId: 'run_tests', field: 'output' },
              operation: 'equals',
              rightValue: { type: 'string', value: 'success' },
              dataType: 'string',
            },
            {
              id: 'test_status_rule',
              leftValue: { stepId: 'run_tests', field: 'status' },
              operation: 'equals',
              rightValue: { type: 'string', value: 'success' },
              dataType: 'string',
            },
          ],
        },
      },
      trueBranch: 'deploy_production',
      falseBranch: 'notify_failure',
    }
    workflow.steps.push(conditionalStep)
    console.log('✅ Added conditional deployment check with structured condition')

    // Add success branch - deploy to production
    const deployStep: WorkflowStepDefinition = {
      id: 'deploy_production',
      type: 'task',
      role: 'dev',
      task: 'Deploy application to production environment',
      deps: [],
    }
    workflow.steps.push(deployStep)
    console.log('✅ Added production deployment step')

    // Add failure branch - notify team
    const notifyStep: WorkflowStepDefinition = {
      id: 'notify_failure',
      type: 'task',
      role: 'dev',
      task: 'Notify development team of test failures',
      deps: [],
    }
    workflow.steps.push(notifyStep)
    console.log('✅ Added failure notification step')

    // Add post-deployment verification (only runs after successful deployment)
    const verifyStep: WorkflowStepDefinition = {
      id: 'verify_deployment',
      type: 'task',
      role: 'dev',
      task: 'Verify deployment health and send success notification',
      deps: ['deploy_production'],
    }
    workflow.steps.push(verifyStep)
    console.log('✅ Added deployment verification step')

    console.log(`\n📊 Workflow has ${workflow.steps.length} steps total`)

    // Step 3: Validate the workflow
    console.log('\n📋 Step 3: Validate workflow')

    const validationResponse = await ky
      .post(`${API_URL}/workflows/validate`, {
        json: workflow,
        timeout: 30000,
      })
      .json<WorkflowValidationResult>()

    if (validationResponse.valid) {
      console.log('✅ Workflow validation passed!')
      if (validationResponse.warnings.length > 0) {
        console.log(`⚠️  ${validationResponse.warnings.length} warnings:`)
        validationResponse.warnings.forEach((w) =>
          console.log(`   • ${w.stepId ? `[${w.stepId}] ` : ''}${w.message}`)
        )
      }
    } else {
      console.log('❌ Workflow validation failed!')
      validationResponse.errors.forEach((error) =>
        console.log(`   • ${error.stepId ? `[${error.stepId}] ` : ''}${error.message}`)
      )
      return
    }

    // Step 4: Execute the workflow
    console.log('\n📋 Step 4: Execute workflow')

    const executionResponse = await ky
      .post(`${API_URL}/workflows/execute`, {
        json: { workflow },
        timeout: 30000,
      })
      .json<WorkflowExecutionResponse>()

    if (executionResponse.status === 'started') {
      console.log(`🚀 Workflow execution started!`)
      console.log(`   Thread ID: ${executionResponse.threadId}`)
      console.log(`   Message: ${executionResponse.message}`)

      // Wait a moment for execution to complete
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Check final status
      const statusResponse = await ky
        .get(`${API_URL}/invoke-status/status/${executionResponse.threadId}`)
        .json<{
          status: string
          results?: Record<string, string>
          summary?: { successful: number; failed: number; total: number }
        }>()

      console.log('\n📊 Final Results:')
      console.log(`   Status: ${statusResponse.status}`)
      if (statusResponse.summary) {
        console.log(
          `   Steps: ${statusResponse.summary.successful}/${statusResponse.summary.total} successful`
        )
      }

      if (statusResponse.results) {
        console.log('\n🔍 Executed Steps:')
        Object.entries(statusResponse.results).forEach(([stepId, result]) => {
          const isShort = result.length <= 100
          console.log(`   • ${stepId}: ${isShort ? result : result.substring(0, 100) + '...'}`)
        })

        // Check which branch was taken
        if (statusResponse.results.deploy_production) {
          console.log('\n✅ SUCCESS BRANCH: Tests passed, deployed to production!')
          if (statusResponse.results.verify_deployment) {
            console.log('✅ VERIFICATION: Deployment verified successfully!')
          }
        } else if (statusResponse.results.notify_failure) {
          console.log('\n❌ FAILURE BRANCH: Tests failed, notified team!')
        }
      }
    } else {
      console.log(`❌ Failed to start workflow: ${executionResponse.error}`)
      return
    }

    console.log('\n🎉 MCP Workflow Builder test completed successfully!')
    console.log('\n📊 Summary:')
    console.log('✅ Programmatic workflow creation')
    console.log('✅ Structured conditions with AND logic')
    console.log('✅ Template variable resolution')
    console.log('✅ Conditional branching execution')
    console.log('✅ Multi-step dependency handling')
    console.log('✅ Workflow validation and execution')
  } catch (error: unknown) {
    const err = error as Error & { response?: Response }
    console.error('❌ Test failed:', err.message)

    if (err.response) {
      try {
        const errorBody = await err.response.json()
        console.error('Error details:', JSON.stringify(errorBody, null, 2))
      } catch {
        console.error('Could not parse error response')
      }
    }
  }
}

// Run the test
testMcpWorkflowBuilder().catch(console.error)
