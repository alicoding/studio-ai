/**
 * Migration 005: Ensure Tool Permissions
 *
 * This migration ensures all existing agent configurations have proper
 * tool permissions set in ToolPermission[] format, defaulting to "Read Only"
 * preset for any agents with old string[] format or empty tools.
 *
 * SOLID: Single responsibility - Only tool permission migration
 * DRY: Reuses existing services and constants
 * KISS: Simple, focused migration logic
 * Library-First: Uses existing ToolPermissionService and database utilities
 */

import type Database from 'better-sqlite3'
import { PERMISSION_PRESETS, applyPreset } from '../../../types/tool-permissions'

export const migration = {
  name: '005_ensure_tool_permissions',

  async up(db: Database.Database): Promise<void> {
    console.log('🔄 Running migration 005: Ensure Tool Permissions...')

    try {
      // Get all agent configurations
      const configs = db.prepare('SELECT * FROM agent_configs').all() as Array<{
        id: string
        name: string
        tools: string
        updated_at: string
      }>

      console.log(`📊 Found ${configs.length} agent configurations`)

      if (configs.length === 0) {
        console.log('✅ No agents found, migration complete')
        return
      }

      // Track migration stats
      let updatedCount = 0
      let alreadyMigratedCount = 0
      let errorCount = 0

      // Prepare update statement
      const updateStmt = db.prepare(`
        UPDATE agent_configs 
        SET tools = ?, updated_at = ? 
        WHERE id = ?
      `)

      // Process each agent configuration
      for (const config of configs) {
        try {
          console.log(`🔍 Processing agent: ${config.name} (${config.id})`)

          // Parse current tools
          let currentTools: unknown
          let needsUpdate = false

          try {
            // Try to parse the tools field
            if (typeof config.tools === 'string') {
              currentTools = JSON.parse(config.tools)
            } else {
              currentTools = config.tools
            }

            // Check if tools are in old string[] format or empty
            if (Array.isArray(currentTools)) {
              // Check if first element is a string (old format) or already ToolPermission object
              if (currentTools.length === 0 || typeof currentTools[0] === 'string') {
                needsUpdate = true
                console.log(`  ⚠️  Agent has old string[] format or empty tools, needs migration`)
              } else if (typeof currentTools[0] === 'object' && 'name' in currentTools[0]) {
                console.log(`  ✅ Agent already has ToolPermission[] format`)
                alreadyMigratedCount++
              } else {
                needsUpdate = true
                console.log(`  ⚠️  Agent has unknown tools format, needs migration`)
              }
            } else {
              needsUpdate = true
              console.log(`  ⚠️  Agent has non-array tools format, needs migration`)
            }
          } catch (parseError) {
            console.log(`  ⚠️  Failed to parse tools, needs migration: ${parseError}`)
            needsUpdate = true
            currentTools = []
          }

          if (needsUpdate) {
            // Get available tool names (either from current tools or default set)
            const availableTools =
              Array.isArray(currentTools) && currentTools.length > 0
                ? (currentTools as unknown[]).filter((t): t is string => typeof t === 'string')
                : ['Read', 'Grep', 'Glob', 'LS', 'WebFetch', 'WebSearch'] // Default Claude tools

            console.log(`  🔧 Available tools for preset: ${availableTools.join(', ')}`)

            // Apply "read_only" preset to get proper ToolPermission[] format
            const readOnlyPermissions = applyPreset(PERMISSION_PRESETS.read_only, availableTools)

            console.log(`  📝 Applying read-only permissions (${readOnlyPermissions.length} tools)`)

            // Update the agent configuration
            const now = Math.floor(Date.now() / 1000) // SQLite timestamp format
            updateStmt.run(JSON.stringify(readOnlyPermissions), now, config.id)

            console.log(`  ✅ Updated agent ${config.name} with read-only permissions`)
            updatedCount++
          }
        } catch (error) {
          console.error(`  ❌ Error processing agent ${config.name}:`, error)
          errorCount++
        }
      }

      // Print summary
      console.log('\n📊 Migration 005 Summary:')
      console.log(`  ✅ Updated agents: ${updatedCount}`)
      console.log(`  ⏭️  Already migrated: ${alreadyMigratedCount}`)
      console.log(`  ❌ Errors: ${errorCount}`)
      console.log(`  📊 Total processed: ${configs.length}`)

      console.log('✅ Migration 005 completed successfully!')
    } catch (error) {
      console.error('❌ Migration 005 failed:', error)
      throw error
    }
  },

  async down(_db: Database.Database): Promise<void> {
    console.log('🔄 Rolling back migration 005: Ensure Tool Permissions...')

    // This migration is not easily reversible since we don't know the original
    // tool format. We'll just log a warning.
    console.log('⚠️  Migration 005 rollback: Cannot restore original tool formats')
    console.log('ℹ️  All agents will keep their current ToolPermission[] format')

    console.log('✅ Migration 005 rollback completed')
  },
}

export const up = migration.up
export const down = migration.down
