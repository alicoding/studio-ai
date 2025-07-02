/**
 * DiagnosticPanel - Workspace diagnostic display
 *
 * KISS: Simple error/warning list with agent integration
 * Library First: Uses existing UI components
 * SOLID: Single responsibility - display diagnostics
 */

import { useState } from 'react'
import { AlertTriangle, Bug, Send } from 'lucide-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { useDiagnostics } from '../../hooks/useDiagnostics'
import { useDiagnosticStatus } from '../../hooks/useDiagnosticStatus'
import { useProjectAgents } from '../../hooks/useProjectAgents'
import { useMessageOperations } from '../../hooks/useMessageOperations'
import { useProjectStore } from '../../stores'
import { cn } from '../../lib/utils'
import type { Diagnostic } from '../../stores/diagnostics'

export function DiagnosticPanel() {
  const { errorDiagnostics, warningDiagnostics, errorCount, warningCount, isMonitoring } =
    useDiagnostics()

  const diagnosticStatus = useDiagnosticStatus()

  // Show helpful guidance when not monitoring or no diagnostics
  if (!isMonitoring) {
    return (
      <div className="p-4 space-y-3">
        <div className="text-center text-muted-foreground text-sm mb-2">
          Diagnostic monitoring not active
        </div>

        {/* Show specific configuration issues if we have any */}
        {diagnosticStatus.issues.length > 0 ? (
          <div className="text-xs space-y-2">
            <div className="font-medium text-red-600">Configuration Issues:</div>
            <ul className="space-y-1">
              {diagnosticStatus.issues.map((issue, index) => (
                <li key={index} className="text-red-600">
                  • {issue}
                </li>
              ))}
            </ul>

            <div className="font-medium text-blue-600 mt-3">Suggested Fixes:</div>
            <ul className="space-y-1">
              {diagnosticStatus.suggestions.map((suggestion, index) => (
                <li key={index} className="text-blue-600">
                  • {suggestion}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="text-xs space-y-2">
            <div className="font-medium">To enable diagnostics, ensure your project has:</div>
            <ul className="space-y-1 text-muted-foreground">
              <li>
                • <code>tsconfig.json</code> file for TypeScript checking
              </li>
              <li>
                • <code>.eslintrc.js</code> or <code>eslint.config.js</code> for ESLint
              </li>
              <li>
                • <code>npm run type-check</code> script in package.json
              </li>
              <li>
                • <code>npm run lint</code> script in package.json
              </li>
            </ul>
            <div className="mt-2">
              <strong>Quick fix:</strong> Run <code>npm install typescript eslint --save-dev</code>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (errorCount === 0 && warningCount === 0) {
    return (
      <div className="p-4 text-center space-y-2">
        <div className="text-green-600 text-sm font-medium">✅ No problems detected</div>
        <div className="text-xs text-muted-foreground">TypeScript and ESLint checks passed</div>
      </div>
    )
  }

  return (
    <div className="space-y-2 p-4">
      {/* Errors first */}
      {errorDiagnostics.map((diagnostic) => (
        <DiagnosticItem key={diagnostic.id} diagnostic={diagnostic} />
      ))}

      {/* Then warnings */}
      {warningDiagnostics.map((diagnostic) => (
        <DiagnosticItem key={diagnostic.id} diagnostic={diagnostic} />
      ))}
    </div>
  )
}

function DiagnosticItem({ diagnostic }: { diagnostic: Diagnostic }) {
  const [showAgentSelect, setShowAgentSelect] = useState(false)
  const { agents } = useProjectAgents()
  const { sendMessage } = useMessageOperations()
  const { projects, activeProjectId } = useProjectStore()

  const activeProject = projects.find((p) => p.id === activeProjectId)

  const formatDiagnosticMessage = (diagnostic: Diagnostic): string => {
    return `I found a ${diagnostic.type} in the code that needs attention:

**File:** ${diagnostic.file}:${diagnostic.line}:${diagnostic.column}
**Source:** ${diagnostic.source}
**Code:** ${diagnostic.code || 'N/A'}
**Issue:** ${diagnostic.message}

${diagnostic.quickFix ? `**Suggested Fix:** ${diagnostic.quickFix}` : ''}

Please help me resolve this ${diagnostic.type}.`
  }

  const sendToAgent = async (agentId: string) => {
    if (!activeProject) return

    // Find the specific agent to send to
    const targetAgent = agents.find((a) => a.id === agentId)
    if (!targetAgent) return

    const message = formatDiagnosticMessage(diagnostic)

    // Create a mention message to route to specific agent
    const mentionMessage = `@${targetAgent.name} ${message}`
    const result = await sendMessage(mentionMessage, agents, activeProject)

    if (result.success) {
      setShowAgentSelect(false)
    }
  }

  if (showAgentSelect) {
    return (
      <div
        className={cn(
          'p-3 rounded border-l-4 text-sm',
          diagnostic.type === 'error'
            ? 'border-l-red-500 bg-red-50 dark:bg-red-950/10'
            : 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/10'
        )}
      >
        <div className="mb-2">
          <span className="text-xs font-medium">Send diagnostic to agent:</span>
        </div>
        <div className="space-y-1">
          {agents.map((agent) => (
            <Button
              key={agent.id}
              size="sm"
              variant="ghost"
              className="w-full justify-start h-8 px-2"
              onClick={() => sendToAgent(agent.id)}
            >
              <span className="truncate">{agent.name}</span>
              <Badge variant="outline" className="ml-auto text-xs">
                {agent.role}
              </Badge>
            </Button>
          ))}
          <Button
            size="sm"
            variant="ghost"
            className="w-full h-8 px-2 text-muted-foreground"
            onClick={() => setShowAgentSelect(false)}
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex items-start justify-between p-3 rounded border-l-4 text-sm',
        diagnostic.type === 'error'
          ? 'border-l-red-500 bg-red-50 dark:bg-red-950/10'
          : 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/10'
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {diagnostic.type === 'error' ? (
            <Bug className="h-3 w-3 text-red-500 flex-shrink-0" />
          ) : (
            <AlertTriangle className="h-3 w-3 text-yellow-500 flex-shrink-0" />
          )}

          <span className="font-mono text-xs text-muted-foreground">
            {diagnostic.file}:{diagnostic.line}:{diagnostic.column}
          </span>

          <Badge variant="outline" className="text-xs">
            {diagnostic.source}
          </Badge>
        </div>

        <p className="text-sm leading-relaxed">{diagnostic.message}</p>

        {diagnostic.quickFix && (
          <p className="text-xs text-muted-foreground mt-1">💡 {diagnostic.quickFix}</p>
        )}
      </div>

      <div className="ml-4 flex-shrink-0">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2"
          onClick={() => setShowAgentSelect(true)}
        >
          <Send className="h-3 w-3 mr-1" />
          Send
        </Button>
      </div>
    </div>
  )
}
