/**
 * Unified approval data hook with scope-aware fetching
 *
 * SOLID: Single responsibility - approval data management across all scopes
 * DRY: Centralized data fetching logic for project/global/consolidated views
 * KISS: Simple API endpoint selection based on scope
 * Library-First: Uses React Query patterns and ky for HTTP
 */

import { useEffect, useState, useMemo, useCallback } from 'react'
import ky from 'ky'
import { useApprovalEvents } from './useApprovalEvents'
import type {
  EnrichedApproval,
  ApprovalListResponse,
  ApprovalDecisionRequest,
  WorkflowApproval,
} from '../../web/server/schemas/approval-types'

// Re-export types for use in components
export type { EnrichedApproval } from '../../web/server/schemas/approval-types'

// API response format (unified for all possible response formats)
interface ApiResponse {
  success?: boolean
  data?: WorkflowApproval[] | ApprovalListResponse
  approvals?: WorkflowApproval[]
  count?: number
}

export type ApprovalScope = 'project' | 'global' | 'consolidated'

export interface ApprovalFilters {
  status?: 'pending' | 'approved' | 'rejected' | 'expired'
  riskLevel?: 'low' | 'medium' | 'high' | 'critical'
  priority?: 'urgent' | 'normal' | 'low'
  projectIds?: string[]
  search?: string
}

export interface UseApprovalsOptions {
  scope: ApprovalScope
  projectId?: string
  filters?: ApprovalFilters
  autoRefresh?: boolean
  refreshInterval?: number
}

export interface UseApprovalsReturn {
  approvals: EnrichedApproval[]
  loading: boolean
  error: Error | null
  summary: ApprovalListResponse['summary'] | null
  refetch: () => Promise<void>
  processApproval: (approvalId: string, decision: ApprovalDecisionRequest) => Promise<void>
  selectedApprovalId: string | null
  setSelectedApprovalId: (id: string | null) => void
  groupedApprovals: Record<string, EnrichedApproval[]> // For consolidated view
}

/**
 * Unified hook for fetching and managing approvals across all scopes
 */
