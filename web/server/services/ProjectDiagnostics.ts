/**
 * ProjectDiagnostics - Smart diagnostic monitoring per project
 * 
 * KISS: One watcher per project, push updates on file changes
 * DRY: Single source of truth for diagnostics
 * SOLID: Each watcher handles one responsibility
 * Library-First: Uses TypeScript Compiler API and ESLint API directly
 */

import * as ts from 'typescript'
import { ESLint } from 'eslint'
import { watch, FSWatcher } from 'chokidar'
import { EventEmitter } from 'events'
import { join, resolve } from 'path'
import { existsSync } from 'fs'

export interface Diagnostic {
  file: string
  line: number
  column: number
  message: string
  type: 'error' | 'warning' | 'info'
  source: 'typescript' | 'eslint'
  code?: string
}

interface ProjectWatchers {
  tsWatcher?: ts.WatchOfConfigFile<ts.SemanticDiagnosticsBuilderProgram>
  fileWatcher?: FSWatcher
  eslint?: ESLint
  diagnostics: Map<string, Diagnostic[]> // source -> diagnostics
}

export class ProjectDiagnostics extends EventEmitter {
  private projects = new Map<string, ProjectWatchers>()
  private activeProjectId: string | null = null

  /**
   * Switch to a different project - starts watchers if needed
   */
  async switchProject(projectId: string, projectPath: string) {
    console.log(`[ProjectDiagnostics] Switching to project: ${projectId} at ${projectPath}`)
    
    // Validate projectPath
    if (!projectPath || projectPath.trim() === '') {
      console.error(`[ProjectDiagnostics] Invalid project path for ${projectId}: "${projectPath}"`)
      return
    }
    
    // Update active project
    this.activeProjectId = projectId
    
    // Check if we already have watchers for this project
    if (this.projects.has(projectId)) {
      console.log(`[ProjectDiagnostics] Project ${projectId} already being watched`)
      // Emit current diagnostics
      const watchers = this.projects.get(projectId)!
      this.emitAllDiagnostics(projectId, watchers.diagnostics)
      return
    }

    // Start new watchers for this project
    await this.startProjectWatchers(projectId, projectPath)
  }

  /**
   * Get current diagnostics for active project
   */
  getCurrentDiagnostics(): Diagnostic[] {
    if (!this.activeProjectId) return []
    
    const watchers = this.projects.get(this.activeProjectId)
    if (!watchers) return []
    
    const all: Diagnostic[] = []
    watchers.diagnostics.forEach(diagnostics => all.push(...diagnostics))
    return all
  }

  /**
   * Stop watching a project
   */
  async stopProject(projectId: string) {
    const watchers = this.projects.get(projectId)
    if (!watchers) return

    // Stop TypeScript watcher
    if (watchers.tsWatcher) {
      watchers.tsWatcher.close()
    }

    // Stop file watcher
    if (watchers.fileWatcher) {
      await watchers.fileWatcher.close()
    }

    this.projects.delete(projectId)
    console.log(`[ProjectDiagnostics] Stopped watching project: ${projectId}`)
  }

  /**
   * Stop all watchers
   */
  async stopAll() {
    for (const projectId of this.projects.keys()) {
      await this.stopProject(projectId)
    }
    this.activeProjectId = null
  }

  private async startProjectWatchers(projectId: string, projectPath: string) {
    const watchers: ProjectWatchers = {
      diagnostics: new Map()
    }

    // Start TypeScript watcher if tsconfig exists
    const tsconfigPath = join(projectPath, 'tsconfig.json')
    if (existsSync(tsconfigPath)) {
      console.log(`[ProjectDiagnostics] Starting TypeScript watcher for ${projectId}`)
      this.startTypeScriptWatcher(projectId, projectPath, watchers)
    }

    // Start ESLint watcher
    const eslintConfig = this.findESLintConfig(projectPath)
    if (eslintConfig) {
      console.log(`[ProjectDiagnostics] Starting ESLint watcher for ${projectId}`)
      await this.startESLintWatcher(projectId, projectPath, watchers)
    }

    this.projects.set(projectId, watchers)
  }

  private startTypeScriptWatcher(projectId: string, projectPath: string, watchers: ProjectWatchers) {
    const configPath = resolve(join(projectPath, 'tsconfig.json'))

    // Create the watch compiler host
    const createProgram = ts.createSemanticDiagnosticsBuilderProgram
    const host = ts.createWatchCompilerHost(
      configPath,
      {}, // Use tsconfig options
      ts.sys,
      createProgram,
      diagnostic => this.reportTypeScriptDiagnostic(projectId, projectPath, diagnostic, watchers),
      diagnostic => this.reportTypeScriptDiagnostic(projectId, projectPath, diagnostic, watchers)
    )

    // Start watching
    watchers.tsWatcher = ts.createWatchProgram(host)
  }

