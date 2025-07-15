/**
 * Conflict Resolution Hook - Handles workflow version conflicts
 *
 * SOLID: Single responsibility for conflict detection and resolution
 * DRY: Reusable conflict resolution logic
 * KISS: Simple conflict detection with merge strategies
 * Library-First: Uses TanStack Query for version management
 */

import { useCallback, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { invalidateQueries } from '../lib/query/queryClient'
import ky from 'ky'
import type { WorkflowDefinition } from '../../web/server/schemas/workflow-builder'

interface ConflictData {
  workflowId: string
  local: WorkflowDefinition
  remote: WorkflowDefinition
  localVersion: string
  remoteVersion: string
  timestamp: string
}

interface ConflictResolution {
  strategy: 'keep_local' | 'keep_remote' | 'merge_manual'
  mergedData?: WorkflowDefinition
  userChoice?: 'local' | 'remote'
}

interface ConflictResolverState {
  hasConflict: boolean
  conflictData: ConflictData | null
  isResolving: boolean
  lastError: string | null
}

export function useConflictResolver() {
  const [state, setState] = useState<ConflictResolverState>({
    hasConflict: false,
    conflictData: null,
    isResolving: false,
    lastError: null,
  })

  // Resolve conflict mutation
  const resolveConflictMutation = useMutation({
    mutationFn: async (data: {
      workflowId: string
      resolution: ConflictResolution
      finalData: WorkflowDefinition
    }) => {
      const response = await ky
        .post(`/api/workflows/saved/${data.workflowId}/resolve-conflict`, {
          json: {
            resolution: data.resolution,
            data: data.finalData,
          },
        })
        .json<{ success: boolean; version: string }>()
      return response
    },
    onSuccess: () => {
      setState((prev) => ({
        ...prev,
        isResolving: false,
        hasConflict: false,
        conflictData: null,
        lastError: null,
      }))
      // Invalidate workflow caches
      invalidateQueries.workflows.all()
    },
    onError: (error) => {
      setState((prev) => ({
        ...prev,
        isResolving: false,
        lastError: error instanceof Error ? error.message : 'Failed to resolve conflict',
      }))
    },
  })

  // Detect conflict from server response
  const detectConflict = useCallback((error: unknown): ConflictData | null => {
    if (error instanceof Error && 'response' in error) {
      const httpError = error as { response?: { status?: number; json?: () => Promise<unknown> } }

      if (httpError.response?.status === 409) {
        // This would need to be implemented when we have the actual conflict API
        // For now, return null to indicate no conflict handling yet
        return null
      }
    }
    return null
  }, [])

  // Set conflict state
  const setConflict = useCallback((conflictData: ConflictData) => {
    setState((prev) => ({
      ...prev,
      hasConflict: true,
      conflictData,
      lastError: null,
    }))
  }, [])

  // Clear conflict state
  const clearConflict = useCallback(() => {
    setState((prev) => ({
      ...prev,
      hasConflict: false,
      conflictData: null,
      lastError: null,
    }))
  }, [])

  // Resolve conflict with keep local strategy
  const resolveKeepLocal = useCallback(async () => {
    if (!state.conflictData) return

    setState((prev) => ({ ...prev, isResolving: true }))

    try {
      await resolveConflictMutation.mutateAsync({
        workflowId: state.conflictData.workflowId,
        resolution: {
          strategy: 'keep_local',
          userChoice: 'local',
        },
        finalData: state.conflictData.local,
      })
    } catch (_error) {
      // Error handling is done in the mutation
    }
  }, [state.conflictData, resolveConflictMutation])

  // Resolve conflict with keep remote strategy
  const resolveKeepRemote = useCallback(async () => {
    if (!state.conflictData) return

    setState((prev) => ({ ...prev, isResolving: true }))

    try {
      await resolveConflictMutation.mutateAsync({
        workflowId: state.conflictData.workflowId,
        resolution: {
          strategy: 'keep_remote',
          userChoice: 'remote',
        },
        finalData: state.conflictData.remote,
      })
    } catch (_error) {
      // Error handling is done in the mutation
    }
  }, [state.conflictData, resolveConflictMutation])

  // Resolve conflict with manual merge
  const resolveWithMerge = useCallback(
    async (mergedData: WorkflowDefinition) => {
      if (!state.conflictData) return

      setState((prev) => ({ ...prev, isResolving: true }))

      try {
        await resolveConflictMutation.mutateAsync({
          workflowId: state.conflictData.workflowId,
          resolution: {
            strategy: 'merge_manual',
            mergedData,
          },
          finalData: mergedData,
        })
      } catch (_error) {
        // Error handling is done in the mutation
      }
    },
    [state.conflictData, resolveConflictMutation]
  )

  // Simple merge strategy (combines steps from both versions)
  const suggestMerge = useCallback(
    (local: WorkflowDefinition, remote: WorkflowDefinition): WorkflowDefinition => {
      // Simple merge strategy - take the latest metadata and combine steps
      const mergedSteps = [...local.steps]

      // Add remote steps that don't exist locally
      remote.steps.forEach((remoteStep) => {
        const existsLocally = mergedSteps.some((localStep) => localStep.id === remoteStep.id)
        if (!existsLocally) {
          mergedSteps.push(remoteStep)
        }
      })

      return {
        ...local,
        steps: mergedSteps,
        metadata: {
          ...local.metadata,
          updatedAt: new Date().toISOString(),
        },
        // Combine positions
        positions: {
          ...remote.positions,
          ...local.positions,
        },
      }
    },
    []
  )

  // Get conflict summary for UI
  const getConflictSummary = useCallback(() => {
    if (!state.conflictData) return null

    const { local, remote } = state.conflictData

    return {
      localChanges: {
        stepCount: local.steps.length,
        lastModified: local.metadata.updatedAt,
        hasNewSteps: local.steps.some(
          (step) => !remote.steps.some((remoteStep) => remoteStep.id === step.id)
        ),
      },
      remoteChanges: {
        stepCount: remote.steps.length,
        lastModified: remote.metadata.updatedAt,
        hasNewSteps: remote.steps.some(
          (step) => !local.steps.some((localStep) => localStep.id === step.id)
        ),
      },
      suggestedMerge: suggestMerge(local, remote),
    }
  }, [state.conflictData, suggestMerge])

  return {
    // State
    state,

    // Actions
    detectConflict,
    setConflict,
    clearConflict,
    resolveKeepLocal,
    resolveKeepRemote,
    resolveWithMerge,

    // Utilities
    suggestMerge,
    getConflictSummary,

    // Computed
    hasConflict: state.hasConflict,
    isResolving: state.isResolving,
    conflictData: state.conflictData,
  }
}
