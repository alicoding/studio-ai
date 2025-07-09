#!/usr/bin/env node

/**
 * Configure the operator in the database
 * Required since we removed hardcoded defaults
 */

import ky from 'ky'

const API_BASE = 'http://localhost:3457/api'

async function main() {
  console.log('Configuring operator...\n')

  try {
    // First check current config
    try {
      const current = await ky.get(`${API_BASE}/operator/config`).json()
      console.log('Current operator config:', current)
      console.log('\nOperator already configured ✅')
      return
    } catch (error) {
      console.log('Operator not configured, setting up...')
    }

    // Configure the operator
    const config = {
      model: 'gpt-4o-mini',
      systemPrompt: `You are a workflow status checker. Given the context below, analyze if the agent fulfilled their role and task.

CONTEXT:
Role: {role}
Task: {task}

EVALUATION CRITERIA:
- SUCCESS: Agent provided output that fulfills the task given their role capabilities
- BLOCKED: Agent clearly states inability to proceed due to missing dependencies or access
- FAILED: Agent produced errors, empty output, or output that doesn't address the task

Respond with ONLY: SUCCESS, BLOCKED, or FAILED`,
      temperature: 0,
      maxTokens: 10,
      // API key will use environment variable ELECTRONHUB_API_KEY
    }

    const result = await ky
      .put(`${API_BASE}/operator/config`, {
        json: config,
      })
      .json()

    console.log('✅ Operator configured successfully:', result)
  } catch (error) {
    console.error('❌ Failed to configure operator:', error.message)
    process.exit(1)
  }
}

main()
