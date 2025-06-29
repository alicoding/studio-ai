import { AgentCard } from '../projects/AgentCard'
import { Button } from '../ui/button'
import { Separator } from '../ui/separator'
import { UserPlus, Bot, Users } from 'lucide-react'

interface Agent {
  id: string
  name: string
  role: string
  status: 'ready' | 'online' | 'busy' | 'offline'
  tokens: number
  maxTokens: number
  lastMessage?: string
}

interface SidebarProps {
  agents: Agent[]
  selectedAgentId: string | null
  isCollapsed: boolean
  onAgentSelect: (agentId: string) => void
  onAgentPause: (agentId: string) => void
  onAgentClear: (agentId: string) => void
  onAgentRemove: (agentId: string) => void
  onAddAgent: () => void
  onCreateAgent: () => void
  onLoadTeam: () => void
}

export function Sidebar({
  agents,
  selectedAgentId,
  isCollapsed,
  onAgentSelect,
  onAgentPause,
  onAgentClear,
  onAgentRemove,
  onAddAgent,
  onCreateAgent,
  onLoadTeam,
}: SidebarProps) {
  return (
    <aside
      className={`flex flex-col bg-card border-r transition-all duration-200 ${
        isCollapsed ? 'w-0 overflow-hidden' : 'w-80'
      }`}
    >
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5" />
          Team Agents ({agents.length})
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {agents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bot className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No agents in team</p>
            <p className="text-xs">Add agents to get started</p>
          </div>
        ) : (
          agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              isSelected={agent.id === selectedAgentId}
              onSelect={() => onAgentSelect(agent.id)}
              onPause={() => onAgentPause(agent.id)}
              onClear={() => onAgentClear(agent.id)}
              onRemove={() => onAgentRemove(agent.id)}
            />
          ))
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
