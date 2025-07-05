/**
 * Core semantic search engine
 * 
 * SOLID: Open/closed principle - extensible search functionality
 * DRY: Centralized search logic
 * KISS: Simple vector similarity search
 * Library-First: Uses glob for file discovery
 */

import { glob } from 'glob'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as crypto from 'crypto'
import type { SearchResult, IndexStats, CodeEntry, SearchIndex, SearchConfig } from './types.js'
import { EmbeddingService } from './embeddings.js'
import { CodeParser } from './code-parser.js'

export class SemanticSearchEngine {
  private index: Map<string, CodeEntry> = new Map()
  private embeddings: EmbeddingService
  private parser: CodeParser
  private indexPath: string

  constructor(
    private projectPath: string,
    config: SearchConfig
  ) {
    this.embeddings = new EmbeddingService(config)
    this.parser = new CodeParser()
    this.indexPath = path.join(projectPath, config.indexPath)
  }

  /**
   * Build search index for the project
   */
  async buildIndex(force: boolean = false): Promise<IndexStats> {
    // Try to load existing index if not forcing rebuild
    if (!force && await this.loadIndex()) {
      return this.getStats()
    }

    console.log('Building search index...')
    this.index.clear()

    // Find all code files
    const files = await glob('**/*.{ts,tsx,js,jsx}', {
      cwd: this.projectPath,
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.next/**',
        '**/coverage/**',
        '**/*.test.*',
        '**/*.spec.*',
        '**/test-codebase/**',
        '**/breeze/**',
        '**/prototype/**',
        '**/public/**',
        '**/*.min.js',
        '**/*.bundle.js',
        '**/lib/**',
        '**/.studio-search-index/**',
        '**/semantic-search-standalone/**',
        '**/*.d.ts',
        '**/test/**',
        '**/__tests__/**',
        '**/migrate-*.ts'
      ]
    })

    console.log(`Found ${files.length} files to index`)

    // Extract functions from each file
    const allTexts: string[] = []
    const pendingEntries: Omit<CodeEntry, 'embedding'>[] = []

    for (const file of files) {
      const filePath = path.join(this.projectPath, file)
      const content = await fs.readFile(filePath, 'utf-8')
      const functions = this.parser.extractFunctions(content, file)
      
      for (const func of functions) {
        const entry = {
          id: crypto.randomBytes(16).toString('hex'),
          file,
          functionName: func.name,
          code: func.code,
          line: func.line,
          hash: crypto.createHash('sha256').update(content).digest('hex')
        }
        
        pendingEntries.push(entry)
        allTexts.push(`${func.name} ${func.code}`)
      }
    }

    // Generate embeddings for all functions
    console.log(`Generating embeddings for ${allTexts.length} functions...`)
    const embeddings = await this.embeddings.generateEmbeddings(allTexts)

    // Create complete entries with embeddings
    for (let i = 0; i < pendingEntries.length; i++) {
      const entry: CodeEntry = {
        ...pendingEntries[i],
        embedding: embeddings[i]
      }
      this.index.set(entry.id, entry)
    }

    // Save index
    await this.saveIndex()
    console.log(`Indexed ${this.index.size} functions from ${files.length} files`)
    
    return this.getStats()
  }

  /**
   * Search for code using natural language query
   */
  async search(query: string, limit: number = 10): Promise<SearchResult[]> {
    if (this.index.size === 0) {
      await this.loadIndex()
    }

    if (this.index.size === 0) {
      throw new Error('No search index available. Please build the index first.')
    }

    // Generate embedding for query
    const [queryEmbedding] = await this.embeddings.generateEmbeddings([query])

    // Calculate similarities
    const results: Array<{ entry: CodeEntry; score: number }> = []
    
    for (const entry of this.index.values()) {
      const score = this.cosineSimilarity(queryEmbedding, entry.embedding)
      results.push({ entry, score })
    }

    // Sort by score and return top results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ entry, score }) => ({
        file: entry.file,
        functionName: entry.functionName,
        code: entry.code,
        line: entry.line,
        score
      }))
  }

  /**
   * Get index statistics
   */
  async getStats(): Promise<IndexStats> {
    try {
      const stats = await fs.stat(this.indexPath)
      return {
        totalDocuments: new Set(Array.from(this.index.values()).map(e => e.file)).size,
        totalFunctions: this.index.size,
        indexSizeBytes: stats.size,
        lastUpdated: stats.mtimeMs
      }
    } catch {
      return {
        totalDocuments: 0,
        totalFunctions: 0,
        indexSizeBytes: 0,
        lastUpdated: 0
      }
    }
  }

  /**
   * Load index from disk
   */
  private async loadIndex(): Promise<boolean> {
    try {
      const data = await fs.readFile(this.indexPath, 'utf-8')
      const savedIndex: SearchIndex = JSON.parse(data)
      
      this.index.clear()
      for (const entry of savedIndex.entries) {
        this.index.set(entry.id, entry)
      }
      
      console.log(`Loaded ${this.index.size} entries from existing index`)
      return true
    } catch {
      return false
    }
  }

  /**
   * Save index to disk
   */
  private async saveIndex(): Promise<void> {
    const indexDir = path.dirname(this.indexPath)
    await fs.mkdir(indexDir, { recursive: true })

    const searchIndex: SearchIndex = {
      version: '1.0.0',
      projectPath: this.projectPath,
      created: Date.now(),
      updated: Date.now(),
      entries: Array.from(this.index.values())
    }

    await fs.writeFile(this.indexPath, JSON.stringify(searchIndex, null, 2))
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      console.warn('Vector dimension mismatch:', a.length, 'vs', b.length)
      return 0
    }

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
  }
}