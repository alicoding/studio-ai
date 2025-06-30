import { AgentCard } from '../projects/AgentCard'
import { Button } from '../ui/button'
import { Separator } from '../ui/separator'
import { UserPlus, Bot, Users } from 'lucide-react'
import { useAgentStore, useProjectStore } from '../../stores'

interface SidebarProps {
  isCollapsed: boolean
  isLoading?: boolean
  onAgentPause: (agentId: string) => void
  onAgentClear: (agentId: string) => void
  onAgentRemove: (agentId: string) => void
  onAgentConvert?: (agentId: string) => void
  onAgentReassignRole?: (agentId: string) => void
  onAddAgent: () => void
  onCreateAgent: () => void
  onLoadTeam: () => void
}

export function Sidebar({
  isCollapsed,
  isLoading = false,
  onAgentPause,
  onAgentClear,
  onAgentRemove,
  onAgentConvert,
  onAgentReassignRole,
  onAddAgent,
  onCreateAgent,
  onLoadTeam,
}: SidebarProps) {
  // Get data directly from Zustand stores
  const { selectedAgentId, configs, setSelectedAgent, getProjectAgents } = useAgentStore()
  const { activeProjectId } = useProjectStore()

  // Get agents for the active project
  const agents = getProjectAgents(activeProjectId || '')

  // Handler for agent selection
  const onAgentSelect = (agentId: string) => {
    setSelectedAgent(agentId)
  }
  return (
    <aside
      className={`flex flex-col bg-card border-r transition-all duration-200 ${
        isCollapsed ? 'w-0 overflow-hidden' : 'w-80'
      }`}
    >
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5" />
          Project Agents ({agents.length})
        </h2>
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
          agents.map((agent) => {
            const hasConfig = configs.some((config) => config.id === agent.id)
            return (
              <AgentCard
                key={agent.id}
                agent={agent}
                isSelected={agent.id === selectedAgentId}
                isLegacy={!hasConfig}
                hasConfig={hasConfig}
                onSelect={() => onAgentSelect(agent.id)}
                onPause={() => onAgentPause(agent.id)}
                onClear={() => onAgentClear(agent.id)}
                onRemove={() => onAgentRemove(agent.id)}
                onConvert={onAgentConvert ? () => onAgentConvert(agent.id) : undefined}
                onReassignRole={
                  onAgentReassignRole ? () => onAgentReassignRole(agent.id) : undefined
                }
              />
            )
          })
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
    </aside>
  )
}
