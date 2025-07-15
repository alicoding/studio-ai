/**
 * WorkflowRouteWrapper - Eliminates route duplication for workflow builder
 *
 * SOLID: Single responsibility - route handling and navigation
 * DRY: Consolidates common route logic from 4 separate files
 * KISS: Simple props interface for all workflow contexts
 */

import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import VisualWorkflowBuilder from './VisualWorkflowBuilder'
import { useWorkflowBuilderStore, setWorkflowBuilderContext } from '../../stores/workflowBuilder'
import { useWorkflowLoader } from '../../hooks/useWorkflowLoader'

interface WorkflowRouteWrapperProps {
  mode: 'new' | 'edit'
  scope: 'global' | 'project'
  workflowId?: string // Required for edit mode
  projectId?: string // Required for project scope
  fullscreen?: boolean // Whether to use fullscreen wrapper
}

export function WorkflowRouteWrapper({
  mode,
  scope,
  workflowId,
  projectId,
  fullscreen = false,
}: WorkflowRouteWrapperProps) {
  const navigate = useNavigate()
  const {
    reset,
    initWorkflow,
    loadWorkflow: loadWorkflowDefinition,
    clearPersistedState,
    setSavedWorkflowDatabaseId,
  } = useWorkflowBuilderStore()
  const { loadWorkflow } = useWorkflowLoader()

  // Set context for persistence isolation with debouncing
  useEffect(() => {
    // Debounce context setting to prevent rapid context switches
    const contextTimer = setTimeout(() => {
      setWorkflowBuilderContext(scope, projectId)
      console.log('[WorkflowRouteWrapper] Context set after debounce:', { scope, projectId })
    }, 50)

    // Clean up context-specific storage when switching contexts
    return () => {
      clearTimeout(contextTimer)
      // Don't clear storage on unmount - it deletes user data
      // The context switch is enough to isolate the data
      console.log('[WorkflowRouteWrapper] Component unmounting')
    }
  }, [scope, projectId])

  // Initialize workflow based on mode
  useEffect(() => {
    const initializeWorkflow = async () => {
      if (mode === 'new') {
        // Clear any existing workflow for new mode
        reset()

        // Initialize based on scope
        const description = scope === 'global' ? 'Global workflow' : 'Project workflow'
        initWorkflow('Untitled Workflow', description, projectId)
      } else if (mode === 'edit' && workflowId) {
        try {
          // Clear persisted state for clean database load
          clearPersistedState()

          // Load workflow from database
          const savedWorkflow = await loadWorkflow(workflowId)
          loadWorkflowDefinition(savedWorkflow.definition)
          setSavedWorkflowDatabaseId(workflowId)
        } catch (error) {
          console.error('Failed to load workflow:', error)
          // Navigate back on error
          if (scope === 'project' && projectId) {
            navigate({ to: `/workspace/${projectId}` })
          } else {
            navigate({ to: '/workflows' })
          }
        }
      }
    }

    initializeWorkflow()

    // Clear workflow when leaving
    return () => {
      reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, scope, workflowId, projectId]) // Store functions are stable

  // Handle close navigation based on context
  const handleClose = () => {
    if (scope === 'project' && projectId) {
      navigate({ to: `/workspace/${projectId}` })
    } else {
      navigate({ to: '/workflows' })
    }
  }

  // Handle save success navigation
  const handleSaveSuccess = (savedWorkflowId: string) => {
    if (mode === 'new') {
      // Navigate to edit URL after first save
      if (scope === 'project' && projectId) {
        navigate({ to: `/workspace/${projectId}/workflows/${savedWorkflowId}/edit` })
      } else {
        navigate({ to: `/workflows/${savedWorkflowId}/edit` })
      }
    }
    // For edit mode, stay on the same page
  }

  const content = (
    <VisualWorkflowBuilder
      onClose={handleClose}
      scope={scope}
      projectId={projectId}
      onSaveSuccess={mode === 'new' ? handleSaveSuccess : undefined}
    />
  )

  // Return with or without fullscreen wrapper
  if (fullscreen) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000000,
          backgroundColor: 'var(--background)',
        }}
      >
        {content}
      </div>
    )
  }

  return content
}
