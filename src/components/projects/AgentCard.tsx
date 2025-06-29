import { Play, Pause, Trash2, X } from 'lucide-react'

interface AgentInfo {
  id: string
  name: string
  role: string
  status: 'ready' | 'online' | 'busy' | 'offline'
  tokens: number
  maxTokens: number
  lastMessage?: string
}

interface AgentCardProps {
  agent: AgentInfo
  isSelected: boolean
  onSelect: () => void
  onPause: () => void
  onClear: () => void
  onRemove: () => void
}

const statusColors = {
  ready: '#10b981',
  online: '#3b82f6',
  busy: '#f59e0b',
  offline: '#6b7280',
}

export function AgentCard({
  agent,
  isSelected,
  onSelect,
  onPause,
  onClear,
  onRemove,
}: AgentCardProps) {
  const tokenPercentage = (agent.tokens / agent.maxTokens) * 100

  return (
    <div
      className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'bg-primary/10 border-primary ring-2 ring-primary/20'
          : 'bg-card border-border hover:bg-secondary hover:border-border'
      }`}
      data-agent-id={agent.id}
      data-status={agent.status}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: statusColors[agent.status] }}
          ></span>
          <span className="text-foreground font-medium text-sm">{agent.name}</span>
        </div>
        <span className="text-muted-foreground text-xs font-medium">{agent.role}</span>
      </div>

      <div className="space-y-2">
        <div className="space-y-1">
          <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${tokenPercentage}%`,
                backgroundColor:
                  tokenPercentage > 80 ? '#ef4444' : tokenPercentage > 60 ? '#f59e0b' : '#10b981',
              }}
            ></div>
          </div>
          <span className="text-muted-foreground text-xs">
            {Math.round(agent.tokens / 1000)}K / {agent.maxTokens / 1000}K tokens
          </span>
        </div>
        <div className="text-muted-foreground text-xs line-clamp-2 min-h-[2rem]">
          {agent.lastMessage || (agent.status === 'offline' ? 'Offline' : 'Ready')}
        </div>
      </div>

      <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border">
        {agent.status === 'offline' ? (
          <button
            className="p-2 text-muted-foreground hover:text-green-500 hover:bg-green-500/10 rounded-md transition-all"
            onClick={(e) => {
              e.stopPropagation()
              onPause()
            }}
            title="Start agent"
          >
            <Play className="w-4 h-4" />
          </button>
        ) : (
          <button
            className="p-2 text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10 rounded-md transition-all"
            onClick={(e) => {
              e.stopPropagation()
              onPause()
            }}
            title="Pause agent"
          >
            <Pause className="w-4 h-4" />
          </button>
        )}
        <button
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-all"
          onClick={(e) => {
            e.stopPropagation()
            onClear()
          }}
          title="Clear messages"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <button
          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-all ml-auto"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          title="Remove from team"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
