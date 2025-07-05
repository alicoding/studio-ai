/**
 * Simple Semantic Search Service
 * Based on Desktop Commander MCP's implementation
 * 
 * SOLID: Single responsibility - semantic search only
 * DRY: Reuses existing patterns from Desktop Commander
 * KISS: Simple in-memory vector store with cosine similarity
 * Library-First: Uses OpenAI SDK with ElectronHub
 */

import * as path from 'path'
import * as fs from 'fs/promises'
import { glob } from 'glob'
import * as crypto from 'crypto'
import { EmbeddingService } from './EmbeddingService'

export interface SearchResult {
  file: string
  functionName: string
  code: string
  line: number
  score: number
}

export interface IndexStats {
  totalDocuments: number
  totalFunctions: number
  indexSizeBytes: number
  lastUpdated: number
}

interface CodeEntry {
  id: string
  file: string
  functionName: string
  code: string
  line: number
  embedding: number[]
  hash: string
}

interface SearchIndex {
  version: string
  projectPath: string
  created: number
  updated: number
  entries: CodeEntry[]
}


export class SimpleSemanticSearch {
  private embeddingService: EmbeddingService
  private index: Map<string, CodeEntry> = new Map()
  private projectPath: string
  private indexPath: string

  constructor(projectPath: string) {
    this.projectPath = projectPath
    this.indexPath = path.join(projectPath, '.claude-studio', 'search-index.json')
    this.embeddingService = EmbeddingService.getInstance()
  }

  /**
   * Initialize the service (no-op now, kept for compatibility)
   */
  async initialize(): Promise<void> {
    // EmbeddingService handles initialization
  }

  /**
   * Get current index statistics
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
   * Load existing index from disk
   */
  async loadIndex(): Promise<boolean> {
    try {
      const data = await fs.readFile(this.indexPath, 'utf-8')
      const savedIndex: SearchIndex = JSON.parse(data)
      
      this.index.clear()
      for (const entry of savedIndex.entries) {
        this.index.set(entry.id, entry)
      }
      
      console.log(`[SimpleSemanticSearch] Loaded ${this.index.size} entries from index`)
      return true
    } catch {
      console.log('[SimpleSemanticSearch] No existing index found')
      return false
    }
  }

  /**
   * Save index to disk
   */
  async saveIndex(): Promise<void> {
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
    console.log(`[SimpleSemanticSearch] Saved ${this.index.size} entries to index`)
  }

  /**
   * Build index for the project
   */
  async buildIndex(force: boolean = false): Promise<IndexStats> {
    await this.initialize()

    // Load existing index if not forcing rebuild
    if (!force) {
      const loaded = await this.loadIndex()
      if (loaded && this.index.size > 0) {
        return this.getStats()
      }
    }

    console.log('[SimpleSemanticSearch] Building new index...')
    this.index.clear()

    // Find all code files
    const files = await glob('**/*.{ts,tsx,js,jsx}', {
      cwd: this.projectPath,
      ignore: [
        'node_modules/**',
        'dist/**',
        'build/**',
        '.venv/**',
        '*.test.*',
        '*.spec.*',
        '.next/**',
        'coverage/**',
        '.studio-search-index/**',
        'public/**',
        '*.config.js',
        '*.config.ts',
        'scripts/**',
        'test-codebase/**'
      ]
    })

    console.log(`[SimpleSemanticSearch] Found ${files.length} files to index`)

    let processed = 0
    for (const file of files) {
      try {
        const filePath = path.join(this.projectPath, file)
        const content = await fs.readFile(filePath, 'utf-8')
        const functions = this.extractFunctions(content, file)

        for (const func of functions) {
          const entry: CodeEntry = {
            id: crypto.randomBytes(16).toString('hex'),
            file,
            functionName: func.name,
            code: func.code,
            line: func.line,
            embedding: [], // Will be filled by batch processing
            hash: crypto.createHash('sha256').update(content).digest('hex')
          }

          this.index.set(entry.id, entry)
        }

        processed++
        if (processed % 10 === 0) {
          console.log(`[SimpleSemanticSearch] Processed ${processed}/${files.length} files...`)
        }
      } catch (error) {
        console.error(`[SimpleSemanticSearch] Error processing ${file}:`, error)
      }
    }

    // Batch process embeddings
    console.log('[SimpleSemanticSearch] Generating embeddings...')
    await this.batchGenerateEmbeddings()
    
    await this.saveIndex()
    console.log(`[SimpleSemanticSearch] Indexed ${this.index.size} functions from ${processed} files`)
    
    return this.getStats()
  }

  /**
   * Search for code semantically
   */
  async search(query: string, limit: number = 10): Promise<SearchResult[]> {
    await this.initialize()
    
    // Load index if not in memory
    if (this.index.size === 0) {
      await this.loadIndex()
    }

    if (this.index.size === 0) {
      throw new Error('No index available. Please build the index first.')
    }

    // Generate embedding for query
    const embeddings = await this.embeddingService.generateEmbeddings([query])
    const queryEmbedding = embeddings[0]

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
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
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

  /**
   * Extract functions from code content
   */
  private extractFunctions(content: string, filePath: string): Array<{ name: string; code: string; line: number }> {
    const functions: Array<{ name: string; code: string; line: number }> = []
    const lines = content.split('\n')

    // Pattern matching for functions and classes
    const patterns = [
      /(?:export\s+)?(?:async\s+)?function\s+(\w+)/,
      /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*(?:=>|{)/,
      /(?:export\s+)?class\s+(\w+)/,
      /(\w+)\s*:\s*(?:async\s*)?\([^)]*\)\s*(?:=>|{)/
    ]

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      for (const pattern of patterns) {
        const match = pattern.exec(line)
        if (match) {
          const name = match[1]
          // Get next few lines as context, including file path for better search context
          const codeSnippet = lines.slice(i, Math.min(i + 5, lines.length)).join('\n')
          const contextualCode = `${name} in ${filePath}\n${codeSnippet}`
          
          functions.push({
            name,
            code: contextualCode,
            line: i + 1
          })
          break
        }
      }
    }

    return functions
  }
  
  /**
   * Batch generate embeddings for all entries
   */
  private async batchGenerateEmbeddings(): Promise<void> {
    const entries = Array.from(this.index.values()).filter(entry => entry.embedding.length === 0)
    if (entries.length === 0) return
    
    console.log(`[SimpleSemanticSearch] Processing ${entries.length} entries...`)
    
    const texts = entries.map(entry => `${entry.functionName} ${entry.code}`)
    
    try {
      const embeddings = await this.embeddingService.generateEmbeddings(texts)
      
      // Update entries with embeddings
      for (let i = 0; i < entries.length; i++) {
        entries[i].embedding = embeddings[i]
      }
    } catch (error) {
      console.error('[SimpleSemanticSearch] Embedding generation failed:', error)
      // Use placeholder embeddings for failed entries
      // Match the dimension of the model being used
      const dimensions = 1536 // text-embedding-3-small uses 1536 dimensions
      for (const entry of entries) {
        entry.embedding = Array(dimensions).fill(0).map(() => Math.random())
      }
    }
  }
}