/**
 * Check for workflows stuck in 'running' state
 * This helps investigate Issue: Workflows stuck in 'running' state
 *
 * SOLID: Single responsibility - workflow stuck detection
 * DRY: Reuses existing WorkflowRegistry
 * KISS: Simple analysis script
 * Library-First: Uses existing services
 */

import 'dotenv/config'
import { WorkflowRegistry } from '../services/WorkflowRegistry'

async function checkStuckWorkflows(): Promise<void> {
  try {
    const registry = WorkflowRegistry.getInstance()

    // Get all running workflows
    const runningWorkflows = await registry.listWorkflows({
      status: 'running',
      limit: 50,
    })

    console.log(`Found ${runningWorkflows.length} workflows in 'running' state:`)

    // Also check for recent workflows in other states for analysis
    const allRecentWorkflows = await registry.listWorkflows({
      limit: 10,
    })

    console.log(`\n📊 Recent workflow status summary:`)
    const statusCounts = allRecentWorkflows.reduce(
      (acc, w) => {
        acc[w.status] = (acc[w.status] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`)
    })

    if (runningWorkflows.length === 0) {
      console.log('\n✅ No workflows stuck in running state')

      // Check if there are any failed workflows that might indicate issues
      const failedWorkflows = allRecentWorkflows.filter((w) => w.status === 'failed')
      if (failedWorkflows.length > 0) {
        console.log(`\n⚠️  Found ${failedWorkflows.length} recent failed workflows:`)
        failedWorkflows.forEach((w) => {
          console.log(`   ${w.threadId} - Last update: ${w.lastUpdate}`)
        })
      }
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

// Run the check
checkStuckWorkflows()
  .then(() => {
    console.log('\n✅ Workflow check completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
