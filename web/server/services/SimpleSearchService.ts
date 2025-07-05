/**
 * Simple Search Service - Backend integration
 * 
 * SOLID: Single responsibility - handles search operations
 * DRY: Reuses SimpleSemanticSearch from frontend
 * KISS: Direct integration without complex protocols
 * Library-First: Uses existing SimpleSemanticSearch
 */

import { SimpleSemanticSearch, type SearchResult, type IndexStats } from '../../../src/services/SimpleSemanticSearch'

export class SimpleSearchService {
  private static instances: Map<string, SimpleSemanticSearch> = new Map()
  
  /**
   * Get or create search instance for a project
   */
  static getInstance(projectPath: string): SimpleSemanticSearch {
    if (!this.instances.has(projectPath)) {
      this.instances.set(projectPath, new SimpleSemanticSearch(projectPath))
    }
    return this.instances.get(projectPath)!
  }
  
  /**
   * Index a project
   */
  static async indexProject(projectPath: string, force = false): Promise<{ success: boolean; stats?: IndexStats; error?: string }> {
    try {
      const search = this.getInstance(projectPath)
      const stats = await search.buildIndex(force)
      
      return {
        success: true,
        stats
      }
    } catch (error) {
      console.error('[SimpleSearchService] Index error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to index project'
      }
    }
  }
  
  /**
   * Search in a project
   */
  static async search(
    query: string, 
    projectPath?: string, 
    limit = 10
  ): Promise<{ success: boolean; results?: SearchResult[]; message?: string; error?: string }> {
    try {
      if (!projectPath) {
        return {
          success: false,
          error: 'Project path is required'
        }
      }
      
      const search = this.getInstance(projectPath)
      const results = await search.search(query, limit)
      
      return {
        success: true,
        results
      }
    } catch (error) {
      console.error('[SimpleSearchService] Search error:', error)
      
      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message.includes('No index available')) {
          return {
            success: true,
            results: [],
            message: 'Search index needs to be rebuilt. Please re-index the project.'
          }
        }
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed'
      }
    }
  }
  
  /**
   * Get index statistics
   */
  static async getStats(projectPath?: string): Promise<{ success: boolean; stats?: IndexStats; error?: string }> {
    try {
      if (!projectPath) {
        return {
          success: false,
          error: 'Project path is required'
        }
      }
      
      const search = this.getInstance(projectPath)
      const stats = await search.getStats()
      
      return {
        success: true,
        stats
      }
    } catch (error) {
      console.error('[SimpleSearchService] Stats error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get stats'
      }
    }
  }
}