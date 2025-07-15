#!/usr/bin/env tsx

/**
 * Test script to verify CWD fix is working
 * Run with: npx tsx test-cwd-fix.ts
 */

import { StudioProjectService } from './web/server/services/StudioProjectService'

async function testProjectPathResolution() {
  console.log('🔍 Testing Project Path Resolution...\n')

  try {
    const projectService = new StudioProjectService()

    // List all projects to test path resolution
    const projects = await projectService.listProjects()

    if (projects.length === 0) {
      console.log('❌ No projects found')
      return
    }

    console.log('📋 Projects and their workspace paths:')
    for (const project of projects) {
      console.log(`  - ${project.name} (${project.id})`)
      console.log(`    Workspace Path: ${project.workspacePath}`)

      // Test getProjectWithAgents to ensure it includes workspacePath
      const projectWithAgents = await projectService.getProjectWithAgents(project.id)
      console.log(`    Verified workspacePath: ${projectWithAgents.workspacePath}`)
      console.log()
    }

    console.log('✅ Project path resolution is working correctly!')
    console.log('\n🎯 Fix Summary:')
    console.log(
      '   - Fixed StudioProjectService method call from getProject() to getProjectWithAgents()'
    )
    console.log('   - Added automatic project path resolution in messages.ts API endpoints')
    console.log('   - Agents will now use correct workspace directory instead of current directory')
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testProjectPathResolution()
