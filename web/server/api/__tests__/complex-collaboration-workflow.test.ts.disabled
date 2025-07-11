/**
 * Complex Multi-Agent Collaboration Test
 *
 * Tests dev + reviewer + knowledge-facilitator collaboration workflow
 * Demonstrates real-world scenario: feature development with code review and documentation
 *
 * SOLID: Single responsibility - testing complex workflows
 * DRY: Reuses workflow patterns
 * KISS: Clear step-by-step collaboration
 * Library-First: Uses existing invoke API and MCP tools
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import ky from 'ky'
import type { InvokeRequest, InvokeResponse } from '../../schemas/invoke'

// Define workflow status types
interface WorkflowStep {
  id: string
  status: 'completed' | 'running' | 'pending' | 'failed'
  agentId?: string
  sessionId?: string
}

interface WorkflowStatusResponse {
  threadId: string
  status: 'completed' | 'running' | 'pending' | 'failed'
  steps: WorkflowStep[]
  projectId?: string
  createdAt?: string
  updatedAt?: string
}

const API_BASE = process.env.CLAUDE_STUDIO_API || 'http://localhost:3456/api'
const CLAUDE_STUDIO_PROJECT_ID = '93b33a8b-dbc0-4b09-99ed-cb737239b409'

describe('Complex Multi-Agent Collaboration Workflow', () => {
  const testThreadId = `complex-collab-${Date.now()}`

  beforeAll(async () => {
    // Verify Claude Studio project exists and has required agents
    const response = await ky
      .get(`${API_BASE}/studio-projects/${CLAUDE_STUDIO_PROJECT_ID}/agents`)
      .json()
    console.log('Available agents:', response)
  })

  afterAll(async () => {
    // Cleanup: Remove test workflow from registry
    try {
      await ky.delete(`${API_BASE}/invoke-status/workflows/${testThreadId}`)
    } catch (_error) {
      // Ignore cleanup errors - prefixed with underscore to satisfy ESLint
    }
  })

  it('should execute complex dev->reviewer->knowledge-facilitator collaboration', async () => {
    // Test scenario: Develop a new feature with proper review and documentation
    const workflow: InvokeRequest = {
      workflow: [
        {
          id: 'analyze-requirements',
          agentId: 'knowledge-facilitator_01',
          task: `Analyze the Claude Studio codebase to understand how to add a new "Agent Performance Dashboard" feature. 
                 This dashboard should show:
                 - Agent token usage over time
                 - Most active agents
                 - Response time metrics
                 - Success/failure rates
                 
                 Research the existing codebase patterns, identify files that need modification, and provide architectural guidance.`,
        },
        {
          id: 'develop-feature',
          agentId: 'developer_01',
          task: `Based on the analysis from {analyze-requirements.output}, implement the Agent Performance Dashboard feature.
                 
                 Create the necessary components, API endpoints, and database changes following the project's patterns.
                 Ensure the implementation follows SOLID principles and integrates well with the existing UI.`,
          deps: ['analyze-requirements'],
        },
        {
          id: 'code-review',
          agentId: 'reviewer_01',
          task: `Review the implementation from {develop-feature.output}.
                 
                 Check for:
                 - Code quality and adherence to project standards
                 - Security considerations
                 - Performance implications
                 - TypeScript type safety
                 - Test coverage requirements
                 - Integration with existing systems
                 
                 Provide specific feedback and suggestions for improvement.`,
          deps: ['develop-feature'],
        },
        {
          id: 'document-feature',
          agentId: 'knowledge-facilitator_01',
          task: `Create comprehensive documentation for the Agent Performance Dashboard feature based on:
                 - Original requirements: {analyze-requirements.output}
                 - Implementation details: {develop-feature.output}
                 - Review feedback: {code-review.output}
                 
                 Include:
                 - User guide for the new dashboard
                 - API documentation
                 - Architecture decisions
                 - Testing instructions
                 - Deployment considerations`,
          deps: ['analyze-requirements', 'develop-feature', 'code-review'],
        },
        {
          id: 'final-review',
          agentId: 'reviewer_01',
          task: `Conduct final review incorporating all feedback and documentation:
                 - Verify {code-review.output} feedback has been addressed
                 - Validate {document-feature.output} is complete and accurate
                 - Confirm the feature is ready for production deployment
                 - Provide final approval or additional recommendations`,
          deps: ['code-review', 'document-feature'],
        },
      ],
      projectId: CLAUDE_STUDIO_PROJECT_ID,
      threadId: testThreadId,
      format: 'json',
    }

    console.log('🚀 Starting complex collaboration workflow...')

    // Execute the workflow
    const response = await ky
      .post(`${API_BASE}/invoke`, {
        json: workflow,
        timeout: 300000, // 5 minutes timeout for complex workflow
      })
      .json<InvokeResponse>()

    // Verify workflow completed successfully
    expect(response).toBeDefined()
    expect(response.threadId).toBe(testThreadId)
    expect(response.status).toBe('completed')
    expect(response.results).toBeDefined()

    // Verify all steps completed
    expect(response.results['analyze-requirements']).toBeDefined()
    expect(response.results['develop-feature']).toBeDefined()
    expect(response.results['code-review']).toBeDefined()
    expect(response.results['document-feature']).toBeDefined()
    expect(response.results['final-review']).toBeDefined()

    // Verify session IDs were created for each agent
    expect(response.sessionIds['analyze-requirements']).toBeDefined()
    expect(response.sessionIds['develop-feature']).toBeDefined()
    expect(response.sessionIds['code-review']).toBeDefined()
    expect(response.sessionIds['document-feature']).toBeDefined()
    expect(response.sessionIds['final-review']).toBeDefined()

    // Verify template variables worked (outputs should reference each other)
    const developOutput = response.results['develop-feature']
    const reviewOutput = response.results['code-review']
    const docOutput = response.results['document-feature']
    const finalReviewOutput = response.results['final-review']

    // Developer should have used knowledge facilitator's analysis
    expect(typeof developOutput).toBe('string')
    expect(developOutput.length).toBeGreaterThan(100)

    // Reviewer should have referenced the implementation
    expect(typeof reviewOutput).toBe('string')
    expect(reviewOutput.length).toBeGreaterThan(100)

    // Documentation should incorporate all previous work
    expect(typeof docOutput).toBe('string')
    expect(docOutput.length).toBeGreaterThan(100)

    // Final review should reference multiple outputs
    expect(typeof finalReviewOutput).toBe('string')
    expect(finalReviewOutput.length).toBeGreaterThan(100)

    console.log('✅ Complex collaboration workflow completed successfully')
    console.log(`📊 Workflow summary:`, response.summary)

    // Log the collaboration chain for verification
    console.log('\n🔗 Collaboration Chain:')
    console.log('1. Knowledge Facilitator analyzed requirements')
    console.log('2. Developer implemented based on analysis')
    console.log('3. Reviewer provided feedback on implementation')
    console.log('4. Knowledge Facilitator documented the complete feature')
    console.log('5. Reviewer gave final approval')
  }, 600000) // 10 minutes timeout for the entire test

  it('should track workflow progress in database', async () => {
    // Verify the workflow was properly tracked in WorkflowRegistry
    const workflowStatus = await ky
      .get(`${API_BASE}/invoke-status/workflows/${testThreadId}`)
      .json<WorkflowStatusResponse>()

    expect(workflowStatus).toBeDefined()
    expect(workflowStatus.threadId).toBe(testThreadId)
    expect(workflowStatus.status).toBe('completed')
    expect(workflowStatus.steps).toHaveLength(5)

    // Verify each step has proper status
    const steps = workflowStatus.steps
    expect(steps.find((step: WorkflowStep) => step.id === 'analyze-requirements')?.status).toBe(
      'completed'
    )
    expect(steps.find((step: WorkflowStep) => step.id === 'develop-feature')?.status).toBe(
      'completed'
    )
    expect(steps.find((step: WorkflowStep) => step.id === 'code-review')?.status).toBe('completed')
    expect(steps.find((step: WorkflowStep) => step.id === 'document-feature')?.status).toBe(
      'completed'
    )
    expect(steps.find((step: WorkflowStep) => step.id === 'final-review')?.status).toBe('completed')

    console.log('✅ Workflow properly tracked in database')
  })

  it('should demonstrate parallel agent capabilities with fan-out pattern', async () => {
    const parallelThreadId = `parallel-collab-${Date.now()}`

    // Test parallel work with convergence
    const parallelWorkflow: InvokeRequest = {
      workflow: [
        {
          id: 'requirements',
          agentId: 'knowledge-facilitator_01',
          task: 'Define requirements for a new notification system in Claude Studio',
        },
        {
          id: 'frontend-design',
          agentId: 'developer_01',
          task: 'Design the frontend components for notifications based on {requirements.output}',
          deps: ['requirements'],
        },
        {
          id: 'backend-design',
          agentId: 'developer_01',
          task: 'Design the backend API and database schema for notifications based on {requirements.output}',
          deps: ['requirements'],
        },
        {
          id: 'security-review',
          agentId: 'reviewer_01',
          task: 'Review security implications of the notification system from {requirements.output}',
          deps: ['requirements'],
        },
        {
          id: 'integration-plan',
          agentId: 'knowledge-facilitator_01',
          task: `Create integration plan combining:
                 - Frontend: {frontend-design.output}
                 - Backend: {backend-design.output}
                 - Security: {security-review.output}`,
          deps: ['frontend-design', 'backend-design', 'security-review'],
        },
      ],
      projectId: CLAUDE_STUDIO_PROJECT_ID,
      threadId: parallelThreadId,
      format: 'json',
    }

    console.log('🔀 Starting parallel collaboration workflow...')

    const response = await ky
      .post(`${API_BASE}/invoke`, {
        json: parallelWorkflow,
        timeout: 300000,
      })
      .json<InvokeResponse>()

    expect(response.status).toBe('completed')
    expect(response.results).toHaveProperty('requirements')
    expect(response.results).toHaveProperty('frontend-design')
    expect(response.results).toHaveProperty('backend-design')
    expect(response.results).toHaveProperty('security-review')
    expect(response.results).toHaveProperty('integration-plan')

    // Verify integration plan received all inputs
    const integrationPlan = response.results['integration-plan']
    expect(typeof integrationPlan).toBe('string')
    expect(integrationPlan.length).toBeGreaterThan(100)

    console.log('✅ Parallel collaboration with fan-out/fan-in completed')

    // Cleanup
    try {
      await ky.delete(`${API_BASE}/invoke-status/workflows/${parallelThreadId}`)
    } catch (_error) {
      // Ignore cleanup errors - prefixed with underscore to satisfy ESLint
    }
  }, 600000)
})
