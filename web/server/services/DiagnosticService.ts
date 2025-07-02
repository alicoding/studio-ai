/**
 * DiagnosticService - Server-side diagnostic monitoring
 *
 * SOLID: Single responsibility - monitor project files for diagnostics
 * Library First: Uses chokidar for file watching (server-side only)
 * KISS: Just watches existing output files
 */

import { watch, FSWatcher } from 'chokidar'
import { EventEmitter } from 'events'
import { readFile, access } from 'fs/promises'
import { join } from 'path'

export interface Diagnostic {
  id: string
  type: 'error' | 'warning' | 'info'
  source: 'typescript' | 'eslint' | 'test' | 'build'
  file: string
  line: number
  column: number
  message: string
  code?: string
  quickFix?: string
  timestamp: Date
}

interface OutputMonitor {
  name: string
  patterns: string[]
  parser: (filePath: string, content: string) => Promise<Diagnostic[]>
}

export class DiagnosticService extends EventEmitter {
  private watchers = new Map<string, FSWatcher>()
  private diagnostics = new Map<string, Diagnostic[]>()
  private checkInterval: NodeJS.Timeout | null = null
  projectPath: string = '' // Make public for API access

  constructor() {
    super()
  }

  async startMonitoring(projectPath: string) {
    console.log(`[DiagnosticService] startMonitoring called with path: ${projectPath}`)
    this.projectPath = projectPath

    // Stop existing watchers
    await this.stopMonitoring()

    // Run initial checks immediately
    console.log('[DiagnosticService] Running initial checks...')
    try {
      await this.runInitialChecks()
      console.log('[DiagnosticService] Initial checks completed')
    } catch (error) {
      console.error('[DiagnosticService] Error during initial checks:', error)
    }

    // Discover available output files
    const monitors = await this.discoverMonitors(projectPath)

    for (const monitor of monitors) {
      await this.setupWatcher(monitor)
    }

    console.log(
      `DiagnosticService: Started monitoring ${monitors.length} sources for project: ${projectPath}`
    )
    console.log(
      `DiagnosticService: Current diagnostics count: ${this.getCurrentDiagnostics().length}`
    )
    this.emit('monitoring-started', { projectPath, monitors: monitors.length })
  }

  async stopMonitoring() {
    // Stop periodic checks
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }

    for (const [name, watcher] of this.watchers) {
      await watcher.close()
      this.watchers.delete(name)
    }

