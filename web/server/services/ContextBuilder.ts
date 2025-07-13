/**
 * ContextBuilder - Builds context for AI requests from files and project data
 * 
 * SOLID: Single responsibility - context building from various sources
 * DRY: Reusable context building for all AI operations
 * KISS: Simple file reading and context assembly
 * Library-First: Uses Node.js fs/promises and existing patterns
 */

import fs from 'fs/promises'
import path from 'path'
import { createStorage } from '../../../src/lib/storage/UnifiedStorage'

export interface ContextRequest {
  projectId?: string
  projectPath?: string
  filePaths?: string[]
  includeProjectTree?: boolean
  maxTokens?: number
  excludePatterns?: string[]
}

export interface FileContent {
  path: string
  content: string
  size: number
  lastModified: Date
  type: 'file' | 'directory'
}

export interface ProjectContext {
  projectPath?: string
  projectTree?: string
  files: FileContent[]
  totalSize: number
  totalFiles: number
  truncated: boolean
  metadata: {
    projectId?: string
    contextType: 'files' | 'project' | 'mixed'
    generatedAt: Date
  }
}

export class ContextBuilder {
  private static instance: ContextBuilder
  private contextStorage = createStorage({
    namespace: 'ai-context-cache',
    type: 'session'
  })

  // Default exclusion patterns (similar to .gitignore)
  private readonly defaultExcludes = [
    'node_modules/**',
    '.git/**',
    'dist/**',
    'build/**',
    '*.log',
    '*.tmp',
    '.DS_Store',
    'Thumbs.db',
    '*.jpg',
    '*.jpeg',
    '*.png',
    '*.gif',
    '*.ico',
    '*.pdf',
    '*.zip',
    '*.tar.gz',
    '*.exe',
    '*.dll',
    '*.so'
  ]

  private constructor() {}

  static getInstance(): ContextBuilder {
    if (!ContextBuilder.instance) {
      ContextBuilder.instance = new ContextBuilder()
    }
    return ContextBuilder.instance
  }

  /**
   * Build context from files and project data
   */
  async buildContext(request: ContextRequest): Promise<ProjectContext> {
    const startTime = Date.now()
    const maxTokens = request.maxTokens || 50000 // Conservative default
    const excludePatterns = [...this.defaultExcludes, ...(request.excludePatterns || [])]

    try {
      const files: FileContent[] = []
      let projectTree = ''
      let totalSize = 0
      let truncated = false

      // Build project tree if requested
      if (request.includeProjectTree && request.projectPath) {
        projectTree = await this.buildProjectTree(request.projectPath, excludePatterns)
        totalSize += projectTree.length
      }

      // Read specific files if provided
      if (request.filePaths && request.filePaths.length > 0) {
        for (const filePath of request.filePaths) {
          // Check token limit before reading more files
          if (totalSize > maxTokens * 3) { // Rough estimate: 1 token ≈ 3 chars
            truncated = true
            break
          }

          try {
            const fileContent = await this.readFileContent(filePath, excludePatterns)
            if (fileContent) {
              files.push(fileContent)
              totalSize += fileContent.size
            }
          } catch (error) {
            console.warn(`[ContextBuilder] Failed to read file ${filePath}:`, error)
            // Continue with other files
          }
        }
      }

      const context: ProjectContext = {
        projectPath: request.projectPath,
        projectTree: projectTree || undefined,
        files,
        totalSize,
        totalFiles: files.length,
        truncated,
        metadata: {
          projectId: request.projectId,
          contextType: this.determineContextType(request),
          generatedAt: new Date()
        }
      }

      // Cache context for potential reuse
      if (request.projectId) {
        await this.cacheContext(request.projectId, context)
      }

      // Log summary if in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[ContextBuilder] Built context in ${Date.now() - startTime}ms: ${files.length} files, ${totalSize} chars`)
      }
      
      return context
    } catch (error) {
      console.error('[ContextBuilder] Failed to build context:', error)
      throw new Error(`Context building failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Read a single file's content
   */
  private async readFileContent(filePath: string, excludePatterns: string[]): Promise<FileContent | null> {
    try {
      // Check if file should be excluded
      if (this.shouldExclude(filePath, excludePatterns)) {
        return null
      }

      // Check if file exists and get stats
      const stats = await fs.stat(filePath)
      
      if (stats.isDirectory()) {
        return {
          path: filePath,
          content: '<directory>',
          size: 0,
          lastModified: stats.mtime,
          type: 'directory'
        }
      }

      // Skip very large files (>1MB)
      if (stats.size > 1024 * 1024) {
        console.warn(`[ContextBuilder] Skipping large file: ${filePath} (${stats.size} bytes)`)
        return null
      }

      // Read file content
      const content = await fs.readFile(filePath, 'utf-8')
      
      return {
        path: filePath,
        content,
        size: content.length,
        lastModified: stats.mtime,
        type: 'file'
      }
    } catch (error) {
      // Handle binary files or permission errors gracefully
      if (error instanceof Error && error.message.includes('ENOENT')) {
        console.warn(`[ContextBuilder] File not found: ${filePath}`)
      } else if (error instanceof Error && error.message.includes('binary')) {
        console.warn(`[ContextBuilder] Skipping binary file: ${filePath}`)
      }
      return null
    }
  }

  /**
   * Build a project tree structure
   */
  private async buildProjectTree(projectPath: string, excludePatterns: string[], maxDepth = 3): Promise<string> {
    try {
      const tree = await this.buildTreeRecursive(projectPath, '', 0, maxDepth, excludePatterns)
      return tree
    } catch (error) {
      console.error('[ContextBuilder] Failed to build project tree:', error)
      return `Error building project tree: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }

  /**
   * Recursively build directory tree
   */
  private async buildTreeRecursive(
    dirPath: string, 
    prefix: string, 
    depth: number, 
    maxDepth: number,
    excludePatterns: string[]
  ): Promise<string> {
    if (depth > maxDepth) {
      return ''
    }

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })
      let tree = ''

