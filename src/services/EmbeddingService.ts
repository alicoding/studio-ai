/**
 * Embedding Service - Shared configuration for embeddings
 * 
 * SOLID: Single responsibility - manage embedding configuration
 * DRY: Centralized ElectronHub configuration
 * KISS: Simple singleton pattern
 * Library-First: Uses OpenAI SDK
 */

import OpenAI from 'openai'

export class EmbeddingService {
  private static instance: EmbeddingService
  private openai: OpenAI | null = null
  
  static getInstance(): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService()
    }
    return EmbeddingService.instance
  }
  
  getClient(): OpenAI {
    if (!this.openai) {
      const apiKey = process.env.ELECTRONHUB_API_KEY || process.env.VITE_ELECTRONHUB_API_KEY
      const baseURL = process.env.ELECTRONHUB_API_URL || process.env.VITE_ELECTRONHUB_API_URL || 'https://api.electronhub.ai/v1'
      
      if (!apiKey) {
        throw new Error('ElectronHub API key not configured. Please set ELECTRONHUB_API_KEY environment variable.')
      }
      
      this.openai = new OpenAI({
        apiKey,
        baseURL
      })
    }
    
    return this.openai
  }
  
  /**
   * Generate embeddings with automatic batching
   */
  async generateEmbeddings(
    texts: string[],
    model = 'text-embedding-3-small'  // Use newer model that might work better
  ): Promise<number[][]> {
    const apiKey = process.env.ELECTRONHUB_API_KEY || process.env.VITE_ELECTRONHUB_API_KEY
    const baseURL = process.env.ELECTRONHUB_API_URL || process.env.VITE_ELECTRONHUB_API_URL || 'https://api.electronhub.ai/v1'
    
    if (!apiKey) {
      throw new Error('ElectronHub API key not configured')
    }
    
    const BATCH_SIZE = 100
    const results: number[][] = []
    
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE)
      
      // Use direct fetch instead of OpenAI SDK due to compatibility issues
      const response = await fetch(`${baseURL}/embeddings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          input: batch
        })
      })
      
      if (!response.ok) {
        throw new Error(`ElectronHub API error: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      results.push(...data.data.map((d: { embedding: number[] }) => d.embedding))
      
      // Rate limit protection
      if (i + BATCH_SIZE < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    return results
  }
}