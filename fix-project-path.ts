#!/usr/bin/env npx tsx

/**
 * Script to fix the project workspace path in the database
 */

import { DatabaseService } from './web/server/lib/storage/DatabaseService.js'

async function fixProjectPath() {
  const db = DatabaseService.getInstance()

  const projectId = 'ea5e9bb8-e90a-4bbf-93a1-3023fa2c7f21'
  const correctPath = '/Volumes/AliDev/ai-projects/claude-swarm/claude-team/claude-studio'

  console.log('Fixing project path...')
  console.log(`Project ID: ${projectId}`)
  console.log(`New path: ${correctPath}`)

  // Get current project
  const project = await db.db.get('SELECT * FROM studio_projects WHERE id = ?', projectId)

  if (!project) {
    console.error('Project not found!')
    return
  }

  console.log(`Current path: ${project.workspacePath}`)

  // Update the path
  await db.db.run(
    'UPDATE studio_projects SET workspacePath = ? WHERE id = ?',
    correctPath,
    projectId
  )

  console.log('✅ Project path updated successfully!')

  // Verify
  const updated = await db.db.get('SELECT * FROM studio_projects WHERE id = ?', projectId)

  console.log(`Verified new path: ${updated.workspacePath}`)
}

fixProjectPath().catch(console.error)
