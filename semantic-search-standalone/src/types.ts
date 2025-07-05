/**
 * Type definitions for semantic search
 * 
 * SOLID: Interface segregation - small, focused interfaces
 * DRY: Shared types across the project
 */

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

export interface CodeEntry {
  id: string
  file: string
  functionName: string
  code: string
  line: number
  embedding: number[]
  hash: string
}

export interface SearchIndex {
  version: string
  projectPath: string
  created: number
  updated: number
  entries: CodeEntry[]
}

export interface EmbeddingResponse {
  data: Array<{
    embedding: number[]
    index: number
    object: string
  }>
  model: string
  usage: {
    prompt_tokens: number
    total_tokens: number
  }
}

export interface SearchConfig {
  apiKey: string
  apiUrl: string
  model: string
  batchSize: number
  rateLimitDelay: number
  indexPath: string
}