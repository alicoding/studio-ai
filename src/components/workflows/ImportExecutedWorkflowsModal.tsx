/**
 * ImportExecutedWorkflowsModal - Modal for importing executed workflows
 *
 * SOLID: Single responsibility - importing executed workflows
 * DRY: Reuses existing modal and UI components
 * KISS: Simple list with import actions
 * Library-First: Uses existing UI components
 */

import React, { useState, useEffect, useCallback } from 'react'
import { ModalLayout } from '../ui/modal-layout'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Clock, CheckCircle, XCircle, Loader2, Upload, AlertCircle } from 'lucide-react'
import ky from 'ky'
import { format } from 'date-fns'

const API_BASE = import.meta.env.VITE_API_BASE || `${window.location.origin}/api`

interface ExecutedWorkflow {
  threadId: string
  invocation: string
  status: string
  projectName: string
  startedBy: string
  lastUpdate: string
  stepCount: number
}

interface ImportExecutedWorkflowsModalProps {
  isOpen: boolean
  onClose: () => void
  projectId?: string
  onImportSuccess?: (workflow: { id: string; name: string }) => void
}

export const ImportExecutedWorkflowsModal: React.FC<ImportExecutedWorkflowsModalProps> = ({
  isOpen,
  onClose,
  projectId,
  onImportSuccess,
}) => {
  const [availableWorkflows, setAvailableWorkflows] = useState<ExecutedWorkflow[]>([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState<string | null>(null)
  const [selectedWorkflow, setSelectedWorkflow] = useState<ExecutedWorkflow | null>(null)
  const [customName, setCustomName] = useState('')
  const [customDescription, setCustomDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  const fetchAvailableWorkflows = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url = projectId
        ? `${API_BASE}/workflows/import/executed/available?projectId=${projectId}`
        : `${API_BASE}/workflows/import/executed/available`

      const response = await ky.get(url).json<{
        workflows: ExecutedWorkflow[]
        total: number
      }>()

      setAvailableWorkflows(response.workflows)
    } catch (err) {
      console.error('Failed to fetch available workflows:', err)
      setError('Failed to load executed workflows')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  // Fetch available workflows when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAvailableWorkflows()
    }
  }, [isOpen, fetchAvailableWorkflows])

  const handleImport = async (workflow: ExecutedWorkflow) => {
    setImporting(workflow.threadId)
    setError(null)

    try {
      const response = await ky
        .post(`${API_BASE}/workflows/import/executed/${workflow.threadId}`, {
          json: {
            projectId: projectId || 'global',
            name: customName || `Imported: ${workflow.invocation}`,
            description:
              customDescription ||
              `Imported from executed workflow ${workflow.threadId} (${workflow.invocation})`,
          },
        })
        .json<{
          workflow: {
            id: string
            name: string
          }
          sourceThreadId: string
        }>()

      // Success - notify parent and close modal
      if (onImportSuccess) {
        onImportSuccess(response.workflow)
      }

      // If custom name/description were used, clear them
      if (selectedWorkflow?.threadId === workflow.threadId) {
        setCustomName('')
        setCustomDescription('')
        setSelectedWorkflow(null)
      }

      // Refresh the list to remove the imported workflow
      await fetchAvailableWorkflows()
    } catch (err) {
      console.error('Failed to import workflow:', err)
      setError('Failed to import workflow')
    } finally {
      setImporting(null)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  return (
    <ModalLayout isOpen={isOpen} onClose={onClose} title="Import Executed Workflows" size="lg">
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : availableWorkflows.length === 0 ? (
          <div className="text-center py-12">
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No executed workflows available to import</p>
            <p className="text-sm text-muted-foreground mt-2">
              Execute workflows first, then you can import them as templates
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Select an executed workflow to import as an editable template:
            </p>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {availableWorkflows.map((workflow) => (
                <div
                  key={workflow.threadId}
                  className={`border rounded-lg p-4 hover:bg-muted cursor-pointer transition-colors ${
                    selectedWorkflow?.threadId === workflow.threadId
                      ? 'border-primary bg-muted'
                      : 'border-border'
                  }`}
                  onClick={() => {
                    setSelectedWorkflow(workflow)
                    setCustomName(`Imported: ${workflow.invocation}`)
                    setCustomDescription(`Imported from executed workflow (${workflow.invocation})`)
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusIcon(workflow.status)}
                        <h4 className="font-medium">{workflow.invocation}</h4>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Project: {workflow.projectName}</p>
                        <p>Started by: {workflow.startedBy}</p>
                        <p>Steps: {workflow.stepCount}</p>
                        <p>Last update: {format(new Date(workflow.lastUpdate), 'PPp')}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleImport(workflow)
                      }}
                      disabled={importing === workflow.threadId}
                    >
                      {importing === workflow.threadId ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Import
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {selectedWorkflow && (
              <div className="border-t pt-4 space-y-3">
                <h3 className="font-medium">Customize Import</h3>
                <div>
                  <label className="text-sm font-medium mb-1 block">Workflow Name</label>
                  <Input
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Enter custom workflow name..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Description</label>
                  <Textarea
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    placeholder="Enter workflow description..."
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedWorkflow(null)
                      setCustomName('')
                      setCustomDescription('')
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleImport(selectedWorkflow)}
                    disabled={importing === selectedWorkflow.threadId || !customName}
                  >
                    {importing === selectedWorkflow.threadId ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Import with Custom Details
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ModalLayout>
  )
}
