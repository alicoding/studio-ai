import { useState } from 'react'
import { AgentCard } from '../projects/AgentCard'
import { Button } from '../ui/button'
import { Separator } from '../ui/separator'
import { UserPlus, Bot, Users, CheckSquare, Square, Trash2 } from 'lucide-react'
import { useAgentStore, useProjectStore } from '../../stores'
import { DeleteAgentModal } from '../modals/DeleteAgentModal'
import { SearchSidebarSection } from '../search/SearchSidebarSection'
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
  onFileSelect?: (filePath: string) => void
}

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
  onFileSelect,
}: SidebarProps) {
  // Get data directly from Zustand stores
  const { selectedAgentId, configs, setSelectedAgent, getProjectAgents, moveAgentToPosition, clearingAgentId } =
    useAgentStore()
  const { activeProjectId } = useProjectStore()

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
  return (
    <aside
      className={`flex flex-col bg-card border-r transition-all duration-200 ${
        isCollapsed ? 'w-0 overflow-hidden' : 'w-80'
      } ${isSelectionMode ? 'select-none' : ''}`}
    >
      {/* Search Section */}
      <SearchSidebarSection 
        onFileSelect={onFileSelect}
        className="border-b"
      />
      
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" />
            Project Agents ({agents.length})
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSelectionMode}
            className={isSelectionMode ? 'text-primary' : ''}
            title={isSelectionMode ? 'Exit selection mode' : 'Enter selection mode'}
          >
            {isSelectionMode ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
          </Button>
        </div>

        {isSelectionMode && (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={toggleSelectAll} className="text-xs">
              {selectedAgents.size === agents.length ? 'Deselect All' : 'Select All'}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteModal(true)}
              disabled={selectedAgents.size === 0}
              className="ml-auto"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Delete ({selectedAgents.size})
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bot className="w-12 h-12 mx-auto mb-2 opacity-50 animate-pulse" />
            <p className="text-sm">Loading project agents...</p>
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bot className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No agents found</p>
            <p className="text-xs">This project has no agent sessions</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          >
            <SortableContext items={agents.map((a) => a.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
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
                      isDragDisabled={isSelectionMode} // Disable drag during selection mode
                      isClearing={clearingAgentId === agent.id}
                    />
                  )
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <div className="p-4 border-t space-y-2">
        <Button variant="outline" className="w-full justify-start" onClick={onAddAgent}>
          <UserPlus className="w-4 h-4 mr-2" />
          Add to Team
        </Button>
        <Button variant="outline" className="w-full justify-start" onClick={onCreateAgent}>
          <Bot className="w-4 h-4 mr-2" />
          Create New Agent
        </Button>
        <Separator />
        <Button variant="secondary" className="w-full justify-start" onClick={onLoadTeam}>
          <Users className="w-4 h-4 mr-2" />
          Load Team Template
        </Button>
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
