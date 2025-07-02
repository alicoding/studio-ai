/**
 * DiagnosticsStore - Workspace-wide error/warning monitoring
 *
 * SOLID: Single responsibility - tracks diagnostics state
 * DRY: Reusable diagnostic types and actions
 * Library First: Built on Zustand like other stores
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

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

export interface CoverageInfo {
  percentage: number
  lines: { covered: number; total: number }
  branches: { covered: number; total: number }
  functions: { covered: number; total: number }
  statements: { covered: number; total: number }
}

export interface TestResults {
  passed: number
  failed: number
  skipped: number
  total: number
  duration: number
  timestamp: Date
}

interface DiagnosticsState {
  // Diagnostics by source
  diagnostics: Map<string, Diagnostic[]>

  // Aggregated counts
  errorCount: number
  warningCount: number

  // Additional metrics
  coverage: CoverageInfo | null
  testResults: TestResults | null
  buildStatus: 'idle' | 'building' | 'success' | 'error'

  // Monitoring state
  isMonitoring: boolean
  lastUpdate: Date | null

  // Actions
  setDiagnostics: (source: string, diagnostics: Diagnostic[]) => void
  addDiagnostic: (diagnostic: Diagnostic) => void
  clearDiagnostics: (source?: string) => void
  setCoverage: (coverage: CoverageInfo | null) => void
  setTestResults: (results: TestResults | null) => void
  setBuildStatus: (status: 'idle' | 'building' | 'success' | 'error') => void
  setMonitoring: (monitoring: boolean) => void

  // Computed getters
  getAllDiagnostics: () => Diagnostic[]
  getErrorDiagnostics: () => Diagnostic[]
  getWarningDiagnostics: () => Diagnostic[]
  getDiagnosticsByFile: (file: string) => Diagnostic[]
}

// Persist monitoring state across page reloads
const MONITORING_STATE_KEY = 'claude-studio-diagnostics-monitoring'

export const useDiagnosticsStore = create<DiagnosticsState>()(
  devtools(
    (set, get) => {
      // Load initial monitoring state from localStorage
      const savedMonitoring = localStorage.getItem(MONITORING_STATE_KEY)
      const initialMonitoring = savedMonitoring === 'true'

      return {
        // Initial state
        diagnostics: new Map(),
        errorCount: 0,
        warningCount: 0,
        coverage: null,
        testResults: null,
        buildStatus: 'idle',
        isMonitoring: initialMonitoring,
        lastUpdate: null,

        // Actions
        setDiagnostics: (source, diagnostics) => {
          console.log(
            `[DiagnosticsStore] Setting ${diagnostics.length} diagnostics for source: ${source}`
          )
          set((state) => {
            const newDiagnostics = new Map(state.diagnostics)
            newDiagnostics.set(source, diagnostics)

            // Recalculate counts
            let errorCount = 0
            let warningCount = 0

            newDiagnostics.forEach((items) => {
              items.forEach((d) => {
                if (d.type === 'error') errorCount++
                else if (d.type === 'warning') warningCount++
              })
            })

            console.log(
              `[DiagnosticsStore] Total counts - Errors: ${errorCount}, Warnings: ${warningCount}`
            )

            return {
              diagnostics: newDiagnostics,
              errorCount,
              warningCount,
              lastUpdate: new Date(),
            }
          })
        },

        addDiagnostic: (diagnostic) => {
          set((state) => {
            const newDiagnostics = new Map(state.diagnostics)
            const sourceDiagnostics = newDiagnostics.get(diagnostic.source) || []
            newDiagnostics.set(diagnostic.source, [...sourceDiagnostics, diagnostic])

            return {
              diagnostics: newDiagnostics,
              errorCount: diagnostic.type === 'error' ? state.errorCount + 1 : state.errorCount,
              warningCount:
                diagnostic.type === 'warning' ? state.warningCount + 1 : state.warningCount,
              lastUpdate: new Date(),
            }
          })
        },

        clearDiagnostics: (source) => {
          set((state) => {
            const newDiagnostics = new Map(state.diagnostics)

            if (source) {
              newDiagnostics.delete(source)
            } else {
              newDiagnostics.clear()
            }

            // Recalculate counts
            let errorCount = 0
            let warningCount = 0

            newDiagnostics.forEach((items) => {
              items.forEach((d) => {
                if (d.type === 'error') errorCount++
                else if (d.type === 'warning') warningCount++
              })
            })

            return {
              diagnostics: newDiagnostics,
              errorCount,
              warningCount,
              lastUpdate: new Date(),
            }
          })
        },

        setCoverage: (coverage) => set({ coverage, lastUpdate: new Date() }),
        setTestResults: (testResults) => set({ testResults, lastUpdate: new Date() }),
        setBuildStatus: (buildStatus) => set({ buildStatus, lastUpdate: new Date() }),
        setMonitoring: (isMonitoring) => {
          // Persist monitoring state
          localStorage.setItem(MONITORING_STATE_KEY, isMonitoring.toString())
          set({ isMonitoring })
        },

        // Computed getters
        getAllDiagnostics: () => {
          const all: Diagnostic[] = []
          get().diagnostics.forEach((items) => all.push(...items))
          return all
        },

        getErrorDiagnostics: () => {
          return get()
            .getAllDiagnostics()
            .filter((d) => d.type === 'error')
        },

        getWarningDiagnostics: () => {
          return get()
            .getAllDiagnostics()
            .filter((d) => d.type === 'warning')
        },

        getDiagnosticsByFile: (file) => {
          return get()
            .getAllDiagnostics()
            .filter((d) => d.file === file)
        },
      }
    },
    {
      name: 'diagnostics-store',
    }
  )
)