export function useApprovals(options: UseApprovalsOptions): UseApprovalsReturn {
  const { scope, projectId, filters = {}, autoRefresh = true, refreshInterval = 30000 } = options

  const [approvals, setApprovals] = useState<EnrichedApproval[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [summary, setSummary] = useState<ApprovalListResponse['summary'] | null>(null)
  const [selectedApprovalId, setSelectedApprovalId] = useState<string | null>(null)

  // Listen for real-time approval events
  useApprovalEvents(scope === 'project' ? projectId : undefined)

  // Build API endpoint based on scope
  const endpoint = useMemo(() => {
    const baseUrl = '/api/approvals'
    const params = new URLSearchParams()

    // Always request enriched data for UI display
    params.set('enriched', 'true')

    // Add filters to params
    if (filters.status) params.set('status', filters.status)
    if (filters.riskLevel) params.set('riskLevel', filters.riskLevel)
    if (filters.search) params.set('search', filters.search)
    // Note: priority filter not supported by API yet
    // Note: projectIds filter for consolidated view not implemented yet

    switch (scope) {
      case 'project':
        if (!projectId) throw new Error('projectId required for project scope')
        params.set('projectId', projectId)
        return `${baseUrl}?${params.toString()}`

      case 'global':
        // Global approvals: no projectId filter, gets system-wide approvals
        return `${baseUrl}?${params.toString()}`

      case 'consolidated':
        // All approvals across all projects + global
        // API returns all, we group client-side
        return `${baseUrl}?${params.toString()}`

      default:
        throw new Error(`Unknown approval scope: ${scope}`)
    }
  }, [scope, projectId, filters])

  // Fetch approvals data
  const fetchApprovals = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await ky.get(endpoint).json<ApiResponse>()

      // Handle different API response formats
      let approvals: WorkflowApproval[]

      if (response.success && response.data) {
        // New API format: { success: true, data: { approvals: [...] } }
        if (Array.isArray(response.data)) {
          approvals = response.data
        } else {
          approvals = (response.data as ApprovalListResponse).approvals || []
        }
      } else if (response.data && Array.isArray(response.data)) {
        // Legacy format: { data: [...] }
        approvals = response.data
      } else if (response.approvals) {
        // Legacy format: { approvals: [...] }
        approvals = response.approvals
      } else {
        // Unknown format
        approvals = []
      }

      // Validate that approvals is an array
      if (!Array.isArray(approvals)) {
        throw new Error(
          `Expected approvals to be an array, got ${typeof approvals}. Response: ${JSON.stringify(response)}`
        )
      }

      // Enrich approvals with calculated fields
      const enrichedApprovals: EnrichedApproval[] = approvals.map((approval: WorkflowApproval) => {
        const expiresAt = new Date(approval.expiresAt)
        const now = new Date()
        const timeRemaining = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000))
        const isOverdue = timeRemaining === 0 && approval.status === 'pending'

        return {
          ...approval,
          contextData: approval.contextData ? JSON.parse(approval.contextData) : {},
          timeRemaining,
          isOverdue,
          notificationsSent: 0, // Will be populated when notification system is implemented
          lastNotificationAt: undefined, // Will be populated when notification system is implemented
        }
      })

      setApprovals(enrichedApprovals)

      // Handle summary - create summary from data if not provided
      const today = new Date().toDateString()
      let summary = {
        pendingCount: enrichedApprovals.filter((a) => a.status === 'pending').length,
        overdueCount: enrichedApprovals.filter((a) => a.isOverdue).length,
        approvedToday: enrichedApprovals.filter(
          (a) =>
            a.status === 'approved' &&
            a.resolvedAt &&
            new Date(a.resolvedAt).toDateString() === today
        ).length,
        rejectedToday: enrichedApprovals.filter(
          (a) =>
            a.status === 'rejected' &&
            a.resolvedAt &&
            new Date(a.resolvedAt).toDateString() === today
        ).length,
      }

      // If API response has summary, use it (from ApprovalListResponse)
      if (response.success && response.data && !Array.isArray(response.data)) {
        const listResponse = response.data as ApprovalListResponse
        if (listResponse.summary) {
          summary = listResponse.summary
        }
      }

      setSummary(summary)
    } catch (err) {
      console.error('[useApprovals] Failed to fetch approvals:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch approvals'))
    } finally {
      setLoading(false)
    }
  }, [endpoint])

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchApprovals()

    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(fetchApprovals, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [fetchApprovals, autoRefresh, refreshInterval])

  // Process approval decision
  const processApproval = useCallback(
    async (approvalId: string, decision: ApprovalDecisionRequest) => {
      try {
        await ky.post(`/api/approvals/${approvalId}/decide`, { json: decision })

        // Optimistically update local state
        setApprovals((prev) =>
          prev.map((approval) =>
            approval.id === approvalId
              ? {
                  ...approval,
                  status: decision.decision === 'approved' ? 'approved' : 'rejected',
                  resolvedAt: new Date().toISOString(),
                  resolvedBy: decision.decidedBy,
                }
              : approval
          )
        )

        // Refresh to get server state
        await fetchApprovals()
      } catch (err) {
        console.error('[useApprovals] Failed to process approval:', err)
        throw err
      }
    },
    [fetchApprovals]
  )

  // Group approvals by project for consolidated view
  const groupedApprovals = useMemo(() => {
    if (scope !== 'consolidated') return {}

    const groups: Record<string, EnrichedApproval[]> = {}

    approvals.forEach((approval) => {
      const key = approval.projectId || 'global'
      if (!groups[key]) groups[key] = []
      groups[key].push(approval)
    })

    // Sort each group by priority/urgency
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => {
        // Sort by: overdue first, then by risk level, then by time remaining
        if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1

        const riskPriority = { critical: 4, high: 3, medium: 2, low: 1 }
        const aPriority = riskPriority[a.riskLevel]
        const bPriority = riskPriority[b.riskLevel]
        if (aPriority !== bPriority) return bPriority - aPriority

        return (a.timeRemaining || 0) - (b.timeRemaining || 0)
      })
    })

    return groups
  }, [scope, approvals])

  return {
    approvals,
    loading,
    error,
    summary,
    refetch: fetchApprovals,
    processApproval,
    selectedApprovalId,
    setSelectedApprovalId,
    groupedApprovals,
  }
}

/**
 * Hook for getting approval counts across different scopes
 */
export function useApprovalCounts(projectId?: string) {
  const [counts, setCounts] = useState({
    project: 0,
    global: 0,
    total: 0,
  })

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const promises = [
          // Global count
          ky.get('/api/approvals?status=pending').json<ApprovalListResponse>(),
        ]

        // Project count if projectId provided
        if (projectId) {
          promises.push(
            ky.get(`/api/approvals/projects/${projectId}/pending`).json<ApprovalListResponse>()
          )
        }

        const results = await Promise.all(promises)
        const globalCount = results[0].summary.pendingCount
        const projectCount = results[1]?.summary.pendingCount || 0

        setCounts({
          global: globalCount,
          project: projectCount,
          total: globalCount + projectCount,
        })
      } catch (err) {
        console.error('[useApprovalCounts] Failed to fetch counts:', err)
      }
    }

    fetchCounts()
    const interval = setInterval(fetchCounts, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [projectId])

  return counts
}
