import { useCallback } from 'react'
import ky from 'ky'
import type { WorkflowDefinition } from '../../web/server/schemas/workflow-builder'

interface SavedWorkflowResponse {
  workflow: {
    id: string
    name: string
    description?: string
    definition: WorkflowDefinition
  }
}

interface SavedWorkflow {
  id: string
  name: string
  description?: string
  definition: WorkflowDefinition
}

export function useWorkflowLoader() {
  const loadWorkflow = useCallback(async (workflowId: string): Promise<SavedWorkflow> => {
    try {
      console.log(`[useWorkflowLoader] Loading workflow ${workflowId}`)

      const response = await ky
        .get(`${window.location.origin}/api/workflows/saved/${workflowId}`)
        .json<SavedWorkflowResponse>()

      console.log(`[useWorkflowLoader] Loaded workflow: ${response.workflow.name}`)
      return response.workflow
    } catch (error) {
      console.error('[useWorkflowLoader] Failed to load workflow:', error)
      throw error
    }
  }, [])

  return { loadWorkflow }
}