  private reportTypeScriptDiagnostic(
    projectId: string, 
    projectPath: string,
    diagnostic: ts.Diagnostic,
    watchers: ProjectWatchers
  ) {
    // Skip certain diagnostic codes
    if (diagnostic.code === 6031 || diagnostic.code === 6194) return // Starting/Found errors messages
    
    if (diagnostic.file) {
      const { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start!)
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
      const filePath = diagnostic.file.fileName.replace(projectPath + '/', '')
      
      const diag: Diagnostic = {
        file: filePath,
        line: line + 1,
        column: character + 1,
        message,
        type: diagnostic.category === ts.DiagnosticCategory.Error ? 'error' : 'warning',
        source: 'typescript',
        code: `TS${diagnostic.code}`
      }

      // Update diagnostics
      const tsDiagnostics = watchers.diagnostics.get('typescript') || []
      const index = tsDiagnostics.findIndex(d => 
        d.file === diag.file && d.line === diag.line && d.column === diag.column
      )
      
      if (index >= 0) {
        tsDiagnostics[index] = diag
      } else {
        tsDiagnostics.push(diag)
      }
      
      watchers.diagnostics.set('typescript', tsDiagnostics)
      
      // Emit update if this is the active project
      if (projectId === this.activeProjectId) {
        this.emit('diagnostics:updated', {
          source: 'typescript',
          diagnostics: tsDiagnostics
        })
      }
    }
  }

  private async startESLintWatcher(projectId: string, projectPath: string, watchers: ProjectWatchers) {
    // Initialize ESLint
    watchers.eslint = new ESLint({
      cwd: projectPath,
      cache: true,
      cacheLocation: join(projectPath, '.eslintcache')
    })

    // Watch source files
    watchers.fileWatcher = watch('**/*.{ts,tsx,js,jsx}', {
      cwd: projectPath,
      ignored: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.next/**'],
      persistent: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 100
      }
    })

    // Lint on file changes
    watchers.fileWatcher.on('change', async (filePath) => {
      if (!watchers.eslint) return
      
      try {
        const fullPath = join(projectPath, filePath)
        const results = await watchers.eslint.lintFiles([fullPath])
        
        const diagnostics: Diagnostic[] = []
        for (const result of results) {
          for (const message of result.messages) {
            diagnostics.push({
              file: filePath,
              line: message.line || 1,
              column: message.column || 1,
              message: message.message,
              type: message.severity === 2 ? 'error' : 'warning',
              source: 'eslint',
              code: message.ruleId || undefined
            })
          }
        }

        // Update diagnostics for this file
        const allESLintDiags = watchers.diagnostics.get('eslint') || []
        const otherFiles = allESLintDiags.filter(d => d.file !== filePath)
        const updated = [...otherFiles, ...diagnostics]
        
        watchers.diagnostics.set('eslint', updated)
        
        // Emit update if this is the active project
        if (projectId === this.activeProjectId) {
          this.emit('diagnostics:updated', {
            source: 'eslint',
            diagnostics: updated
          })
        }
      } catch (error) {
        console.error(`[ProjectDiagnostics] ESLint error for ${filePath}:`, error)
      }
    })

    // Run initial lint on all files
    try {
      const results = await watchers.eslint.lintFiles(['**/*.{ts,tsx,js,jsx}'])
      const diagnostics: Diagnostic[] = []
      
      for (const result of results) {
        const relPath = result.filePath.replace(projectPath + '/', '')
        for (const message of result.messages) {
          diagnostics.push({
            file: relPath,
            line: message.line || 1,
            column: message.column || 1,
            message: message.message,
            type: message.severity === 2 ? 'error' : 'warning',
            source: 'eslint',
            code: message.ruleId || undefined
          })
        }
      }
      
      watchers.diagnostics.set('eslint', diagnostics)
      
      // Emit initial diagnostics if this is the active project
      if (projectId === this.activeProjectId) {
        this.emit('diagnostics:updated', {
          source: 'eslint',
          diagnostics
        })
      }
    } catch (error) {
      console.error('[ProjectDiagnostics] Initial ESLint run failed:', error)
    }
  }

  private findESLintConfig(projectPath: string): string | null {
    const configs = [
      '.eslintrc.js',
      '.eslintrc.cjs',
      '.eslintrc.json',
      '.eslintrc.yaml',
      '.eslintrc.yml',
      'eslint.config.js',
      'eslint.config.mjs',
      'eslint.config.cjs'
    ]

    for (const config of configs) {
      if (existsSync(join(projectPath, config))) {
        return config
      }
    }

    // Check package.json for eslintConfig
    const packageJsonPath = join(projectPath, 'package.json')
    if (existsSync(packageJsonPath)) {
      try {
        const pkg = require(packageJsonPath)
        if (pkg.eslintConfig) return 'package.json'
      } catch {}
    }

    return null
  }

  private emitAllDiagnostics(projectId: string, diagnostics: Map<string, Diagnostic[]>) {
    // Emit diagnostics for each source
    diagnostics.forEach((diags, source) => {
      this.emit('diagnostics:updated', {
        source,
        diagnostics: diags
      })
    })

    // Also emit a summary
    this.emit('diagnostics:summary', {
      projectId,
      counts: {
        typescript: diagnostics.get('typescript')?.length || 0,
        eslint: diagnostics.get('eslint')?.length || 0
      }
    })
  }
}

// Singleton instance
export const projectDiagnostics = new ProjectDiagnostics()