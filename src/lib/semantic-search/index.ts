/**
 * Semantic Search Core Library
 * 
 * SOLID: Single responsibility - semantic search functionality
 * DRY: Shared between CLI and web service
 * KISS: Simple interface for both use cases
 * Library-First: Uses @xenova/transformers
 */

export { SimpleSemanticSearch } from '../../services/SimpleSemanticSearch'
export type { SearchResult, IndexStats } from '../../services/SimpleSemanticSearch'

/**
 * Convenience function for CLI usage
 */
export async function buildIndex(
  projectPath: string,
  options: {
    force?: boolean
    onProgress?: (message: string) => void
  } = {}
): Promise<{
  success: boolean
  stats?: import('../../services/SimpleSemanticSearch').IndexStats
  error?: string
}> {
  try {
    const { SimpleSemanticSearch } = await import('../../services/SimpleSemanticSearch')
    const search = new SimpleSemanticSearch(projectPath)
    
    if (options.onProgress) {
      // Hook into console.log for progress updates
      const originalLog = console.log
      console.log = (...args) => {
        const message = args.join(' ')
        if (message.includes('[SimpleSemanticSearch]')) {
          options.onProgress?.(message)
        }
        originalLog(...args)
      }
    }
    
    const stats = await search.buildIndex(options.force || false)
    
    return {
      success: true,
      stats
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to build index'
    }
  }
}

/**
 * Search function for CLI usage
 */
export async function search(
  projectPath: string,
  query: string,
  limit = 10
): Promise<{
  success: boolean
  results?: import('../../services/SimpleSemanticSearch').SearchResult[]
  error?: string
}> {
  try {
    const { SimpleSemanticSearch } = await import('../../services/SimpleSemanticSearch')
    const search = new SimpleSemanticSearch(projectPath)
    const results = await search.search(query, limit)
    
    return {
      success: true,
      results
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Search failed'
    }
  }
}