#!/usr/bin/env tsx
/**
 * Simple test for conditional workflows to debug validation issues
 */

import ky from 'ky'

const API_URL = 'http://localhost:3456/api'

// Type definitions for API responses
interface InvokeResponse {
  threadId: string
  sessionIds: Record<string, string>
  results: Record<string, string>
  status: 'completed' | 'partial' | 'failed'
  summary?: {
    total: number
    successful: number
    failed: number
    blocked: number
    duration: number
  }
}

async function testSimpleConditional() {
  console.log('🧪 Testing simple conditional workflow...\n')

  try {
    // First test: Simple non-conditional workflow
    console.log('1. Testing basic workflow (no conditionals)...')
    const basicWorkflow = {
      workflow: [{ id: 'step1', role: 'dev', task: 'Return success' }],
      projectId: 'test-basic',
    }

    const basicResponse = await ky
      .post(`${API_URL}/invoke`, {
        json: basicWorkflow,
        timeout: 30000,
      })
      .json<InvokeResponse>()

    console.log('✅ Basic workflow:', basicResponse.status)

    // Second test: Simple conditional with legacy condition
    console.log('2. Testing legacy conditional...')
    const legacyConditional = {
      workflow: [
        { id: 'step1', role: 'dev', task: 'Return success' },
        {
          id: 'conditional',
          type: 'conditional',
          task: 'Check result',
          condition: '{step1.output} === "success"',
          trueBranch: 'success',
          falseBranch: 'failure',
          deps: ['step1'],
        },
        { id: 'success', role: 'dev', task: 'Success path' },
        { id: 'failure', role: 'dev', task: 'Failure path' },
      ],
      projectId: 'test-legacy',
    }

    const legacyResponse = await ky
      .post(`${API_URL}/invoke`, {
        json: legacyConditional,
        timeout: 30000,
      })
      .json<InvokeResponse>()

    console.log('✅ Legacy conditional:', legacyResponse.status)

    // Third test: Simple structured condition
    console.log('3. Testing structured conditional...')
    const structuredConditional = {
      workflow: [
        { id: 'step1', role: 'dev', task: 'Return success' },
        {
          id: 'conditional',
          type: 'conditional',
          task: 'Check result',
          condition: {
            version: '2.0',
            rootGroup: {
              id: 'root',
              combinator: 'AND',
              rules: [
                {
                  id: 'rule1',
                  leftValue: { stepId: 'step1', field: 'output' },
                  operation: 'equals',
                  rightValue: { type: 'string', value: 'success' },
                  dataType: 'string',
                },
              ],
            },
          },
          trueBranch: 'success',
          falseBranch: 'failure',
          deps: ['step1'],
        },
        { id: 'success', role: 'dev', task: 'Success path' },
        { id: 'failure', role: 'dev', task: 'Failure path' },
      ],
      projectId: 'test-structured',
    }

    const structuredResponse = await ky
      .post(`${API_URL}/invoke`, {
        json: structuredConditional,
        timeout: 30000,
      })
      .json<InvokeResponse>()

    console.log('✅ Structured conditional:', structuredResponse.status)

    console.log('\n🎉 All tests passed!')
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

testSimpleConditional().catch(console.error)
