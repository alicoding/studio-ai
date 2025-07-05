/**
 * useDiagnostics - React hook for diagnostic monitoring
 *
 * KISS: Just connects to WebSocket and displays updates
 * Library First: Uses React hooks pattern
 * SOLID: Single responsibility - UI state management
 */

import { useEffect, useMemo, useRef } from 'react'
import { useDiagnosticsStore, type Diagnostic } from '../stores/diagnostics'
import { ErrorMonitor } from '../services/ErrorMonitor'
import { useProjectStore } from '../stores/projects'

export function useDiagnostics() {
  const { projects, activeProjectId } = useProjectStore()
  const currentProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId),
    [projects, activeProjectId]
  )

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
  const monitor = useMemo(() => ErrorMonitor.getInstance(), [])

  // Set up listeners once
  useEffect(() => {
    // Listen for diagnostic updates
    const handler = ({ source, diagnostics }: { source: string; diagnostics: Diagnostic[] }) => {
      console.log(`[useDiagnostics] Received ${diagnostics.length} diagnostics for ${source}`)
      setDiagnostics(source, diagnostics)
    }
    
    const cleanup = monitor.onDiagnosticsUpdated(handler)

    // We're monitoring as soon as connected
    setMonitoring(monitor.isConnected)
    
    // Cleanup function to prevent memory leaks
    return () => {
      cleanup()
      console.log('[useDiagnostics] Cleanup - handler removed')
    }
  }, [monitor, setDiagnostics, setMonitoring])

  // Track previous project to avoid redundant switches
  const previousProjectRef = useRef<string | null>(null)
  
  // Switch projects when activeProjectId changes
  useEffect(() => {
    if (activeProjectId && currentProject && activeProjectId !== previousProjectRef.current) {
      console.log(`[useDiagnostics] Switching to project: ${activeProjectId} (from: ${previousProjectRef.current})`)
      monitor.switchProject(activeProjectId, currentProject.path)
      previousProjectRef.current = activeProjectId
    }
  }, [activeProjectId, currentProject, monitor])

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
