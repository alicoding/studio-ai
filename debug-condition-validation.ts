#!/usr/bin/env tsx
/**
 * Debug condition validation to understand what's failing
 */

import { InvokeRequestSchema } from './web/server/schemas/invoke'

// Test the exact same structured condition we're trying to use
const testWorkflow = {
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

console.log('🔍 Testing workflow validation...')

const result = InvokeRequestSchema.safeParse(testWorkflow)

if (result.success) {
  console.log('✅ Validation passed!')
  console.log('Parsed workflow:', JSON.stringify(result.data, null, 2))
} else {
  console.log('❌ Validation failed!')
  console.log('Errors:', JSON.stringify(result.error.flatten(), null, 2))
}
