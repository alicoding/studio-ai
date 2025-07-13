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
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
      case 'aborted':
        return <XCircle className="w-4 h-4 text-orange-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-700 bg-green-50 border-green-200'
      case 'failed':
        return 'text-red-700 bg-red-50 border-red-200'
      case 'running':
        return 'text-blue-700 bg-blue-50 border-blue-200'
      case 'aborted':
        return 'text-orange-700 bg-orange-50 border-orange-200'
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200'
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
        <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-sm text-red-600">{error}</p>
        <button onClick={loadHistory} className="mt-2 text-sm text-blue-600 hover:text-blue-800">
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
        <div className="bg-white border rounded-lg p-3">
          <div className="text-2xl font-bold text-gray-900">{summary.total}</div>
          <div className="text-sm text-gray-500">Total Runs</div>
        </div>
        <div className="bg-white border rounded-lg p-3">
          <div className="text-2xl font-bold text-green-600">{summary.completed}</div>
          <div className="text-sm text-gray-500">Completed</div>
        </div>
        <div className="bg-white border rounded-lg p-3">
          <div className="text-2xl font-bold text-red-600">{summary.failed}</div>
          <div className="text-sm text-gray-500">Failed</div>
        </div>
        <div className="bg-white border rounded-lg p-3">
          <div className="text-2xl font-bold text-blue-600">{summary.successRate}%</div>
          <div className="text-sm text-gray-500">Success Rate</div>
        </div>
      </div>

      {/* Execution List */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">Recent Executions</h3>

        {executions.length === 0 ? (
          <div className="text-center py-8">
            <Play className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No executions yet</p>
            <p className="text-sm text-gray-400">Execute this workflow to see its history here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {executions.map((execution) => (
              <div
                key={execution.threadId}
                className={`border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                  onExecutionClick ? 'hover:border-blue-300' : ''
                }`}
                onClick={() => onExecutionClick?.(execution.threadId)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(execution.status)}
                    <div>
                      <div className="font-medium text-gray-900">
                        {execution.invocation || `Execution ${execution.threadId.slice(0, 8)}`}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
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
                          <div className="text-green-600">
                            {formatDuration(execution.createdAt, execution.lastUpdate)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(execution.status)}`}
                  >
                    {execution.status}
                  </div>
                </div>

                {execution.steps.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-sm text-gray-600">
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