      // Sort entries: directories first, then files
      const sortedEntries = entries.sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1
        if (!a.isDirectory() && b.isDirectory()) return 1
        return a.name.localeCompare(b.name)
      })

      for (let i = 0; i < sortedEntries.length; i++) {
        const entry = sortedEntries[i]
        const fullPath = path.join(dirPath, entry.name)
        
        // Check exclusion patterns
        if (this.shouldExclude(fullPath, excludePatterns)) {
          continue
        }

        const isLast = i === sortedEntries.length - 1
        const connector = isLast ? '└── ' : '├── '
        const nextPrefix = prefix + (isLast ? '    ' : '│   ')

        tree += `${prefix}${connector}${entry.name}${entry.isDirectory() ? '/' : ''}\n`

        if (entry.isDirectory() && depth < maxDepth) {
          tree += await this.buildTreeRecursive(fullPath, nextPrefix, depth + 1, maxDepth, excludePatterns)
        }
      }

      return tree
    } catch (error) {
      return `${prefix}[Error reading directory: ${error instanceof Error ? error.message : 'Unknown'}]\n`
    }
  }

  /**
   * Check if a path should be excluded based on patterns
   */
  private shouldExclude(filePath: string, patterns: string[]): boolean {
    const normalizedPath = filePath.replace(/\\/g, '/') // Normalize Windows paths
    const filename = path.basename(normalizedPath)
    
    return patterns.some(pattern => {
      // Handle file extension patterns (e.g., *.log, *.tmp)
      if (pattern.startsWith('*.')) {
        const extension = pattern.substring(1) // Remove the *
        return filename.endsWith(extension)
      }
      
      // Handle directory patterns (e.g., node_modules/**, .git/**)
      if (pattern.includes('/')) {
        const regex = new RegExp(
          pattern
            .replace(/\*\*/g, '.*')  // ** matches any number of directories
            .replace(/\*/g, '[^/]*') // * matches anything except path separator
            .replace(/\?/g, '.')     // ? matches single character
        )
        return regex.test(normalizedPath)
      }
      
      // Handle exact filename matches
      return filename === pattern
    })
  }

  /**
   * Determine the type of context being built
   */
  private determineContextType(request: ContextRequest): 'files' | 'project' | 'mixed' {
    const hasFiles = request.filePaths && request.filePaths.length > 0
    const hasProjectTree = request.includeProjectTree
    
    if (hasFiles && hasProjectTree) return 'mixed'
    if (hasFiles) return 'files'
    return 'project'
  }

  /**
   * Cache context for reuse
   */
  private async cacheContext(projectId: string, context: ProjectContext): Promise<void> {
    try {
      const cacheKey = `context:${projectId}:${Date.now()}`
      await this.contextStorage.set(cacheKey, context, 300) // 5 minute TTL
    } catch (error) {
      console.warn('[ContextBuilder] Failed to cache context:', error)
      // Non-critical error, continue
    }
  }

  /**
   * Get cached context if available
   */
  async getCachedContext(projectId: string): Promise<ProjectContext | null> {
    try {
      const keys = await this.contextStorage.keys()
      const contextKeys = keys.filter(key => key.startsWith(`context:${projectId}:`))
      
      if (contextKeys.length === 0) {
        return null
      }

      // Get the most recent context
      const latestKey = contextKeys.sort().pop()!
      return await this.contextStorage.get<ProjectContext>(latestKey)
    } catch (error) {
      console.warn('[ContextBuilder] Failed to get cached context:', error)
      return null
    }
  }

  /**
   * Clear cached contexts for a project
   */
  async clearCache(projectId?: string): Promise<void> {
    try {
      const keys = await this.contextStorage.keys()
      const keysToDelete = projectId 
        ? keys.filter(key => key.startsWith(`context:${projectId}:`))
        : keys.filter(key => key.startsWith('context:'))
      
      await this.contextStorage.deleteMany(keysToDelete)
      console.log(`[ContextBuilder] Cleared ${keysToDelete.length} cached contexts`)
    } catch (error) {
      console.error('[ContextBuilder] Failed to clear cache:', error)
    }
  }
}