    this.diagnostics.clear()
    this.emit('monitoring-stopped')
  }

  getCurrentDiagnostics(): Diagnostic[] {
    const all: Diagnostic[] = []
    this.diagnostics.forEach((items) => all.push(...items))
    return all
  }

  private async discoverMonitors(projectPath: string): Promise<OutputMonitor[]> {
    const monitors: OutputMonitor[] = []

    // TypeScript build info
    if (await this.fileExists(join(projectPath, 'tsconfig.json'))) {
      monitors.push({
        name: 'typescript',
        patterns: ['**/*.tsbuildinfo', 'tsconfig.tsbuildinfo'],
        parser: this.parseTypeScriptBuildInfo,
      })
    }

    // ESLint cache - check for various config files
    const eslintConfigs = [
      '.eslintrc.js',
      '.eslintrc.cjs',
      '.eslintrc.json',
      'eslint.config.js',
      'eslint.config.mjs',
    ]
    const hasEslint = await Promise.any(
      eslintConfigs.map((config) => this.fileExists(join(projectPath, config)))
    ).catch(() => false)

    if (hasEslint) {
      monitors.push({
        name: 'eslint',
        patterns: ['.eslintcache', '**/eslint-report.json'],
        parser: this.parseESLintOutput,
      })
    }

    return monitors
  }

  private async setupWatcher(monitor: OutputMonitor) {
    const watcher = watch(monitor.patterns, {
      cwd: this.projectPath,
      ignoreInitial: false,
      persistent: true,
    })

    watcher.on('change', async (filePath) => {
      try {
        const fullPath = join(this.projectPath, filePath)
        const content = await readFile(fullPath, 'utf-8')
        const diagnostics = await monitor.parser(fullPath, content)

        // Update diagnostics
        this.diagnostics.set(monitor.name, diagnostics)

        this.emit('diagnostics-updated', {
          source: monitor.name,
          diagnostics,
          timestamp: new Date(),
        })
      } catch (error) {
        console.warn(`Failed to parse ${monitor.name} output:`, error)
      }
    })

    this.watchers.set(monitor.name, watcher)
  }

  private async fileExists(path: string): Promise<boolean> {
    try {
      await access(path)
      return true
    } catch {
      return false
    }
  }

  private async runInitialChecks() {
    console.log('DiagnosticService: Running initial diagnostic checks...')

    // Run TypeScript check if tsconfig exists
    if (await this.fileExists(join(this.projectPath, 'tsconfig.json'))) {
      try {
        const tsDiagnostics = await this.runTypeScriptCheck()
        this.diagnostics.set('typescript', tsDiagnostics)

        this.emit('diagnostics-updated', {
          source: 'typescript',
          diagnostics: tsDiagnostics,
          timestamp: new Date(),
        })

        console.log(`DiagnosticService: Found ${tsDiagnostics.length} TypeScript diagnostics`)
      } catch (error) {
        console.error('Failed to run initial TypeScript check:', error)
      }
    }

    // Run ESLint check if config exists
    const eslintConfigs = [
      '.eslintrc.js',
      '.eslintrc.cjs',
      '.eslintrc.json',
      'eslint.config.js',
      'eslint.config.mjs',
    ]
    console.log('[DiagnosticService] Checking for ESLint configs...')

    let hasEslint = false
    for (const config of eslintConfigs) {
      const configPath = join(this.projectPath, config)
      const exists = await this.fileExists(configPath)
      console.log(`[DiagnosticService] Checking ${config}: ${exists}`)
      if (exists) {
        hasEslint = true
        break
      }
    }

    console.log(`[DiagnosticService] Has ESLint config: ${hasEslint}`)

    if (hasEslint) {
      try {
        const eslintDiagnostics = await this.runESLintCheck()
        this.diagnostics.set('eslint', eslintDiagnostics)

        this.emit('diagnostics-updated', {
          source: 'eslint',
          diagnostics: eslintDiagnostics,
          timestamp: new Date(),
        })

        console.log(`DiagnosticService: Found ${eslintDiagnostics.length} ESLint diagnostics`)
      } catch (error) {
        console.error('Failed to run initial ESLint check:', error)
      }
    }

    // Start periodic checks
    this.startPeriodicChecks()
  }

  // Parser implementations using existing tool outputs
  private parseTypeScriptBuildInfo = async (
    _filePath: string,
    _content: string
  ): Promise<Diagnostic[]> => {
    // Use npm run type-check to get current TypeScript diagnostics
    return this.runTypeScriptCheck()
  }

  private parseESLintOutput = async (
    _filePath: string,
    _content: string
  ): Promise<Diagnostic[]> => {
    // Use npm run lint --format json to get current ESLint diagnostics
    return this.runESLintCheck()
  }

  private async runTypeScriptCheck(): Promise<Diagnostic[]> {
    try {
      const { exec } = await import('child_process')
      const { promisify } = await import('util')
      const execAsync = promisify(exec)

      // TypeScript may exit with non-zero code if there are errors
      const { stderr } = await execAsync('npm run type-check', {
        cwd: this.projectPath,
      }).catch((err) => {
        // TypeScript exits with error code when there are issues, but we still get stderr
        if (err.stderr) {
          return { stdout: err.stdout || '', stderr: err.stderr }
        }
        throw err
      })

      const diagnostics: Diagnostic[] = []
      const lines = stderr.split('\n').filter((line) => line.trim())

      for (const line of lines) {
        const match = line.match(/^(.+?)\((\d+),(\d+)\): (error|warning) TS(\d+): (.+)$/)
        if (match) {
          const [, file, lineStr, colStr, severity, code, message] = match

          diagnostics.push({
            id: `ts-${file}-${lineStr}-${colStr}-${code}`,
            type: severity === 'error' ? 'error' : 'warning',
            source: 'typescript',
            file: file.replace(this.projectPath + '/', ''),
            line: parseInt(lineStr, 10),
            column: parseInt(colStr, 10),
            message: message.trim(),
            code: `TS${code}`,
            timestamp: new Date(),
          })
        }
      }

      console.log(`[DiagnosticService] TypeScript check found ${diagnostics.length} issues`)
      return diagnostics
    } catch (error) {
      console.error('Failed to run TypeScript check:', error)
      return []
    }
  }

  private async runESLintCheck(): Promise<Diagnostic[]> {
    try {
      const { exec } = await import('child_process')
      const { promisify } = await import('util')
      const execAsync = promisify(exec)

      // Run ESLint directly without --max-warnings flag to get JSON output
      // Note: ESLint may exit with non-zero code if there are errors/warnings, but still outputs JSON
      const { stdout, stderr } = await execAsync('npx eslint src --ext ts,tsx --format json', {
        cwd: this.projectPath,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
      }).catch((err) => {
        // ESLint exits with error code when there are issues, but we still get stdout
        if (err.stdout) {
          return { stdout: err.stdout, stderr: err.stderr || '' }
        }
        throw err
      })

      interface ESLintResult {
        filePath: string
        messages: Array<{
          ruleId: string | null
          severity: number
          message: string
          line: number
          column: number
          fix?: { range: [number, number]; text: string }
        }>
      }

      console.log(`[DiagnosticService] ESLint stdout length: ${stdout.length}`)
      console.log(`[DiagnosticService] ESLint stderr: ${stderr}`)

      if (!stdout || stdout.trim() === '') {
        console.warn('[DiagnosticService] ESLint returned empty stdout')
        return []
      }

      let results: ESLintResult[]
      try {
        results = JSON.parse(stdout)
      } catch (parseError) {
        console.error('[DiagnosticService] Failed to parse ESLint JSON:', parseError)
        console.error('[DiagnosticService] Raw stdout:', stdout.substring(0, 500))
        return []
      }

      const diagnostics: Diagnostic[] = []

      console.log(`[DiagnosticService] ESLint returned ${results.length} file results`)

      let totalMessages = 0
      for (const result of results) {
        if (result.messages && result.messages.length > 0) {
          totalMessages += result.messages.length
          console.log(
            `[DiagnosticService] Processing ${result.messages.length} messages from ${result.filePath}`
          )
        }
        for (const message of result.messages) {
          diagnostics.push({
            id: `eslint-${result.filePath}-${message.line}-${message.column}-${message.ruleId}`,
            type: message.severity === 2 ? 'error' : message.severity === 1 ? 'warning' : 'info',
            source: 'eslint',
            file: result.filePath.replace(this.projectPath + '/', ''),
            line: message.line,
            column: message.column,
            message: message.message,
            code: message.ruleId || 'unknown',
            quickFix: message.fix ? message.fix.text : undefined,
            timestamp: new Date(),
          })
        }
      }

      console.log(`[DiagnosticService] Total messages found: ${totalMessages}`)
      console.log(`[DiagnosticService] ESLint check created ${diagnostics.length} diagnostics`)
      return diagnostics
    } catch (error) {
      console.error('Failed to run ESLint check:', error)
      return []
    }
  }

  private startPeriodicChecks() {
    // Stop any existing interval
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
    }

    // Run checks every 10 seconds
    this.checkInterval = setInterval(async () => {
      console.log('[DiagnosticService] Running periodic diagnostic checks...')

      // Run TypeScript check
      if (await this.fileExists(join(this.projectPath, 'tsconfig.json'))) {
        try {
          const tsDiagnostics = await this.runTypeScriptCheck()
          const oldCount = this.diagnostics.get('typescript')?.length || 0
          this.diagnostics.set('typescript', tsDiagnostics)

          // Only emit if changed
          if (oldCount !== tsDiagnostics.length) {
            this.emit('diagnostics-updated', {
              source: 'typescript',
              diagnostics: tsDiagnostics,
              timestamp: new Date(),
            })
          }
        } catch (error) {
          console.error('Periodic TypeScript check failed:', error)
        }
      }

      // Run ESLint check
      const eslintConfigs = [
        '.eslintrc.js',
        '.eslintrc.cjs',
        '.eslintrc.json',
        'eslint.config.js',
        'eslint.config.mjs',
      ]
      const hasEslint = await Promise.any(
        eslintConfigs.map((config) => this.fileExists(join(this.projectPath, config)))
      ).catch(() => false)

      if (hasEslint) {
        try {
          const eslintDiagnostics = await this.runESLintCheck()
          const oldCount = this.diagnostics.get('eslint')?.length || 0
          this.diagnostics.set('eslint', eslintDiagnostics)

          // Only emit if changed
          if (oldCount !== eslintDiagnostics.length) {
            this.emit('diagnostics-updated', {
              source: 'eslint',
              diagnostics: eslintDiagnostics,
              timestamp: new Date(),
            })
          }
        } catch (error) {
          console.error('Periodic ESLint check failed:', error)
        }
      }
    }, 10000) // 10 seconds
  }
}

// Singleton instance
export const diagnosticService = new DiagnosticService()
