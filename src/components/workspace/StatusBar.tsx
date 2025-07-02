/**
 * StatusBar - VSCode-style bottom status bar
 *
 * KISS: Simple compact status indicators like VSCode
 * SOLID: Single responsibility - show workspace status
 * Library First: Uses existing UI components
 */

import { useState, useEffect, memo } from 'react'
import { AlertTriangle, Bug, GitBranch, X } from 'lucide-react'
import { useDiagnostics } from '../../hooks/useDiagnostics'
import { DiagnosticPanel } from './DiagnosticPanel'

export const StatusBar = memo(function StatusBar() {
  const [showProblems, setShowProblems] = useState(false)
  const { errorCount, warningCount, isMonitoring } = useDiagnostics()

  // Log component lifecycle
  useEffect(() => {
    console.log('[StatusBar] Component mounted, isMonitoring:', isMonitoring)
    return () => {
      console.log('[StatusBar] Component unmounting')
    }
  }, [])

  // Log state changes
  useEffect(() => {
    console.log('[StatusBar] isMonitoring changed to:', isMonitoring)
  }, [isMonitoring])

  useEffect(() => {
    console.log('[StatusBar] showProblems changed to:', showProblems)
  }, [showProblems])

  // Always show status bar, indicate monitoring state

  return (
    <>
      {/* VSCode-style Problems panel */}
      {showProblems && (
        <div className="border-t bg-background">
          <div className="flex items-center justify-between p-2 border-b bg-muted/50">
            <span className="text-sm font-medium">Problems</span>
            <button onClick={() => setShowProblems(false)} className="p-1 hover:bg-muted rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto">
            <DiagnosticPanel />
          </div>
        </div>
      )}

      {/* Status bar */}
      <div className="h-6 bg-blue-600 text-white text-xs flex items-center justify-between px-4">
        {/* Left side - Git info (placeholder) */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <GitBranch className="w-3 h-3" />
            <span>main</span>
          </div>
        </div>

        {/* Right side - Error/Warning counts like VSCode */}
        <div className="flex items-center gap-4">
          {/* Always show diagnostic status */}
          <button
            className="flex items-center gap-2 hover:bg-blue-700 px-1 py-1 rounded"
            onClick={() => setShowProblems(!showProblems)}
            title={isMonitoring ? 'Click to view problems' : 'Diagnostics not monitoring'}
          >
            {isMonitoring ? (
              <>
                <div className="flex items-center gap-1">
                  <Bug className={`w-3 h-3 ${errorCount > 0 ? 'text-red-300' : 'text-gray-400'}`} />
                  <span>{errorCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <AlertTriangle
                    className={`w-3 h-3 ${warningCount > 0 ? 'text-yellow-300' : 'text-gray-400'}`}
                  />
                  <span>{warningCount}</span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-orange-300 animate-pulse" />
                <span className="text-orange-300">Initializing...</span>
              </div>
            )}
          </button>

          {/* Additional status items can go here */}
          <div className="text-xs opacity-75">Claude Studio</div>
        </div>
      </div>
    </>
  )
})
