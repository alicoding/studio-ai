/**
 * Configuration management
 * 
 * SOLID: Single responsibility - configuration only
 * KISS: Simple environment-based config
 * Library-First: Uses dotenv for env management
 */

import { config as loadEnv } from 'dotenv'
import type { SearchConfig } from './types.js'

// Load environment variables
loadEnv()

export function getConfig(): SearchConfig {
  const apiKey = process.env.ELECTRONHUB_API_KEY
  if (!apiKey) {
    throw new Error('ELECTRONHUB_API_KEY environment variable is required')
  }

  return {
    apiKey,
    apiUrl: process.env.ELECTRONHUB_API_URL || 'https://api.electronhub.ai/v1',
    model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
    batchSize: parseInt(process.env.BATCH_SIZE || '100', 10),
    rateLimitDelay: parseInt(process.env.RATE_LIMIT_DELAY || '1000', 10),
    indexPath: process.env.INDEX_PATH || '.semantic-search-index.json'
  }
}