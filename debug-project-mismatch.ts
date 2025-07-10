#!/usr/bin/env tsx

/**
 * Debug script to check project/agent mismatch
 * Run with: npx tsx debug-project-mismatch.ts
 */

import ky from 'ky'

const API_URL = 'http://localhost:3457/api'

async function debugProjectMismatch() {
  console.log('🔍 Debugging Project/Agent Mismatch...\n')

  try {
    // Step 1: Get workspace data
    console.log('📋 Step 1: Fetching workspace data...')
    const workspace = (await ky.get(`${API_URL}/workspace`).json()) as {
      projects: Array<{ id: string; name: string; workspacePath?: string }>
      projectAgents: Record<string, Array<{ id: string; name: string; role: string }>>
    }

    console.log('\nProjects found:')
    workspace.projects.forEach((p) => {
      console.log(`  - ${p.name} (id: ${p.id})`)
      console.log(`    path: ${p.workspacePath}`)
    })

    console.log('\nProject Agents mapping:')
    Object.entries(workspace.projectAgents).forEach(([projectId, agents]) => {
      const project = workspace.projects.find((p) => p.id === projectId)
      console.log(`\n  Project: ${project?.name || 'Unknown'} (${projectId})`)
      agents.forEach((agent) => {
        console.log(`    - ${agent.name} (${agent.id})`)
      })
    })

    // Step 2: Check for duplicate agent IDs across projects
    console.log('\n📋 Step 2: Checking for duplicate agent IDs...')
    const agentIdToProjects = new Map<string, string[]>()

    Object.entries(workspace.projectAgents).forEach(([projectId, agents]) => {
      agents.forEach((agent) => {
        if (!agentIdToProjects.has(agent.id)) {
          agentIdToProjects.set(agent.id, [])
        }
        agentIdToProjects.get(agent.id)!.push(projectId)
      })
    })

    console.log('\nDuplicate agent IDs:')
    let foundDuplicates = false
    agentIdToProjects.forEach((projectIds, agentId) => {
      if (projectIds.length > 1) {
        foundDuplicates = true
        console.log(`  - Agent ID "${agentId}" exists in ${projectIds.length} projects:`)
        projectIds.forEach((pid) => {
          const project = workspace.projects.find((p) => p.id === pid)
          console.log(`    - ${project?.name || 'Unknown'} (${pid})`)
        })
      }
    })

    if (!foundDuplicates) {
      console.log('  No duplicate agent IDs found across projects')
    }

    // Step 3: Check studio projects
    console.log('\n📋 Step 3: Checking studio projects endpoint...')
    const studioProjects = (await ky.get(`${API_URL}/studio-projects`).json()) as Array<{
      id: string
      name: string
      path: string
    }>

    console.log('\nStudio projects:')
    studioProjects.forEach((p) => {
      console.log(`  - ${p.name} (id: ${p.id})`)
      console.log(`    path: ${p.path}`)
    })

    // Step 4: Compare paths
    console.log('\n📋 Step 4: Comparing project paths...')
    workspace.projects.forEach((wp) => {
      const sp = studioProjects.find((s) => s.id === wp.id)
      if (sp) {
        console.log(`\n  ${wp.name}:`)
        console.log(`    Workspace path: ${wp.workspacePath}`)
        console.log(`    Studio path: ${sp.path}`)
        if (wp.workspacePath !== sp.path) {
          console.log('    ⚠️  PATH MISMATCH!')
        }
      }
    })
  } catch (error) {
    console.error('Debug failed:', error)
  }
}

// Run the debug
debugProjectMismatch()
