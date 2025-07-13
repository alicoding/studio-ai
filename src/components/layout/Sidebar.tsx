import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { AgentCard } from '../projects/AgentCard'
import { Button } from '../ui/button'
import { UserPlus, Bot, Users, CheckSquare, Square, Trash2, Activity, FileText } from 'lucide-react'
import { useAgentStore, useProjectStore } from '../../stores'
import { DeleteAgentModal } from '../modals/DeleteAgentModal'
import { WorkflowList } from '../workflow/WorkflowList'
import { WorkflowDebugger } from '../workflow/WorkflowDebugger'
import { useWorkspaceLayout } from '../../hooks/useWorkspaceLayout'
import { useWorkflowBuilderStore } from '../../stores/workflowBuilder'
import type { WorkflowDefinition } from '../../../web/server/schemas/workflow-builder'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers'

interface SidebarProps {
  isCollapsed: boolean
  isLoading?: boolean
  onAgentClear: (agentId: string) => void
  onAgentRemove: (agentId: string, skipConfirm?: boolean) => void
  onAgentConvert?: (agentId: string) => void
  onAgentReassignRole?: (agentId: string) => void
  onAddAgent: () => void
  onCreateAgent: () => void
  onLoadTeam: () => void
  projectId?: string
}

type SidebarTab = 'agents' | 'workflows'

