#!/usr/bin/env tsx

/**
 * Test to check what the active project is in the UI
 * Run with: npx tsx test-active-project.ts
 */

import ky from 'ky'

const API_URL = 'http://localhost:3457/api'

async function testActiveProject() {
  console.log('🔍 Testing Active Project Issue...\n')

  try {
    // Get workspace data
    const workspace = (await ky.get(`${API_URL}/workspace`).json()) as {
      projects: Array<{ id: string; name: string; workspacePath?: string }>
      projectAgents: Record<string, Array<{ id: string; name: string; role: string }>>
    }

    // Find Claude Studio project
    const claudeStudio = workspace.projects.find((p) => p.name === 'Claude Studio')
    const bnsAi = workspace.projects.find((p) => p.name === 'bns-ai')

    console.log('Claude Studio project:')
    console.log(`  ID: ${claudeStudio?.id}`)
    console.log(`  Path: ${claudeStudio?.workspacePath}`)
    console.log(`  Agents:`)
    if (claudeStudio) {
      const agents = workspace.projectAgents[claudeStudio.id] || []
      agents.forEach((a) => console.log(`    - ${a.name} (${a.id})`))
    }

    console.log('\nbns-ai project:')
    console.log(`  ID: ${bnsAi?.id}`)
    console.log(`  Path: ${bnsAi?.workspacePath}`)
    console.log(`  Agents:`)
    if (bnsAi) {
      const agents = workspace.projectAgents[bnsAi.id] || []
      agents.forEach((a) => console.log(`    - ${a.name} (${a.id})`))
    }

    // Check which developer_01 would be used
    console.log('\n⚠️  Both projects have developer_01!')
    console.log('When active project is Claude Studio but UI shows bns-ai agents:')
    console.log("  - Message goes to: Claude Studio's developer_01")
    console.log('  - With project path: ' + claudeStudio?.workspacePath)
    console.log("  - But user expects: bns-ai's developer_01")
    console.log('  - With project path: ' + bnsAi?.workspacePath)
  } catch (error) {
    console.error('Test failed:', error)
  }
}

// Run the test
testActiveProject()
