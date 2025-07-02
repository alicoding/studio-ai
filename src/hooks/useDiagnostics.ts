/**
 * useDiagnostics - React hook for diagnostic monitoring
 *
 * Library First: Uses React hooks pattern
 * SOLID: Connects ErrorMonitor service to Zustand store
 */

import { useEffect } from 'react'
import { useDiagnosticsStore } from '../stores/diagnostics'
import { ErrorMonitor } from '../services/ErrorMonitor'
import { useProjectStore } from '../stores/projects'

export function useDiagnostics() {
  const { projects, activeProjectId } = useProjectStore()
  const currentProject = projects.find((p) => p.id === activeProjectId)

  const {
    diagnostics,
    errorCount,
    warningCount,
    coverage,
    testResults,
    buildStatus,
    isMonitoring,
    setDiagnostics,
    setCoverage,
    setTestResults,
    setBuildStatus,
    setMonitoring,
    getAllDiagnostics,
    getErrorDiagnostics,
    getWarningDiagnostics,
  } = useDiagnosticsStore()

  // Use global singleton monitor
  const monitor = ErrorMonitor.getInstance()

  // Start/stop monitoring based on current project
  useEffect(() => {
    // Use current project path or Claude Studio itself
    const projectPath = currentProject?.path || '/Users/ali/claude-swarm/claude-team/claude-studio'

    // Check if we're already monitoring
    if (monitor.isMonitoring) {
      console.log('[useDiagnostics] Already monitoring, keeping state')
      // Ensure store reflects monitoring state
      setMonitoring(true)
      return
    }

    const startMonitoring = async () => {
      // Set monitoring to true immediately to avoid flicker
      setMonitoring(true)

      try {
        // Set up listeners only once
        if (!monitor.isMonitoring) {
          // Listen for diagnostic updates
          monitor.onDiagnosticsUpdated(({ source, diagnostics }) => {
            console.log(
              `[useDiagnostics] Received ${diagnostics.length} diagnostics for source: ${source}`
            )
            setDiagnostics(source, diagnostics)
          })

          monitor.onMonitoringStarted(() => {
            // Already set to true above
            console.log('[useDiagnostics] Monitoring confirmed started')
          })

          monitor.onMonitoringStopped(() => {
            setMonitoring(false)
          })
        }

        // Start monitoring
        console.log('[useDiagnostics] Starting monitoring for:', projectPath)
        await monitor.startMonitoring(projectPath)
      } catch (error) {
        console.error('Failed to start diagnostic monitoring:', error)
        setMonitoring(false)
      }
    }

    startMonitoring()

    // Cleanup on unmount - but don't stop monitoring since it should be global
    return () => {
      console.log('[useDiagnostics] Hook cleanup - keeping monitor active')
    }
  }, []) // Run only once on mount

  return {
    // State
    diagnostics: Array.from(diagnostics.values()).flat(),
    errorCount,
    warningCount,
    coverage,
    testResults,
    buildStatus,
    isMonitoring,

    // Computed
    allDiagnostics: getAllDiagnostics(),
    errorDiagnostics: getErrorDiagnostics(),
    warningDiagnostics: getWarningDiagnostics(),

    // Actions (for manual updates)
    setCoverage,
    setTestResults,
    setBuildStatus,
  }
}
