/**
 * Mock Step Executor
 * Provides deterministic responses for testing workflows without AI
 *
 * SOLID: Single responsibility - mock execution only
 * DRY: Reusable mock patterns
 * KISS: Simple response mapping
 * Library-First: No external dependencies needed
 */

import type { StepExecutor, WorkflowContext, ExecutorWorkflowStep } from './StepExecutor'
import type { StepResult } from '../../schemas/invoke'

export class MockStepExecutor implements StepExecutor {
  private mockResponses: Map<string, string> = new Map([
    // Common test scenarios
    [
      'design',
      'Here is the system architecture:\n- REST API with Express\n- PostgreSQL database\n- JWT authentication\n- Modular service layer\n- Docker containers for deployment',
    ],
    [
      'implement',
      'function hello() {\n  return "Hello World";\n}\n\nexport default hello;\n\n// Implementation includes proper error handling and TypeScript types',
    ],
    [
      'test',
      'describe("hello", () => {\n  it("returns Hello World", () => {\n    expect(hello()).toBe("Hello World");\n  });\n\n  it("handles edge cases", () => {\n    expect(hello()).toBeTruthy();\n  });\n});',
    ],
    [
      'review',
      'Code Review:\n✅ Clean code structure\n✅ Follows SOLID principles\n✅ TypeScript types properly defined\n⚠️ Consider adding error handling\n⚠️ Add JSDoc comments\n📝 Overall: Ready for production with minor improvements',
    ],
    [
      'security',
      'Security Analysis:\n✅ No SQL injection vulnerabilities\n✅ Input validation present\n✅ Authentication implemented\n⚠️ Add rate limiting\n⚠️ Implement CORS properly\n⚠️ Consider adding request size limits',
    ],
    [
      'deploy',
      'Deployment Status:\n✅ Docker images built successfully\n✅ Environment variables configured\n✅ Health checks passing\n✅ Ready for production deployment',
    ],
    [
      'documentation',
      'Documentation Generated:\n# API Documentation\n\n## Endpoints\n- GET /api/health - Health check\n- POST /api/data - Create data\n\n## Setup\n1. npm install\n2. npm run dev\n3. Access at http://localhost:3000',
    ],
  ])

  canHandle(step: ExecutorWorkflowStep): boolean {
    return step.type === 'mock' || (!step.type && process.env.USE_MOCK_AI === 'true')
  }

  async execute(step: ExecutorWorkflowStep, context: WorkflowContext): Promise<StepResult> {
    const startTime = Date.now()

    // Simulate processing delay
    const delay = step.config?.mockDelay || 100
    await new Promise((resolve) => setTimeout(resolve, delay))

    // Get response based on task content
    const response = this.getMockResponse(step.task, context, step.config?.mockResponse)

    return {
      id: step.id!,
      status: 'success',
      response,
      sessionId: `mock-session-${step.id}`,
      duration: Date.now() - startTime,
    }
  }

  private getMockResponse(task: string, context: WorkflowContext, customResponse?: string): string {
    // Use custom response if provided
    if (customResponse) {
      console.log(`[MockStepExecutor] Using custom response for task: "${task}"`)
      return this.resolveTemplates(customResponse, context)
    }

    // Resolve template variables first, then check patterns on the resolved task
    const resolvedTask = this.resolveTemplates(task, context)
    const taskLower = resolvedTask.toLowerCase()
    console.log(
      `[MockStepExecutor] Analyzing task: "${task}" -> resolved: "${resolvedTask}" (available outputs: ${Object.keys(context.stepOutputs).join(', ')})`
    )

    // Match common patterns with priority order (most specific first)
    if (taskLower.includes('design') || taskLower.includes('architect')) {
      console.log(`[MockStepExecutor] Matched pattern: design/architect`)
      return this.mockResponses.get('design')!
    }
    if (
      taskLower.includes('test') ||
      taskLower.includes('spec') ||
      taskLower.includes('unit test')
    ) {
      console.log(`[MockStepExecutor] Matched pattern: test/spec`)
      return this.mockResponses.get('test')!
    }
    if (
      taskLower.includes('security') ||
      taskLower.includes('secure') ||
      taskLower.includes('vulnerability')
    ) {
      console.log(`[MockStepExecutor] Matched pattern: security`)
      return this.mockResponses.get('security')!
    }
    if (taskLower.includes('review')) {
      console.log(`[MockStepExecutor] Matched pattern: review`)
      return this.mockResponses.get('review')!
    }
    if (taskLower.includes('analyze')) {
      console.log(`[MockStepExecutor] Matched pattern: analyze`)
      return this.mockResponses.get('review')!
    }
    if (
      taskLower.includes('implement') ||
      taskLower.includes('build') ||
      taskLower.includes('code') ||
      taskLower.includes('create')
    ) {
      console.log(`[MockStepExecutor] Matched pattern: implement/build/code`)
      return this.mockResponses.get('implement')!
    }
    if (
      taskLower.includes('deploy') ||
      taskLower.includes('deployment') ||
      taskLower.includes('production')
    ) {
      console.log(`[MockStepExecutor] Matched pattern: deploy`)
      return this.mockResponses.get('deploy')!
    }
    if (
      taskLower.includes('document') ||
      taskLower.includes('doc') ||
      taskLower.includes('readme')
    ) {
      console.log(`[MockStepExecutor] Matched pattern: documentation`)
      return this.mockResponses.get('documentation')!
    }

    // Generate contextual response based on dependencies
    if (context.stepOutputs && Object.keys(context.stepOutputs).length > 0) {
      console.log(
        `[MockStepExecutor] Generating contextual response based on ${Object.keys(context.stepOutputs).length} dependencies`
      )
      const prevOutputs = Object.entries(context.stepOutputs)
        .map(([id, output]) => `Based on ${id}: ${output.substring(0, 50)}...`)
        .join('\n')

      return `Mock response for: "${task}"\n\n${prevOutputs}\n\nMock implementation completed successfully.`
    }

    // Default response
    console.log(`[MockStepExecutor] Using default response for unmatched task`)
    return `Mock response for task: "${task}"\n\nThis is a mock implementation for testing purposes.\n\nCompleted at: ${new Date().toISOString()}`
  }

  private resolveTemplates(template: string, context: WorkflowContext): string {
    let resolved = template
    console.log(`[MockStepExecutor] Resolving template: "${template}"`)

    // Replace {stepId.output} patterns
    if (context.stepOutputs) {
      Object.entries(context.stepOutputs).forEach(([stepId, output]) => {
        const outputPattern = `\\{${stepId}\\.output\\}`
        const simplePattern = `\\{${stepId}\\}`

        const beforeOutput = resolved
        resolved = resolved.replace(new RegExp(outputPattern, 'g'), output)
        if (resolved !== beforeOutput) {
          console.log(
            `[MockStepExecutor] Replaced {${stepId}.output} with: "${output.substring(0, 50)}..."`
          )
        }

        const beforeSimple = resolved
        resolved = resolved.replace(new RegExp(simplePattern, 'g'), output)
        if (resolved !== beforeSimple) {
          console.log(
            `[MockStepExecutor] Replaced {${stepId}} with: "${output.substring(0, 50)}..."`
          )
        }
      })
    }

    // Add special context variables
    resolved = resolved.replace(/\{timestamp\}/g, new Date().toISOString())
    resolved = resolved.replace(/\{threadId\}/g, context.threadId)
    if (context.projectId) {
      resolved = resolved.replace(/\{projectId\}/g, context.projectId)
    }

    console.log(`[MockStepExecutor] Final resolved template: "${resolved}"`)
    return resolved
  }
}
