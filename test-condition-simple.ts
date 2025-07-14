/**
 * Simple condition evaluation test
 */

import { ConditionEvaluator } from './web/server/services/ConditionEvaluator'

const evaluator = new ConditionEvaluator()

// Test condition evaluation directly - exactly as it would be in the workflow
const context = {
  stepOutputs: {
    step1:
      'Mock response for task: "Return the word "success""\n\nThis is a mock implementation for testing purposes.\n\nCompleted at: 2025-07-14T00:19:28.052Z',
  },
  stepResults: {
    step1: {
      id: 'step1',
      status: 'success' as const,
      response:
        'Mock response for task: "Return the word "success""\n\nThis is a mock implementation for testing purposes.\n\nCompleted at: 2025-07-14T00:19:28.052Z',
      sessionId: 'mock-session-step1',
      duration: 103,
    },
  },
  metadata: {
    threadId: 'test',
    projectId: 'test',
    currentStepIndex: 1,
  },
}

console.log('Testing condition evaluation...')
console.log('Step1 output:', JSON.stringify(context.stepOutputs.step1))

try {
  const result = evaluator.evaluateCondition('{step1.output} === "success"', context)
  console.log('Result:', result)
} catch (error) {
  console.error('Error:', error)
}

// Try a simpler condition
try {
  const result2 = evaluator.evaluateCondition('{step1.status} === "success"', context)
  console.log('Status condition result:', result2)
} catch (error) {
  console.error('Status condition error:', error)
}

// Test with mock output that actually contains "success"
const simpleContext = {
  stepOutputs: {
    step1: 'success',
  },
  stepResults: {
    step1: {
      id: 'step1',
      status: 'success' as const,
      response: 'success',
      sessionId: 'mock-session-step1',
      duration: 103,
    },
  },
  metadata: {
    threadId: 'test',
    projectId: 'test',
    currentStepIndex: 1,
  },
}

try {
  const result3 = evaluator.evaluateCondition('{step1.output} === "success"', simpleContext)
  console.log('Simple success condition result:', result3)
} catch (error) {
  console.error('Simple success condition error:', error)
}