export function Sidebar({
  isCollapsed,
  isLoading = false,
  onAgentClear,
  onAgentRemove,
  onAgentConvert,
  onAgentReassignRole,
  onAddAgent,
  onCreateAgent,
  onLoadTeam,
  projectId,
}: SidebarProps) {
  const navigate = useNavigate()
  const { fetchSavedWorkflows } = useWorkflowBuilderStore()
  // Get data directly from Zustand stores
  const { configs, getProjectAgents, moveAgentToPosition, clearingAgentId } = useAgentStore()
  const { activeProjectId } = useProjectStore()

  // State for saved workflows
  const [savedWorkflows, setSavedWorkflows] = useState<
    Array<{
      id: string
      name: string
      description?: string
      definition: WorkflowDefinition
      updatedAt: string
    }>
  >([])
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(false)

  // Use workspace layout for proper agent selection that switches canvas mode
  const { selectedAgentId, setSelectedAgent, canvasMode, setCanvasMode } = useWorkspaceLayout()

  // Load saved workflows when workflows tab is selected
  useEffect(() => {
    console.log('[Sidebar] Workflow loading check:', { canvasMode, projectId })
    if (canvasMode === 'workflow' && projectId) {
      setIsLoadingWorkflows(true)
      console.log('[Sidebar] Fetching saved workflows for project:', projectId)
      fetchSavedWorkflows()
        .then((workflows) => {
          console.log('[Sidebar] Fetched workflows:', workflows)
          setSavedWorkflows(workflows)
        })
        .catch((error) => {
          console.error('[Sidebar] Failed to load saved workflows:', error)
        })
        .finally(() => {
          setIsLoadingWorkflows(false)
        })
    }
  }, [canvasMode, projectId, fetchSavedWorkflows])

  // Sidebar state - derive from canvas mode
  const activeTab: SidebarTab = canvasMode === 'workflow' ? 'workflows' : 'agents'

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Require 5px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Multi-select state
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set())
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Get agents for the active project
  const agents = getProjectAgents(activeProjectId || '')

  // Handler for agent selection with shift+click support
  const onAgentSelect = (agentId: string, event?: React.MouseEvent) => {
    if (isSelectionMode) {
      const clickedIndex = agents.findIndex((a) => a.id === agentId)

      if (event?.shiftKey && lastSelectedIndex !== null && lastSelectedIndex !== clickedIndex) {
        // Shift+click: select range
        const start = Math.min(lastSelectedIndex, clickedIndex)
        const end = Math.max(lastSelectedIndex, clickedIndex)

        setSelectedAgents((prev) => {
          const newSet = new Set(prev)
          // Add all agents in the range
          for (let i = start; i <= end; i++) {
            newSet.add(agents[i].id)
          }
          return newSet
        })
      } else {
        // Normal click: toggle selection
        setSelectedAgents((prev) => {
          const newSet = new Set(prev)
          if (newSet.has(agentId)) {
            newSet.delete(agentId)
          } else {
            newSet.add(agentId)
          }
          return newSet
        })
      }

      setLastSelectedIndex(clickedIndex)
    } else {
      // Normal mode, select agent for viewing
      setSelectedAgent(agentId)
    }
  }

  // Toggle selection mode
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode)
    if (isSelectionMode) {
      // Exiting selection mode, clear selections
      setSelectedAgents(new Set())
      setLastSelectedIndex(null)
    }
  }

  // Select/deselect all agents
  const toggleSelectAll = () => {
    if (selectedAgents.size === agents.length) {
      setSelectedAgents(new Set())
    } else {
      setSelectedAgents(new Set(agents.map((a) => a.id)))
    }
  }

  // Batch delete selected agents
  const handleBatchDelete = async () => {
    if (selectedAgents.size === 0) return

    setIsDeleting(true)

    // Delete each selected agent without individual confirmations
    for (const agentId of selectedAgents) {
      await onAgentRemove(agentId, true) // true = skip confirm
    }

    setIsDeleting(false)
    setShowDeleteModal(false)

    // Exit selection mode
    toggleSelectionMode()
  }

  // Handle drag end - reorder agents
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const oldIndex = agents.findIndex((agent) => agent.id === active.id)
      const newIndex = agents.findIndex((agent) => agent.id === over?.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        // Use our store's moveAgentToPosition function
        moveAgentToPosition(active.id as string, newIndex)
        console.log(`Moved agent ${active.id} from position ${oldIndex} to ${newIndex}`)
      }
    }
  }

  // Get selected agents info for the modal
  const getSelectedAgentsInfo = () => {
    return agents.filter((agent) => selectedAgents.has(agent.id))
  }

  // Render tab content
  const renderTabContent = () => {
    if (activeTab === 'agents') {
      return (
        <>
          {/* Selection Mode Controls */}
          {isSelectionMode && (
            <div className="flex items-center gap-2 px-3 py-2 bg-accent/20 border-b">
              <Button variant="ghost" size="sm" onClick={toggleSelectAll} className="text-xs h-6">
                {selectedAgents.size === agents.length ? 'Deselect All' : 'Select All'}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteModal(true)}
                disabled={selectedAgents.size === 0}
                className="ml-auto h-6"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Delete ({selectedAgents.size})
              </Button>
            </div>
          )}

          {/* Agents List */}
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="w-8 h-8 mx-auto mb-3 opacity-50 animate-pulse" />
                <p className="text-sm">Loading agents...</p>
              </div>
            ) : agents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="w-8 h-8 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">No agents found</p>
                <p className="text-xs mt-1">Add agents to get started</p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                modifiers={[restrictToVerticalAxis, restrictToParentElement]}
              >
                <SortableContext
                  items={agents.map((a) => a.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="p-3 space-y-3">
                    {agents.map((agent) => {
                      const hasConfig = configs.some((config) => config.id === agent.id)
                      return (
                        <AgentCard
                          key={agent.id}
                          agent={agent}
                          isSelected={
                            isSelectionMode
                              ? selectedAgents.has(agent.id)
                              : agent.id === selectedAgentId
                          }
                          isLegacy={!hasConfig}
                          hasConfig={hasConfig}
                          onSelect={(event) => onAgentSelect(agent.id, event)}
                          onClear={() => onAgentClear(agent.id)}
                          onRemove={() => onAgentRemove(agent.id)}
                          onConvert={onAgentConvert ? () => onAgentConvert(agent.id) : undefined}
                          onReassignRole={
                            onAgentReassignRole ? () => onAgentReassignRole(agent.id) : undefined
                          }
                          isSelectionMode={isSelectionMode}
                          isDragDisabled={isSelectionMode}
                          isClearing={clearingAgentId === agent.id}
                        />
                      )
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>

          {/* Actions Section */}
          <div className="p-4 border-t bg-background/50 space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start h-9 text-sm"
              onClick={onAddAgent}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add to Team
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start h-9 text-sm"
              onClick={onCreateAgent}
            >
              <Bot className="w-4 h-4 mr-2" />
              Create Agent
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="w-full justify-start h-9 text-sm"
              onClick={onLoadTeam}
            >
              <Users className="w-4 h-4 mr-2" />
              Load Team
            </Button>
          </div>
        </>
      )
    }

    if (activeTab === 'workflows') {
      return (
        <div className="flex flex-col h-full">
          {/* Saved Workflows Section */}
          <div className="border-b">
            <div className="px-3 py-2">
              <h3 className="text-xs font-medium text-muted-foreground">Saved Workflows</h3>
            </div>
            <div className="px-3 pb-3">
              {isLoadingWorkflows ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                  <p>Loading workflows...</p>
                </div>
              ) : savedWorkflows.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  <p>No saved workflows</p>
                  <p className="mt-1 opacity-75">Create and save workflows to see them here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {savedWorkflows.map((workflow) => (
                    <button
                      key={workflow.id}
                      onClick={() => {
                        console.log('[Sidebar] Navigating to edit saved workflow:', workflow.name)
                        // Navigate to workspace-specific workflow edit route to maintain context
                        navigate({ to: `/workspace/${projectId}/workflows/${workflow.id}/edit` })
                      }}
                      className="w-full text-left p-2 rounded hover:bg-secondary/50 transition-colors group"
                    >
                      <div className="flex items-start gap-2">
                        <FileText className="w-3 h-3 mt-0.5 text-muted-foreground group-hover:text-primary" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{workflow.name}</p>
                          {workflow.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {workflow.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Executed Workflows Section */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-3 py-2">
              <h3 className="text-xs font-medium text-muted-foreground mb-2">Recent Activity</h3>
            </div>
            <WorkflowList projectId={projectId} />
          </div>

          {/* Temporary debugging */}
          {process.env.NODE_ENV === 'development' && (
            <div className="px-4 py-2 border-t bg-background/50">
              <WorkflowDebugger />
            </div>
          )}
        </div>
      )
    }

    return null
  }

  return (
    <aside
      className={`flex bg-card border-r transition-all duration-200 ${
        isCollapsed ? 'w-0 overflow-hidden' : 'w-80'
      } ${isSelectionMode ? 'select-none' : ''}`}
    >
      {/* Tab Navigation */}
      <div className="w-16 bg-muted/30 border-r flex flex-col py-2">
        <button
          onClick={() => setCanvasMode('agent')}
          className={`flex flex-col items-center gap-2 py-4 px-2 mx-2 rounded-lg hover:bg-accent/50 transition-colors ${
            activeTab === 'agents' ? 'bg-accent text-primary shadow-sm' : 'text-muted-foreground'
          }`}
          title="Agents"
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] font-medium">Agents</span>
          {agents.length > 0 && (
            <span className="text-[10px] bg-primary text-primary-foreground rounded-full px-1.5 min-w-5 h-4 flex items-center justify-center font-medium">
              {agents.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setCanvasMode('workflow')}
          className={`flex flex-col items-center gap-2 py-4 px-2 mx-2 rounded-lg hover:bg-accent/50 transition-colors ${
            activeTab === 'workflows' ? 'bg-accent text-primary shadow-sm' : 'text-muted-foreground'
          }`}
          title="Workflows"
        >
          <Activity className="w-5 h-5" />
          <span className="text-[10px] font-medium">Workflows</span>
        </button>

        {/* Selection Mode Toggle (only show on agents tab) */}
        {activeTab === 'agents' && (
          <button
            onClick={toggleSelectionMode}
            className={`mt-auto mb-2 flex flex-col items-center gap-1 py-3 px-2 mx-2 rounded-lg hover:bg-accent/50 transition-colors ${
              isSelectionMode ? 'text-primary bg-accent' : 'text-muted-foreground'
            }`}
            title={isSelectionMode ? 'Exit selection mode' : 'Enter selection mode'}
          >
            {isSelectionMode ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            <span className="text-[10px] font-medium">Select</span>
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Tab Header */}
        <div className="px-4 py-3 border-b bg-background/50">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold capitalize">{activeTab}</h2>
            {activeTab === 'agents' && agents.length > 0 && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                {agents.length} agent{agents.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 flex flex-col min-h-0">{renderTabContent()}</div>
      </div>

      <DeleteAgentModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleBatchDelete}
        agents={getSelectedAgentsInfo()}
        isDeleting={isDeleting}
      />
    </aside>
  )
}
