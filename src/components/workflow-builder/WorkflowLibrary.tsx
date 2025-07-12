/**
 * Workflow Library Component - Browse and manage saved workflows
 *
 * SOLID: Single responsibility - workflow library display and management
 * DRY: Reuses existing UI components and patterns
 * KISS: Simple grid/list layout with search and filters
 * Library-First: Uses existing UI components and state management
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Search, Calendar, Clock, Tag, Play, Edit2, Trash2, Copy, Download } from 'lucide-react'
import { useWorkflowBuilderStore } from '../../stores/workflowBuilder'
import type { WorkflowDefinition } from '../../../web/server/schemas/workflow-builder'

interface SavedWorkflow {
  id: string
  name: string
  description?: string
  definition: WorkflowDefinition
  updatedAt: string
  scope?: string
  projectId?: string
  isTemplate?: boolean
}

interface WorkflowLibraryProps {
  onLoadWorkflow?: (workflow: WorkflowDefinition) => void
  onEditWorkflow?: (workflow: SavedWorkflow) => void
  onExecuteWorkflow?: (workflow: SavedWorkflow) => void
  className?: string
  showActions?: boolean
}

export const WorkflowLibrary: React.FC<WorkflowLibraryProps> = ({
  onLoadWorkflow,
  onEditWorkflow,
  onExecuteWorkflow,
  className = '',
  showActions = true,
}) => {
  const { fetchSavedWorkflows } = useWorkflowBuilderStore()

  // State
  const [workflows, setWorkflows] = useState<SavedWorkflow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'updated' | 'created'>('updated')
  const [filterScope, setFilterScope] = useState<'all' | 'project' | 'global' | 'templates'>('all')
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null)

  const loadWorkflows = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchSavedWorkflows()
      setWorkflows(result)
    } catch (err) {
      console.error('Failed to load workflows:', err)
      setError(err instanceof Error ? err.message : 'Failed to load workflows')
    } finally {
      setIsLoading(false)
    }
  }, [fetchSavedWorkflows])

  // Load workflows on mount
  useEffect(() => {
    loadWorkflows()
  }, [loadWorkflows])

  // Filter and sort workflows
  const filteredWorkflows = useMemo(() => {
    let filtered = workflows

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (workflow) =>
          workflow.name.toLowerCase().includes(query) ||
          workflow.description?.toLowerCase().includes(query) ||
          workflow.definition.metadata?.tags?.some((tag) => tag.toLowerCase().includes(query))
      )
    }

    // Apply scope filter
    if (filterScope !== 'all') {
      filtered = filtered.filter((workflow) => {
        switch (filterScope) {
          case 'project':
            return workflow.scope === 'project'
          case 'global':
            return workflow.scope === 'global'
          case 'templates':
            return workflow.isTemplate === true
          default:
            return true
        }
      })
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'updated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        case 'created':
          return (
            new Date(b.definition.metadata?.createdAt || 0).getTime() -
            new Date(a.definition.metadata?.createdAt || 0).getTime()
          )
        default:
          return 0
      }
    })

    return filtered
  }, [workflows, searchQuery, sortBy, filterScope])

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return date.toLocaleDateString()
  }

  // Handle workflow selection
  const handleWorkflowClick = (workflow: SavedWorkflow) => {
    setSelectedWorkflow(workflow.id)
    onLoadWorkflow?.(workflow.definition)
  }

  if (isLoading) {
    return (
      <div className={`p-6 text-center ${className}`}>
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
        <p className="text-gray-600">Loading workflows...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`p-6 text-center ${className}`}>
        <div className="text-red-500 mb-4">
          <p className="font-medium">Failed to load workflows</p>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
        <button
          onClick={loadWorkflows}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header with search and filters */}
      <div className="flex-none p-4 border-b border-gray-200">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search workflows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <button
            onClick={loadWorkflows}
            className="px-3 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title="Refresh workflows"
          >
            <Clock className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value="updated">Last Updated</option>
              <option value="name">Name</option>
              <option value="created">Created</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Filter:</label>
            <select
              value={filterScope}
              onChange={(e) => setFilterScope(e.target.value as typeof filterScope)}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value="all">All Workflows</option>
              <option value="project">Project Only</option>
              <option value="global">Global</option>
              <option value="templates">Templates</option>
            </select>
          </div>
        </div>
      </div>

      {/* Workflow list */}
      <div className="flex-1 overflow-auto p-4">
        {filteredWorkflows.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-2">
              <Calendar className="w-12 h-12 mx-auto" />
            </div>
            <p className="text-gray-600 font-medium">
              {searchQuery ? 'No workflows match your search' : 'No workflows found'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {searchQuery
                ? 'Try a different search term'
                : 'Create your first workflow to get started'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredWorkflows.map((workflow) => (
              <div
                key={workflow.id}
                className={`
                  group bg-white border rounded-lg p-4 hover:shadow-md transition-all duration-200 cursor-pointer
                  ${selectedWorkflow === workflow.id ? 'ring-2 ring-primary border-primary' : 'border-gray-200 hover:border-gray-300'}
                `}
                onClick={() => handleWorkflowClick(workflow)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate pr-2" title={workflow.name}>
                      {workflow.name}
                    </h3>
                    {workflow.description && (
                      <p
                        className="text-sm text-gray-600 mt-1 line-clamp-2"
                        title={workflow.description}
                      >
                        {workflow.description}
                      </p>
                    )}
                  </div>
                  {workflow.isTemplate && (
                    <span className="flex-none inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Template
                    </span>
                  )}
                </div>

                <div className="flex items-center text-xs text-gray-500 mb-3">
                  <Clock className="w-3 h-3 mr-1" />
                  <span>{formatRelativeTime(workflow.updatedAt)}</span>
                  <span className="mx-2">•</span>
                  <span>{workflow.definition.steps?.length || 0} steps</span>
                  {workflow.scope && (
                    <>
                      <span className="mx-2">•</span>
                      <span className="capitalize">{workflow.scope}</span>
                    </>
                  )}
                </div>

                {/* Tags */}
                {workflow.definition.metadata?.tags &&
                  workflow.definition.metadata.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {workflow.definition.metadata.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700"
                        >
                          <Tag className="w-3 h-3 mr-1" />
                          {tag}
                        </span>
                      ))}
                      {workflow.definition.metadata.tags.length > 3 && (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                          +{workflow.definition.metadata.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                {/* Actions */}
                {showActions && (
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onEditWorkflow?.(workflow)
                      }}
                      className="p-1 text-gray-600 hover:text-blue-600 transition-colors"
                      title="Edit workflow"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onExecuteWorkflow?.(workflow)
                      }}
                      className="p-1 text-gray-600 hover:text-green-600 transition-colors"
                      title="Execute workflow"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        // TODO: Implement copy functionality
                      }}
                      className="p-1 text-gray-600 hover:text-purple-600 transition-colors"
                      title="Duplicate workflow"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        // TODO: Implement export functionality
                      }}
                      className="p-1 text-gray-600 hover:text-indigo-600 transition-colors"
                      title="Export workflow"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        // TODO: Implement delete functionality
                      }}
                      className="p-1 text-gray-600 hover:text-red-600 transition-colors"
                      title="Delete workflow"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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

export default WorkflowLibrary
