import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Plus, Search, MoreVertical, Edit, Copy, Trash2, Play, Upload } from 'lucide-react'
import ky from 'ky'
import { format } from 'date-fns'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Select } from '../ui/select'
import { useProjectStore } from '../../stores/projects'
import { useToast } from '../../hooks/useToast'
import { ImportExecutedWorkflowsModal } from './ImportExecutedWorkflowsModal'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3456/api'

interface SavedWorkflow {
  id: string
  name: string
  description?: string
  definition: {
    id: string
    name: string
    steps: Array<{
      id: string
      type: string
      task?: string
      role?: string
      deps?: string[]
    }>
    metadata?: {
      createdBy?: string
      tags?: string[]
    }
  }
  createdBy: string
  createdAt: string
  updatedAt: string
  version: number
  tags: string[]
  isTemplate: boolean
  source: string
  scope: 'project' | 'global' | 'cross-project'
  projectId?: string
}

const WorkflowsPage: React.FC = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [workflows, setWorkflows] = useState<SavedWorkflow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'updated' | 'created'>('updated')
  const [filterScope, setFilterScope] = useState<'all' | 'project' | 'global' | 'templates'>('all')
  const [selectedWorkflows, setSelectedWorkflows] = useState<Set<string>>(new Set())
  const [showDropdown, setShowDropdown] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

  const currentProjectId = useProjectStore((state) => state.activeProjectId)

  // Fetch workflows
  const fetchWorkflows = useCallback(async () => {
    try {
      setLoading(true)
      let url = `${API_BASE}/workflows/saved`
      const params = new URLSearchParams()

      if (filterScope === 'global') {
        params.append('scope', 'global')
      } else if (filterScope === 'project' && currentProjectId) {
        params.append('projectId', currentProjectId)
      } else if (filterScope === 'templates') {
        // This would need a separate endpoint or filter
        params.append('isTemplate', 'true')
      }

      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const response = await ky.get(url).json<{ workflows: SavedWorkflow[] }>()
      setWorkflows(response.workflows)
    } catch (error) {
      console.error('Failed to fetch workflows:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch workflows',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [filterScope, currentProjectId, toast])

  useEffect(() => {
    fetchWorkflows()
  }, [fetchWorkflows])

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

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'updated':
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      }
    })

    return filtered
  }, [workflows, searchQuery, sortBy])

  // Handle workflow actions
  const handleEdit = (workflow: SavedWorkflow) => {
    navigate({ to: `/workflows/${workflow.id}/edit` })
  }

  const handleClone = async (workflow: SavedWorkflow) => {
    try {
      const clonedWorkflow = {
        name: `${workflow.name} (Copy)`,
        description: workflow.description,
        definition: {
          ...workflow.definition,
          id: `${workflow.definition.id}-copy-${Date.now()}`,
          name: `${workflow.definition.name} (Copy)`,
        },
        scope: workflow.scope,
        projectId: workflow.projectId,
        source: 'ui',
        isTemplate: false,
      }

      await ky.post(`${API_BASE}/workflows/saved`, { json: clonedWorkflow }).json()
      toast({
        title: 'Success',
        description: 'Workflow cloned successfully',
      })
      fetchWorkflows()
    } catch (error) {
      console.error('Failed to clone workflow:', error)
      toast({
        title: 'Error',
        description: 'Failed to clone workflow',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (workflowId: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return

    try {
      await ky.delete(`${API_BASE}/workflows/saved/${workflowId}`).json()
      toast({
        title: 'Success',
        description: 'Workflow deleted successfully',
      })
      fetchWorkflows()
    } catch (error) {
      console.error('Failed to delete workflow:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete workflow',
        variant: 'destructive',
      })
    }
  }

  const handleExecute = async (workflow: SavedWorkflow) => {
    try {
      const response = await ky
        .post(`${API_BASE}/workflows/execute`, {
          json: {
            workflow: workflow.definition,
            projectId: workflow.projectId || currentProjectId || 'default',
          },
        })
        .json<{ threadId: string; status: string }>()

      toast({
        title: 'Success',
        description: `Workflow started (Thread: ${response.threadId})`,
      })

      // Navigate to the activity view to see the execution
      navigate({ to: '/' })
    } catch (error) {
      console.error('Failed to execute workflow:', error)
      toast({
        title: 'Error',
        description: 'Failed to execute workflow',
        variant: 'destructive',
      })
    }
  }

  const handleBulkDelete = async () => {
    if (selectedWorkflows.size === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedWorkflows.size} workflows?`)) return

    try {
      await ky
        .delete(`${API_BASE}/workflows/saved/bulk`, {
          json: { ids: Array.from(selectedWorkflows) },
        })
        .json()

      toast({
        title: 'Success',
        description: `${selectedWorkflows.size} workflows deleted successfully`,
      })
      setSelectedWorkflows(new Set())
      fetchWorkflows()
    } catch (error) {
      console.error('Failed to delete workflows:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete workflows',
        variant: 'destructive',
      })
    }
  }

  const toggleSelection = (workflowId: string) => {
    const newSelection = new Set(selectedWorkflows)
    if (newSelection.has(workflowId)) {
      newSelection.delete(workflowId)
    } else {
      newSelection.add(workflowId)
    }
    setSelectedWorkflows(newSelection)
  }

  const toggleAllSelection = () => {
    if (selectedWorkflows.size === filteredWorkflows.length) {
      setSelectedWorkflows(new Set())
    } else {
      setSelectedWorkflows(new Set(filteredWorkflows.map((w) => w.id)))
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Workflows</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Import
            </Button>
            <Button
              onClick={() => navigate({ to: '/workflows/new' })}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Workflow
            </Button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search workflows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="w-40">
            <Select
              value={filterScope}
              onValueChange={(value) =>
                setFilterScope(value as 'all' | 'project' | 'global' | 'templates')
              }
            >
              <option value="all">All Workflows</option>
              <option value="project">Project Only</option>
              <option value="global">Global Only</option>
              <option value="templates">Templates</option>
            </Select>
          </div>

          <div className="w-40">
            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value as 'name' | 'updated' | 'created')}
            >
              <option value="updated">Last Updated</option>
              <option value="created">Date Created</option>
              <option value="name">Name</option>
            </Select>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
            >
              {viewMode === 'grid' ? 'Table View' : 'Grid View'}
            </Button>
            {selectedWorkflows.size > 0 && (
              <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                Delete {selectedWorkflows.size} Selected
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading workflows...</div>
          </div>
        ) : filteredWorkflows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="text-gray-500 mb-4">No workflows found</div>
            <Button onClick={() => navigate({ to: '/workflows/new' })}>
              Create Your First Workflow
            </Button>
          </div>
        ) : viewMode === 'grid' ? (
          // Grid View
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredWorkflows.map((workflow) => (
              <div
                key={workflow.id}
                className="border rounded-lg p-4 hover:shadow-lg transition-shadow relative"
              >
                <div className="absolute top-2 right-2">
                  <input
                    type="checkbox"
                    checked={selectedWorkflows.has(workflow.id)}
                    onChange={() => toggleSelection(workflow.id)}
                    className="w-4 h-4"
                  />
                </div>

                <h3 className="font-semibold text-lg mb-2 pr-8">{workflow.name}</h3>
                {workflow.description && (
                  <p className="text-sm text-gray-600 mb-3">{workflow.description}</p>
                )}

                <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                  <span>{workflow.definition.steps.length} steps</span>
                  <span>•</span>
                  <span>{workflow.scope}</span>
                  {workflow.isTemplate && (
                    <>
                      <span>•</span>
                      <span className="text-blue-600">Template</span>
                    </>
                  )}
                </div>

                <div className="text-xs text-gray-400 mb-3">
                  Updated {format(new Date(workflow.updatedAt), 'MMM d, yyyy')}
                </div>

                {workflow.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {workflow.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(workflow)}>
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleExecute(workflow)}>
                    <Play className="w-3 h-3 mr-1" />
                    Run
                  </Button>
                  <div className="relative ml-auto">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setShowDropdown(showDropdown === workflow.id ? null : workflow.id)
                      }
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                    {showDropdown === workflow.id && (
                      <div className="absolute right-0 top-8 bg-white border rounded-lg shadow-lg py-1 z-10 w-40">
                        <button
                          className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 w-full text-left text-sm"
                          onClick={() => {
                            handleClone(workflow)
                            setShowDropdown(null)
                          }}
                        >
                          <Copy className="w-4 h-4" />
                          Clone
                        </button>
                        <button
                          className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 w-full text-left text-sm text-red-600"
                          onClick={() => {
                            handleDelete(workflow.id)
                            setShowDropdown(null)
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Table View
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr>
                  <th className="text-left p-2">
                    <input
                      type="checkbox"
                      checked={
                        selectedWorkflows.size === filteredWorkflows.length &&
                        filteredWorkflows.length > 0
                      }
                      onChange={toggleAllSelection}
                      className="w-4 h-4"
                    />
                  </th>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Description</th>
                  <th className="text-left p-2">Steps</th>
                  <th className="text-left p-2">Scope</th>
                  <th className="text-left p-2">Updated</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkflows.map((workflow) => (
                  <tr key={workflow.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={selectedWorkflows.has(workflow.id)}
                        onChange={() => toggleSelection(workflow.id)}
                        className="w-4 h-4"
                      />
                    </td>
                    <td className="p-2 font-medium">{workflow.name}</td>
                    <td className="p-2 text-sm text-gray-600">{workflow.description || '-'}</td>
                    <td className="p-2">{workflow.definition.steps.length}</td>
                    <td className="p-2">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                        {workflow.scope}
                      </span>
                    </td>
                    <td className="p-2 text-sm">
                      {format(new Date(workflow.updatedAt), 'MMM d, yyyy')}
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(workflow)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleExecute(workflow)}>
                          <Play className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleClone(workflow)}>
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(workflow.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Import Modal */}
      <ImportExecutedWorkflowsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        projectId={currentProjectId || undefined}
        onImportSuccess={(workflow) => {
          toast({
            title: 'Success',
            description: `Workflow "${workflow.name}" imported successfully`,
          })
          fetchWorkflows()
        }}
      />
    </div>
  )
}

export default WorkflowsPage
