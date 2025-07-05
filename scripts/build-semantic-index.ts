#!/usr/bin/env node

/**
 * Build Semantic Index Script
 * 
 * This script builds the semantic search index for Claude Studio.
 * It uses the shared semantic-search library for consistency.
 * 
 * Usage:
 *   npm run build-semantic-index                # Build index for current directory
 *   npm run build-semantic-index -- --project /path/to/project
 *   npm run build-semantic-index -- --force     # Force rebuild even if index exists
 */

import { buildIndex } from '../src/lib/semantic-search/index.js'
import * as path from 'path'
import * as fs from 'fs/promises'

async function main() {
  const args = process.argv.slice(2)
  const forceIndex = args.indexOf('--force')
  const force = forceIndex !== -1
  
  const projectIndex = args.indexOf('--project')
  const projectPath = projectIndex !== -1 ? args[projectIndex + 1] : process.cwd()
  
  console.log('🚀 Claude Studio Semantic Index Builder')
  console.log('=====================================')
  console.log(`📁 Project: ${projectPath}`)
  console.log(`🔄 Force rebuild: ${force}`)
  console.log('')
  
  try {
    // Check if project exists
    const stats = await fs.stat(projectPath)
    if (!stats.isDirectory()) {
      throw new Error(`Not a directory: ${projectPath}`)
    }
    
    // Build index using shared library
    const result = await buildIndex(projectPath, {
      force,
      onProgress: (message) => {
        // Strip the [SimpleSemanticSearch] prefix for cleaner output
        console.log(message.replace('[SimpleSemanticSearch] ', ''))
      }
    })
    
    if (result.success && result.stats) {
      console.log('')
      console.log('✨ Index build complete!')
      console.log('📊 Statistics:')
      console.log(`   - Total documents: ${result.stats.totalDocuments}`)
      console.log(`   - Total functions: ${result.stats.totalFunctions}`)
      console.log(`   - Index size: ${(result.stats.indexSizeBytes / 1024).toFixed(2)} KB`)
      console.log(`   - Location: ${path.join(projectPath, '.claude-studio', 'search-index.json')}`)
    } else {
      throw new Error(result.error || 'Unknown error')
    }
    
  } catch (error) {
    console.error('')
    console.error('❌ Error building index:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

main().catch(console.error)