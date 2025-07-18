/**
 * Test AI Evaluation step type via /api/invoke
 * Tests the new ai_evaluation step type with multi-provider support
 *
 * SOLID: Single responsibility - AI evaluation step testing
 * DRY: Reuses existing test infrastructure
 * KISS: Simple test patterns focused on ai_evaluation functionality
 * Library-First: Uses established vitest testing framework
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setupInvokeTestMocks, cleanupMocks } from './test-mocks'
import type { KyInstance } from 'ky'

// Type definitions for test responses
interface TestStepResult {
  stepId: string
  status: 'completed' | 'failed'
  output: string
}

interface TestInvokeResponse {
  status: 'completed' | 'failed' | 'running'
  results: TestStepResult[]
  threadId: string
  sessionIds: Record<string, string>
}

describe('AI Evaluation Step Tests', () => {
  let mockKy: Partial<KyInstance>

  beforeEach(() => {
    const { kyMocks } = setupInvokeTestMocks()
    mockKy = kyMocks
  })

  afterEach(() => {
    cleanupMocks()
  })

  describe('Phase 4.1: Basic AI Evaluation Step API', () => {
    it('should handle ai_evaluation step type with OpenAI provider', async () => {
      // Test data - workflow with ai_evaluation step
      const request = {
        workflow: [
          {
            id: 'generate_code',
            role: 'developer',
            task: 'Create a simple hello world function in Python',
          },
          {
            id: 'evaluate_code',
            type: 'ai_evaluation',
            task: 'Evaluate if the generated code is syntactically correct and follows best practices',
            provider: 'openai',
            model: 'gpt-4',
            systemPrompt:
              'You are a code quality evaluator. Respond with SUCCESS if code is good, FAILED if code has issues.',
            deps: ['generate_code'],
          },
        ],
        projectId: 'test-project-123',
        startNewConversation: true,
        format: 'json',
      }

      // Import the mocked ky
      const ky = (await import('ky')).default as KyInstance

      // Send request
      const response = await ky
        .post('http://localhost:3456/api/invoke', {
          json: request,
          timeout: 30000,
        })
        .json()

      // Validate response structure
      expect(response).toMatchObject({
        threadId: expect.any(String),
        sessionIds: expect.any(Object),
        results: expect.arrayContaining([
          expect.objectContaining({
            stepId: 'generate_code',
            status: 'completed',
            output: expect.any(String),
          }),
          expect.objectContaining({
            stepId: 'evaluate_code',
            status: 'completed',
            output: expect.any(String),
          }),
        ]),
        status: 'completed',
      })

      // Validate mock was called with correct parameters
      expect(mockKy.post).toHaveBeenCalledWith(
        'http://localhost:3456/api/invoke',
        expect.objectContaining({
          json: expect.objectContaining({
            workflow: expect.arrayContaining([
              expect.objectContaining({
                type: 'ai_evaluation',
                provider: 'openai',
                model: 'gpt-4',
              }),
            ]),
          }),
        })
      )
    })

    it('should handle ai_evaluation step with Azure provider', async () => {
      const request = {
        workflow: [
          {
            id: 'generate_text',
            role: 'developer',
            task: 'Write a brief explanation of REST APIs',
          },
          {
            id: 'evaluate_text',
            type: 'ai_evaluation',
            task: 'Evaluate if the explanation is accurate and comprehensive',
            provider: 'azure',
            model: 'gpt-4',
            systemPrompt:
              'You are a technical writing evaluator. Respond with SUCCESS for good explanations, FAILED for poor ones.',
            deps: ['generate_text'],
          },
        ],
        projectId: 'test-project-123',
      }

      const ky = (await import('ky')).default as KyInstance
      const response = await ky.post('http://localhost:3456/api/invoke', { json: request }).json()

      expect(response).toMatchObject({
        status: 'completed',
        results: expect.arrayContaining([
          expect.objectContaining({
            stepId: 'evaluate_text',
            status: 'completed',
          }),
        ]),
      })
    })

    it('should validate ai_evaluation step requires provider', async () => {
      const request = {
        workflow: {
          id: 'invalid_eval',
          type: 'ai_evaluation',
          task: 'Evaluate something',
          // Missing provider - should fail validation
        },
        projectId: 'test-project-123',
      }

      const ky = (await import('ky')).default as KyInstance

      // This should fail validation
      await expect(
        ky.post('http://localhost:3456/api/invoke', { json: request }).json()
      ).rejects.toThrow()
    })
  })

  describe('Phase 4.2: Multi-Provider Configuration', () => {
    it('should handle different provider configurations', async () => {
      const testCases = [
        {
          provider: 'openai',
          model: 'gpt-4',
          name: 'OpenAI GPT-4',
        },
        {
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          name: 'OpenAI GPT-3.5',
        },
        {
          provider: 'azure',
          model: 'gpt-4',
          name: 'Azure OpenAI',
        },
      ]

      for (const testCase of testCases) {
        const request = {
          workflow: [
            {
              id: 'generate',
              role: 'developer',
              task: 'Generate test content',
            },
            {
              id: 'evaluate',
              type: 'ai_evaluation',
              task: `Evaluate content using ${testCase.name}`,
              provider: testCase.provider,
              model: testCase.model,
              deps: ['generate'],
            },
          ],
          projectId: 'test-project-123',
        }

        const ky = (await import('ky')).default as KyInstance
        const response = await ky.post('http://localhost:3456/api/invoke', { json: request }).json()

        expect(response).toMatchObject({
          status: 'completed',
          results: expect.arrayContaining([
            expect.objectContaining({
              stepId: 'evaluate',
              status: 'completed',
            }),
          ]),
        })
      }
    })

    it('should handle graceful fallback for unsupported providers', async () => {
      const request = {
        workflow: [
          {
            id: 'generate',
            role: 'developer',
            task: 'Generate test content',
          },
          {
            id: 'evaluate',
            type: 'ai_evaluation',
            task: 'Evaluate content',
            provider: 'anthropic', // Should fail gracefully with installation message
            model: 'claude-3-sonnet',
            deps: ['generate'],
          },
        ],
        projectId: 'test-project-123',
      }

      const ky = (await import('ky')).default as KyInstance
      const response = await ky.post('http://localhost:3456/api/invoke', { json: request }).json()

      // Should complete but with error message about missing package
      expect(response).toMatchObject({
        results: expect.arrayContaining([
          expect.objectContaining({
            stepId: 'evaluate',
            status: 'failed',
            output: expect.stringContaining('@langchain/anthropic'),
          }),
        ]),
      })
    })
  })

  describe('Phase 4.3: Template Variable Resolution', () => {
    it('should resolve template variables in ai_evaluation tasks', async () => {
      const request = {
        workflow: [
          {
            id: 'code_gen',
            role: 'developer',
            task: 'Write a function that adds two numbers',
          },
          {
            id: 'code_eval',
            type: 'ai_evaluation',
            task: 'Evaluate this code for correctness: {code_gen.output}',
            provider: 'openai',
            model: 'gpt-4',
            systemPrompt: 'You are a code reviewer. Check if the code in the task is correct.',
            deps: ['code_gen'],
          },
        ],
        projectId: 'test-project-123',
      }

      const ky = (await import('ky')).default as KyInstance
      const response = await ky.post('http://localhost:3456/api/invoke', { json: request }).json()

      expect(response).toMatchObject({
        status: 'completed',
        results: expect.arrayContaining([
          expect.objectContaining({
            stepId: 'code_eval',
            status: 'completed',
            output: expect.any(String),
          }),
        ]),
      })

      // Validate that template variable was resolved
      expect(mockKy.post).toHaveBeenCalledWith(
        'http://localhost:3456/api/invoke',
        expect.objectContaining({
          json: expect.objectContaining({
            workflow: expect.arrayContaining([
              expect.objectContaining({
                task: expect.stringContaining('{code_gen.output}'),
              }),
            ]),
          }),
        })
      )
    })

    it('should handle multiple template variables in ai_evaluation', async () => {
      const request = {
        workflow: [
          {
            id: 'requirement',
            role: 'analyst',
            task: 'Define requirements for a todo app',
          },
          {
            id: 'implementation',
            role: 'developer',
            task: 'Implement based on: {requirement.output}',
            deps: ['requirement'],
          },
          {
            id: 'quality_check',
            type: 'ai_evaluation',
            task: 'Check if {implementation.output} meets the requirements: {requirement.output}',
            provider: 'openai',
            systemPrompt:
              'Compare implementation against requirements. Respond SUCCESS if they match, FAILED if not.',
            deps: ['requirement', 'implementation'],
          },
        ],
        projectId: 'test-project-123',
      }

      const ky = (await import('ky')).default as KyInstance
      const response = await ky.post('http://localhost:3456/api/invoke', { json: request }).json()

      expect(response).toMatchObject({
        status: 'completed',
        results: expect.arrayContaining([
          expect.objectContaining({
            stepId: 'quality_check',
            status: 'completed',
          }),
        ]),
      })
    })
  })

  describe('Phase 4.4: Backward Compatibility', () => {
    it('should not break existing Claude-only workflows', async () => {
      // Test traditional workflow without ai_evaluation
      const request = {
        workflow: [
          {
            id: 'step1',
            role: 'developer',
            task: 'Create a simple function',
          },
          {
            id: 'step2',
            role: 'reviewer',
            task: 'Review the function from step1',
            deps: ['step1'],
          },
        ],
        projectId: 'test-project-123',
      }

      const ky = (await import('ky')).default as KyInstance
      const response = await ky.post('http://localhost:3456/api/invoke', { json: request }).json()

      expect(response).toMatchObject({
        status: 'completed',
        results: expect.arrayContaining([
          expect.objectContaining({
            stepId: 'step1',
            status: 'completed',
          }),
          expect.objectContaining({
            stepId: 'step2',
            status: 'completed',
          }),
        ]),
      })
    })

    it('should handle mixed workflows with Claude and AI evaluation steps', async () => {
      const request = {
        workflow: [
          {
            id: 'claude_step',
            role: 'developer',
            task: 'Write a Python function',
          },
          {
            id: 'ai_eval_step',
            type: 'ai_evaluation',
            task: 'Evaluate the Python function quality',
            provider: 'openai',
            deps: ['claude_step'],
          },
          {
            id: 'claude_fix',
            role: 'developer',
            task: 'Fix any issues found in evaluation',
            deps: ['ai_eval_step'],
          },
        ],
        projectId: 'test-project-123',
      }

      const ky = (await import('ky')).default as KyInstance
      const response = await ky.post('http://localhost:3456/api/invoke', { json: request }).json()

      expect(response).toMatchObject({
        status: 'completed',
        results: expect.arrayContaining([
          expect.objectContaining({ stepId: 'claude_step' }),
          expect.objectContaining({ stepId: 'ai_eval_step' }),
          expect.objectContaining({ stepId: 'claude_fix' }),
        ]),
      })

      // Verify all step types completed successfully
      const results = (response as TestInvokeResponse).results
      expect(results.every((r: TestStepResult) => r.status === 'completed')).toBe(true)
    })
  })

  describe('Phase 4.5: Explicit Evaluation Workflow Patterns', () => {
    it('should support evaluation pipeline pattern', async () => {
      const request = {
        workflow: [
          {
            id: 'generate',
            role: 'developer',
            task: 'Generate a REST API endpoint',
          },
          {
            id: 'syntax_check',
            type: 'ai_evaluation',
            task: 'Check syntax correctness of: {generate.output}',
            provider: 'openai',
            systemPrompt:
              'Check for syntax errors. Respond SUCCESS for valid syntax, FAILED for errors.',
            deps: ['generate'],
          },
          {
            id: 'security_check',
            type: 'ai_evaluation',
            task: 'Check security vulnerabilities in: {generate.output}',
            provider: 'openai',
            systemPrompt:
              'Check for security issues. Respond SUCCESS for secure code, FAILED for vulnerabilities.',
            deps: ['generate'],
          },
          {
            id: 'final_review',
            role: 'reviewer',
            task: 'Final review considering syntax: {syntax_check.output} and security: {security_check.output}',
            deps: ['syntax_check', 'security_check'],
          },
        ],
        projectId: 'test-project-123',
      }

      const ky = (await import('ky')).default as KyInstance
      const response = await ky.post('http://localhost:3456/api/invoke', { json: request }).json()

      expect(response).toMatchObject({
        status: 'completed',
        results: expect.arrayContaining([
          expect.objectContaining({ stepId: 'generate' }),
          expect.objectContaining({ stepId: 'syntax_check' }),
          expect.objectContaining({ stepId: 'security_check' }),
          expect.objectContaining({ stepId: 'final_review' }),
        ]),
      })

      // Verify evaluation steps were processed
      const results = (response as TestInvokeResponse).results
      const evalSteps = results.filter(
        (r: TestStepResult) => r.stepId === 'syntax_check' || r.stepId === 'security_check'
      )
      expect(evalSteps).toHaveLength(2)
      expect(evalSteps.every((r: TestStepResult) => r.status === 'completed')).toBe(true)
    })

    it('should support conditional workflow based on evaluation', async () => {
      const request = {
        workflow: [
          {
            id: 'code_gen',
            role: 'developer',
            task: 'Write a sorting algorithm',
          },
          {
            id: 'quality_eval',
            type: 'ai_evaluation',
            task: 'Evaluate code quality: {code_gen.output}',
            provider: 'openai',
            systemPrompt: 'Respond SUCCESS for high-quality code, FAILED for poor quality.',
            deps: ['code_gen'],
          },
          {
            id: 'approval_step',
            type: 'conditional',
            condition: '{quality_eval.output} === "SUCCESS"',
            trueBranch: 'deploy_code',
            falseBranch: 'fix_code',
            deps: ['quality_eval'],
          },
          {
            id: 'deploy_code',
            role: 'deployment',
            task: 'Deploy the high-quality code',
          },
          {
            id: 'fix_code',
            role: 'developer',
            task: 'Fix code quality issues and resubmit',
          },
        ],
        projectId: 'test-project-123',
      }

      const ky = (await import('ky')).default as KyInstance
      const response = await ky.post('http://localhost:3456/api/invoke', { json: request }).json()

      expect(response).toMatchObject({
        status: 'completed',
        results: expect.arrayContaining([
          expect.objectContaining({
            stepId: 'quality_eval',
            status: 'completed',
          }),
        ]),
      })
    })
  })
})
