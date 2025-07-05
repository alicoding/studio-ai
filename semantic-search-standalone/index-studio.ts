#!/usr/bin/env npx tsx
/**
 * Script to index Claude Studio project with appropriate filters
 */

import { createSearchEngine } from './src/index.js'
import * as path from 'path'

async function indexClaudeStudio() {
  const studioPath = path.resolve('..')
  const apiKey = process.env.ELECTRONHUB_API_KEY || 
    process.env.VITE_ELECTRONHUB_API_KEY ||
    process.env.npm_config_electronhub_api_key
  
  if (!apiKey) {
    console.error('❌ No API key found. Set ELECTRONHUB_API_KEY environment variable.')
    process.exit(1)
  }

  console.log('🔍 Indexing Claude Studio project...')
  console.log(`📁 Path: ${studioPath}`)
  
  try {
    // Create search engine with custom configuration
    const engine = await createSearchEngine(studioPath, {
      apiKey,
      indexPath: '.claude-studio-search-index.json',
      batchSize: 50, // Smaller batches for large project
      rateLimitDelay: 2000 // Longer delay between batches
    })
    
    // Build index with force to ensure fresh
    const stats = await engine.buildIndex(true)
    
    console.log('\n✅ Successfully indexed Claude Studio!')
    console.log('📊 Statistics:')
    console.log(`   - Total files: ${stats.totalDocuments}`)
    console.log(`   - Total functions: ${stats.totalFunctions}`)
    console.log(`   - Index size: ${(stats.indexSizeBytes / 1024 / 1024).toFixed(2)} MB`)
    
    // Test a few searches
    console.log('\n🧪 Testing searches...')
    
    const searches = [
      'project management',
      'agent configuration',
      'chat interface',
      'workspace layout'
    ]
    
    for (const query of searches) {
      const results = await engine.search(query, 3)
      console.log(`\n📍 "${query}": ${results.length} results`)
      if (results.length > 0) {
        console.log(`   Top match: ${results[0].functionName} (${results[0].score.toFixed(3)})`)
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error indexing:', error)
    process.exit(1)
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  indexClaudeStudio()
}