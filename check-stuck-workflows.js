/**
 * Check for workflows stuck in 'running' state
 * This helps investigate Issue: Workflows stuck in 'running' state
 */

import { WorkflowRegistry } from './web/server/services/WorkflowRegistry.js'

async function checkStuckWorkflows() {
  try {
    const registry = WorkflowRegistry.getInstance()

    // Get all running workflows
    const runningWorkflows = await registry.listWorkflows({
      status: 'running',
      limit: 50,
    })

    console.log(`Found ${runningWorkflows.length} workflows in 'running' state:`)

    if (runningWorkflows.length === 0) {
      console.log('✅ No workflows stuck in running state')
      return
    }

    // Analyze each running workflow
    const now = new Date()
    const stuckThreshold = 30 * 60 * 1000 // 30 minutes

    for (const workflow of runningWorkflows) {
      const lastUpdate = new Date(workflow.lastUpdate)
      const timeSinceUpdate = now.getTime() - lastUpdate.getTime()
      const isStuck = timeSinceUpdate > stuckThreshold

      console.log(`\n🔍 Workflow ${workflow.threadId}:`)
      console.log(`   Status: ${workflow.status}`)
      console.log(`   Project: ${workflow.projectId || 'N/A'}`)
      console.log(`   Last Update: ${workflow.lastUpdate}`)
      console.log(`   Time Since Update: ${Math.round(timeSinceUpdate / 1000 / 60)} minutes`)
      console.log(`   Current Step: ${workflow.currentStep || 'N/A'}`)
      console.log(`   Stuck: ${isStuck ? '⚠️  YES' : '✅ NO'}`)

      if (isStuck) {
        console.log(`   ⚠️  This workflow appears to be stuck`)
      }
    }
  } catch (error) {
    console.error('❌ Error checking workflows:', error)
  }
}

checkStuckWorkflows()
