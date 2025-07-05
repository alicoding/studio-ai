/**
 * Embedding service for ElectronHub API
 * 
 * SOLID: Single responsibility - embedding generation only
 * DRY: Reusable embedding logic
 * KISS: Direct fetch API usage
 * Library-First: No custom HTTP client needed
 */

import type { SearchConfig, EmbeddingResponse } from './types.js'

export class EmbeddingService {
  constructor(private config: SearchConfig) {}

  /**
   * Generate embeddings for multiple texts with automatic batching
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const results: number[][] = []
    
    // Process in batches
    for (let i = 0; i < texts.length; i += this.config.batchSize) {
      const batch = texts.slice(i, i + this.config.batchSize)
      
      const embeddings = await this.generateBatch(batch)
      results.push(...embeddings)
      
      // Rate limit protection
      if (i + this.config.batchSize < texts.length) {
        await this.delay(this.config.rateLimitDelay)
      }
    }
    
    return results
  }

  /**
   * Generate embeddings for a single batch
   */
  private async generateBatch(texts: string[]): Promise<number[][]> {
    const response = await fetch(`${this.config.apiUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model,
        input: texts
      })
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`ElectronHub API error: ${response.status} - ${error}`)
    }
    
    const data = await response.json() as EmbeddingResponse
    return data.data.map(item => item.embedding)
  }

  /**
   * Delay helper for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}