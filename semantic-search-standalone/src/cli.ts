#!/usr/bin/env node

/**
 * CLI for semantic search
 * 
 * SOLID: Interface segregation - CLI separate from core logic
 * KISS: Simple command structure
 * Library-First: Uses commander for CLI parsing
 */

import { Command } from 'commander'
import * as path from 'path'
import { SemanticSearchEngine } from './search-engine.js'
import { getConfig } from './config.js'

const program = new Command()

program
  .name('semantic-search')
  .description('Semantic code search using natural language')
  .version('1.0.0')

// Index command
program
  .command('index [project-path]')
  .description('Build search index for a project')
  .option('-f, --force', 'Force rebuild even if index exists')
  .action(async (projectPath?: string, options?: { force?: boolean }) => {
    try {
      const config = getConfig()
      const targetPath = projectPath ? path.resolve(projectPath) : process.cwd()
      
      console.log(`📁 Project: ${targetPath}`)
      
      const engine = new SemanticSearchEngine(targetPath, config)
      const stats = await engine.buildIndex(options?.force || false)
      
      console.log('\n✅ Index built successfully!')
      console.log(`📊 Statistics:`)
      console.log(`   - Total documents: ${stats.totalDocuments}`)
      console.log(`   - Total functions: ${stats.totalFunctions}`)
      console.log(`   - Index size: ${(stats.indexSizeBytes / 1024).toFixed(2)} KB`)
      
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

// Search command
program
  .command('search <query> [project-path]')
  .description('Search for code using natural language')
  .option('-l, --limit <number>', 'Maximum results to return', '10')
  .option('-s, --min-score <number>', 'Minimum similarity score', '0.3')
  .action(async (query: string, projectPath?: string, options?: { limit?: string; minScore?: string }) => {
    try {
      const config = getConfig()
      const targetPath = projectPath ? path.resolve(projectPath) : process.cwd()
      const limit = parseInt(options?.limit || '10', 10)
      const minScore = parseFloat(options?.minScore || '0.3')
      
      const engine = new SemanticSearchEngine(targetPath, config)
      const results = await engine.search(query, limit)
      
      // Filter by minimum score
      const filtered = results.filter(r => r.score >= minScore)
      
      if (filtered.length === 0) {
        console.log('No results found')
        return
      }
      
      console.log(`\nFound ${filtered.length} results for "${query}":\n`)
      
      filtered.forEach((result, index) => {
        console.log(`${index + 1}. ${result.functionName} (Score: ${result.score.toFixed(4)})`)
        console.log(`   📁 ${result.file}:${result.line}`)
        console.log(`   📝 ${result.code.split('\n')[0]}...`)
        console.log()
      })
      
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

// Stats command
program
  .command('stats [project-path]')
  .description('Show index statistics')
  .action(async (projectPath?: string) => {
    try {
      const config = getConfig()
      const targetPath = projectPath ? path.resolve(projectPath) : process.cwd()
      
      const engine = new SemanticSearchEngine(targetPath, config)
      const stats = await engine.getStats()
      
      if (stats.totalFunctions === 0) {
        console.log('No index found. Run "semantic-search index" first.')
        return
      }
      
      console.log('\n📊 Index Statistics:')
      console.log(`   - Total documents: ${stats.totalDocuments}`)
      console.log(`   - Total functions: ${stats.totalFunctions}`)
      console.log(`   - Index size: ${(stats.indexSizeBytes / 1024).toFixed(2)} KB`)
      console.log(`   - Last updated: ${new Date(stats.lastUpdated).toLocaleString()}`)
      
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

program.parse()