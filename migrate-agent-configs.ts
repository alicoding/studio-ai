/**
 * Migration Script: Migrate agent configurations from JSON to SQLite
 * 
 * SOLID: Single responsibility for agent config migration
 * DRY: Reuses existing services and utilities
 * KISS: Simple migration script with clear steps
 * Library-First: Uses existing UnifiedAgentConfigService
 */

import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { UnifiedAgentConfigService } from './web/server/services/UnifiedAgentConfigService'
import { createStorage } from './src/lib/storage/UnifiedStorage'

interface LegacyAgentConfig {
  id: string
  name: string
  role: string
  systemPrompt: string
  tools: string[]
  model: string
  createdAt: string
  updatedAt: string
  usedInProjects: string[]
}

interface LegacyRoleAssignment {
  agentId: string
  roleId: string
  customTools?: string[]
  assignedAt: string
  updatedAt: string
}

async function migrateAgentConfigs() {
  console.log('🚀 Starting agent configuration migration...')
  
  const agentService = UnifiedAgentConfigService.getInstance()
  
  try {
    // 1. Migrate agent configurations from JSON
    console.log('📁 Migrating agent configurations from JSON...')
    
    const legacyConfigPath = path.join(process.cwd(), 'data/agents/configurations.json')
    
    try {
      const data = await fs.readFile(legacyConfigPath, 'utf-8')
      const legacyConfigs: LegacyAgentConfig[] = JSON.parse(data)
      
      console.log(`Found ${legacyConfigs.length} agent configurations to migrate`)
      
      for (const config of legacyConfigs) {
        try {
          // Check if already exists
          const existing = await agentService.getConfig(config.id)
          if (existing) {
            console.log(`⏭️  Agent config ${config.id} already exists, skipping`)
            continue
          }
          
          // Create new config
          await agentService.createConfig({
            id: config.id,
            name: config.name,
            role: config.role,
            systemPrompt: config.systemPrompt,
            tools: config.tools,
            model: config.model,
            maxTokens: 200000,
            temperature: 0.7
          })
          
          console.log(`✅ Migrated agent config: ${config.name}`)
        } catch (error) {
          console.error(`❌ Failed to migrate agent config ${config.id}:`, error)
        }
      }
    } catch (_error) {
      console.log('ℹ️  No legacy agent configurations found, skipping')
    }
    
    // 2. Migrate role assignments from UnifiedStorage
    console.log('📁 Migrating role assignments from UnifiedStorage...')
    
    try {
      const rolesStorage = createStorage({ namespace: 'agent-roles', type: 'config' })
      const assignments = await rolesStorage.get<Record<string, LegacyRoleAssignment>>('assignments')
      
      if (assignments) {
        console.log(`Found ${Object.keys(assignments).length} role assignments to migrate`)
        
        for (const agentId of Object.keys(assignments)) {
          try {
            // Extract project ID from the assignment context (if available)
            // For now, we'll skip this as we need project context
            console.log(`ℹ️  Role assignment for agent ${agentId} requires project context, manual migration needed`)
          } catch (error) {
            console.error(`❌ Failed to migrate role assignment for ${agentId}:`, error)
          }
        }
      } else {
        console.log('ℹ️  No role assignments found in UnifiedStorage')
      }
    } catch (_error) {
      console.log('ℹ️  No role assignments found, skipping')
    }
    
    // 3. Migrate team templates (if they exist)
    console.log('📁 Checking for team templates...')
    
    const templatesPath = path.join(process.cwd(), 'data/teams/templates.json')
    
    try {
      const data = await fs.readFile(templatesPath, 'utf-8')
      const templates = JSON.parse(data)
      
      console.log(`Found ${templates.length || Object.keys(templates).length} team templates`)
      console.log('ℹ️  Team template migration will be implemented in a future update')
    } catch (_error) {
      console.log('ℹ️  No team templates found')
    }
    
    // 4. Create backup of migrated data
    console.log('💾 Creating backup of migrated data...')
    
    const backupDir = path.join(os.homedir(), '.claude-studio', 'migration-backups')
    
    try {
      await fs.mkdir(backupDir, { recursive: true })
      
      // Backup current configs
      const configs = await agentService.getAllConfigs()
      const backupPath = path.join(backupDir, `agent-configs-${Date.now()}.json`)
      await fs.writeFile(backupPath, JSON.stringify(configs, null, 2))
      
      console.log(`✅ Backup created: ${backupPath}`)
    } catch (error) {
      console.error('❌ Failed to create backup:', error)
    }
    
    console.log('🎉 Agent configuration migration completed!')
    
  } catch (error) {
    console.error('💥 Migration failed:', error)
    process.exit(1)
  }
}

// Helper function to validate migration
async function validateMigration() {
  console.log('🔍 Validating migration...')
  
  const agentService = UnifiedAgentConfigService.getInstance()
  
  try {
    const configs = await agentService.getAllConfigs()
    console.log(`✅ Found ${configs.length} agent configurations in new storage`)
    
    // Check for any missing required fields
    const invalid = configs.filter(config => 
      !config.id || !config.name || !config.role || !config.systemPrompt
    )
    
    if (invalid.length > 0) {
      console.error(`❌ Found ${invalid.length} invalid configurations`)
      invalid.forEach(config => {
        console.error(`  - ${config.id}: missing fields`)
      })
    } else {
      console.log('✅ All configurations are valid')
    }
    
  } catch (error) {
    console.error('❌ Validation failed:', error)
  }
}

// Run migration
if (require.main === module) {
  migrateAgentConfigs()
    .then(() => validateMigration())
    .then(() => {
      console.log('✨ Migration process completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Migration process failed:', error)
      process.exit(1)
    })
}

export { migrateAgentConfigs, validateMigration }