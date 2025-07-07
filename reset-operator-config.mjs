#!/usr/bin/env node

/**
 * Reset operator config to use the improved system prompt
 */

import { OperatorConfigService } from './web/server/services/OperatorConfigService.js'

async function resetOperatorConfig() {
  try {
    const configService = OperatorConfigService.getInstance()
    const newConfig = await configService.resetToDefault()
    
    console.log('✅ Operator config reset to improved defaults:')
    console.log('Model:', newConfig.model)
    console.log('Temperature:', newConfig.temperature)
    console.log('Max Tokens:', newConfig.maxTokens)
    console.log('\n📝 New System Prompt:')
    console.log(newConfig.systemPrompt)
    
  } catch (error) {
    console.error('❌ Failed to reset operator config:', error.message)
    process.exit(1)
  }
}

resetOperatorConfig()