/**
 * Execution History Panel Component
 *
 * SOLID: Single responsibility - display execution history for saved workflows
 * DRY: Reuses existing UI components and patterns
 * KISS: Simple, focused component for execution history display
 * Library-First: Uses existing UI components and API patterns
 */

import { useState, useEffect, useCallback } from 'react'
import { Clock, CheckCircle, XCircle, Loader2, Play, Calendar, User } from 'lucide-react'
import { useExecutionHistory } from '../../hooks/useExecutionHistory'
import type { ExecutionHistoryResponse } from '../../hooks/useExecutionHistory'

interface ExecutionHistoryPanelProps {
  savedWorkflowId: string
  onExecutionClick?: (threadId: string) => void
}

export function ExecutionHistoryPanel({
  savedWorkflowId,
  onExecutionClick,
}: ExecutionHistoryPanelProps) {
  const { loading, error, fetchExecutionHistory } = useExecutionHistory()
  const [data, setData] = useState<ExecutionHistoryResponse | null>(null)

  const loadHistory = useCallback(async () => {
    const response = await fetchExecutionHistory(savedWorkflowId)
    setData(response)
  }, [fetchExecutionHistory, savedWorkflowId])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <CheckCircle className="w-4 h-4" style={{ color: 'var(--color-workflow-completed)' }} />
        )
      case 'failed':
        return <XCircle className="w-4 h-4" style={{ color: 'var(--color-workflow-failed)' }} />
      case 'running':
        return (
          <Loader2
            className="w-4 h-4 animate-spin"
            style={{ color: 'var(--color-workflow-running)' }}
          />
        )
      case 'aborted':
        return <XCircle className="w-4 h-4" style={{ color: 'var(--color-workflow-aborted)' }} />
      default:
        return <Clock className="w-4 h-4" style={{ color: 'var(--color-workflow-pending)' }} />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'border'
      case 'failed':
        return 'border'
      case 'running':
        return 'border'
      case 'aborted':
        return 'border'
      default:
        return 'border'
    }
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          color: 'var(--color-workflow-completed)',
          backgroundColor: 'var(--color-workflow-completed-bg)',
          borderColor: 'var(--color-workflow-completed)',
        }
      case 'failed':
        return {
          color: 'var(--color-workflow-failed)',
          backgroundColor: 'var(--color-workflow-failed-bg)',
          borderColor: 'var(--color-workflow-failed)',
        }
      case 'running':
        return {
          color: 'var(--color-workflow-running)',
          backgroundColor: 'var(--color-workflow-running-bg)',
          borderColor: 'var(--color-workflow-running)',
        }
      case 'aborted':
        return {
          color: 'var(--color-workflow-aborted)',
          backgroundColor: 'var(--color-workflow-aborted-bg)',
          borderColor: 'var(--color-workflow-aborted)',
        }
      default:
        return {
          color: 'var(--color-workflow-pending)',
          backgroundColor: 'var(--color-workflow-pending-bg)',
          borderColor: 'var(--color-workflow-pending)',
        }
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const formatDuration = (start: string, end: string) => {
    const startTime = new Date(start).getTime()
    const endTime = new Date(end).getTime()
    const duration = endTime - startTime
    const seconds = Math.round(duration / 1000)

    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading execution history...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <XCircle
          className="w-8 h-8 mx-auto mb-2"
          style={{ color: 'var(--color-workflow-failed)' }}
        />
        <p className="text-sm" style={{ color: 'var(--color-workflow-failed)' }}>
          {error}
        </p>
        <button onClick={loadHistory} className="mt-2 text-sm text-primary hover:text-primary/80">
          Try again
        </button>
      </div>
    )
  }

  if (!data) {
    return null
  }

  const { executions, summary } = data

  return (
    <div className="space-y-4">
      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border rounded-lg p-3">
          <div className="text-2xl font-bold text-foreground">{summary.total}</div>
          <div className="text-sm text-muted-foreground">Total Runs</div>
        </div>
        <div className="bg-card border rounded-lg p-3">
          <div className="text-2xl font-bold" style={{ color: 'var(--color-workflow-completed)' }}>
            {summary.completed}
          </div>
          <div className="text-sm text-muted-foreground">Completed</div>
        </div>
        <div className="bg-card border rounded-lg p-3">
          <div className="text-2xl font-bold" style={{ color: 'var(--color-workflow-failed)' }}>
            {summary.failed}
          </div>
          <div className="text-sm text-muted-foreground">Failed</div>
        </div>
        <div className="bg-card border rounded-lg p-3">
          <div className="text-2xl font-bold" style={{ color: 'var(--color-workflow-running)' }}>
            {summary.successRate}%
          </div>
          <div className="text-sm text-muted-foreground">Success Rate</div>
        </div>
      </div>

      {/* Execution List */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-foreground">Recent Executions</h3>

        {executions.length === 0 ? (
          <div className="text-center py-8">
            <Play className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No executions yet</p>
            <p className="text-sm text-muted-foreground">
              Execute this workflow to see its history here
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {executions.map((execution) => (
              <div
                key={execution.threadId}
                className={`border rounded-lg p-4 hover:bg-secondary transition-colors cursor-pointer ${
                  onExecutionClick ? 'hover:border-primary/50' : ''
                }`}
                onClick={() => onExecutionClick?.(execution.threadId)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(execution.status)}
                    <div>
                      <div className="font-medium text-foreground">
                        {execution.invocation || `Execution ${execution.threadId.slice(0, 8)}`}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(execution.createdAt)}
                        </div>
                        {execution.startedBy && (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {execution.startedBy}
                          </div>
                        )}
                        {execution.status === 'completed' && (
                          <div style={{ color: 'var(--color-workflow-completed)' }}>
                            {formatDuration(execution.createdAt, execution.lastUpdate)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(execution.status)}`}
                    style={getStatusStyle(execution.status)}
                  >
                    {execution.status}
                  </div>
                </div>

                {execution.steps.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-sm text-muted-foreground">
                      {execution.steps.length} steps •{' '}
                      {execution.steps.filter((s) => s.status === 'completed').length} completed
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
