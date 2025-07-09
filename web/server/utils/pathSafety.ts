/**
 * Path Safety Utilities
 *
 * SOLID: Single responsibility - path validation and safe operations
 * KISS: Simple validation rules with clear error messages
 * Library-First: Uses is-path-inside, is-valid-path, path-is-absolute, trash
 */

import os from 'os'
import path from 'path'
import isPathInside from 'is-path-inside'
import isValidPath from 'is-valid-path'
import pathIsAbsolute from 'path-is-absolute'
import trash from 'trash'

// System paths that should never be used as project directories
const SYSTEM_PATHS = [
  '/', // Root
  os.homedir(), // User home directory directly
  // Common system directories across platforms
  ...[
    '/System',
    '/Library',
    '/usr',
    '/bin',
    '/sbin',
    '/etc',
    '/var',
    '/Applications',
    '/Windows',
    '/Program Files',
    '/Program Files (x86)',
    'C:\\',
    'C:\\Windows',
    'C:\\Program Files',
  ].filter((p) => isValidPath(p)),
]

// Safe parent directories for projects
const SAFE_PARENTS = [
  'projects',
  'workspace',
  'code',
  'dev',
  'development',
  'repos',
  'repositories',
  'src',
  'work',
  'tmp',
  'temp',
]

export interface PathValidationResult {
  isValid: boolean
  error?: string
  normalizedPath?: string
  expandedPath?: string
}

/**
 * Expand ~ in paths safely
 */
export function expandPath(filePath: string): string {
  if (filePath.startsWith('~/')) {
    return path.join(os.homedir(), filePath.slice(2))
  }
  return filePath
}

/**
 * Validate that a path is safe for use as a project directory
 */
export function validateProjectPath(inputPath: string): PathValidationResult {
  try {
    // Basic path validation
    if (!isValidPath(inputPath)) {
      return {
        isValid: false,
        error: 'Invalid path format',
      }
    }

    // Expand ~ and resolve the path
    const expandedPath = expandPath(inputPath)
    const resolvedPath = path.resolve(expandedPath)

    // Must be absolute path
    if (!pathIsAbsolute(resolvedPath)) {
      return {
        isValid: false,
        error: 'Path must be absolute',
      }
    }

    // Check against system paths
    const normalizedPath = path.normalize(resolvedPath)
    for (const systemPath of SYSTEM_PATHS) {
      if (normalizedPath === path.normalize(systemPath)) {
        return {
          isValid: false,
          error: `Cannot use system directory '${systemPath}' as project directory`,
        }
      }
    }

    // Don't allow direct children of important directories
    const parent = path.dirname(normalizedPath)
    const importantDirs = [os.homedir(), '/', 'C:\\']
    if (importantDirs.includes(parent)) {
      // Check if it's in a safe subdirectory
      const projectName = path.basename(normalizedPath)
      const hasMatchingSafeParent = SAFE_PARENTS.some(
        (safe) =>
          projectName.toLowerCase().includes(safe.toLowerCase()) ||
          normalizedPath.toLowerCase().includes(`/${safe}/`)
      )

      if (!hasMatchingSafeParent) {
        return {
          isValid: false,
          error: 'Project must be in a subdirectory like ~/projects, ~/workspace, or ~/dev',
        }
      }
    }

    // Allow temp directories
    const isTempPath =
      normalizedPath.includes('/tmp/') ||
      normalizedPath.includes('/temp/') ||
      normalizedPath.includes('/var/folders/') || // macOS temp
      normalizedPath.includes('\\Temp\\') // Windows temp

    // Final safety check: must be in home, temp, or have safe parent
    const isInHome = isPathInside(normalizedPath, os.homedir())
    const hasSafeParent = SAFE_PARENTS.some(
      (safe) =>
        normalizedPath.toLowerCase().includes(`/${safe}/`) ||
        normalizedPath.toLowerCase().includes(`\\${safe}\\`)
    )

    if (!isInHome && !isTempPath && !hasSafeParent) {
      return {
        isValid: false,
        error: 'Project must be in home directory, temp folder, or a workspace/projects directory',
      }
    }

    return {
      isValid: true,
      normalizedPath,
      expandedPath,
    }
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Path validation failed',
    }
  }
}

/**
 * Safely delete a directory by moving it to trash
 */
export async function safeDeleteDirectory(dirPath: string): Promise<void> {
  // Double-check the path before deletion
  const validation = validateProjectPath(dirPath)
  if (!validation.isValid) {
    throw new Error(`Refusing to delete unsafe path: ${validation.error}`)
  }

  // Use trash library to move to trash instead of permanent deletion
  await trash(dirPath)
}

/**
 * Generate safe default project path
 */
export function generateSafeProjectPath(projectName: string): string {
  const safeName = projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-')
  return path.join(os.homedir(), 'projects', safeName)
}
