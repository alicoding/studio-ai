/**
 * Main entry point for semantic search library
 * 
 * SOLID: Dependency inversion - export interfaces and implementations
 * DRY: Single export point
 */

// Export all types
export * from './types.js'

// Export main classes
export { SemanticSearchEngine } from './search-engine.js'
export { EmbeddingService } from './embeddings.js'
export { CodeParser } from './code-parser.js'

// Export configuration
export { getConfig } from './config.js'

// Export a convenience function for quick usage
import type { SearchConfig } from './types.js'
import { SemanticSearchEngine } from './search-engine.js'

export async function createSearchEngine(
  projectPath: string,
  config?: Partial<SearchConfig>
): Promise<SemanticSearchEngine> {
  const fullConfig: SearchConfig = {
    apiKey: config?.apiKey || process.env.ELECTRONHUB_API_KEY || '',
    apiUrl: config?.apiUrl || process.env.ELECTRONHUB_API_URL || 'https://api.electronhub.ai/v1',
    model: config?.model || process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
    batchSize: config?.batchSize || 100,
    rateLimitDelay: config?.rateLimitDelay || 1000,
    indexPath: config?.indexPath || '.semantic-search-index.json'
  }
  
  if (!fullConfig.apiKey) {
    throw new Error('API key is required. Set ELECTRONHUB_API_KEY or pass it in config.')
  }
  
  return new SemanticSearchEngine(projectPath, fullConfig)
}