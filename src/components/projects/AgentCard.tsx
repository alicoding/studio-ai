import { Trash2, X, Sparkles, UserCog, CheckSquare, Square, GripVertical, Loader2 } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useEffect, useState } from 'react'

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
  onSelect: (event?: React.MouseEvent) => void
  onClear: () => void
  onRemove: () => void
  onConvert?: () => void
  onReassignRole?: () => void
  isLegacy?: boolean
  hasConfig?: boolean
  isSelectionMode?: boolean
  isDragDisabled?: boolean
  isClearing?: boolean
  projectPath?: string
}

const statusColors = {
  ready: '#10b981',
  online: '#3b82f6',
  busy: '#f59e0b',
  offline: '#6b7280',
}

const roleDisplayNames: Record<string, string> = {
  dev: 'Developer',
  architect: 'Architect',
  ux: 'UX Designer',
  tester: 'QA Engineer',
  orchestrator: 'Orchestrator',
  custom: 'Custom Role',
  'Legacy Agent': 'Legacy Agent',
}

// Simple inline typing indicator
function TypingIndicator({ agentName: _agentName }: { agentName: string }) {
  const [dots, setDots] = useState('.')
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? '.' : d + '.')
      setElapsedTime(t => t + 1)
    }, 500)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-center gap-1">
      <Sparkles className="w-3 h-3 animate-pulse text-primary" />
      <span>Typing{dots}</span>
      <span className="text-[10px] opacity-60">
        ({elapsedTime}s · ESC to interrupt)
      </span>
    </div>
  )
}

export function AgentCard({
  agent,
  isSelected,
  onSelect,
  onClear,
  onRemove,
  onConvert,
  onReassignRole,
  isLegacy = false,
  hasConfig = false,
  isSelectionMode = false,
  isDragDisabled = false,
  isClearing = false,
}: AgentCardProps) {
  const tokenPercentage = (agent.tokens / agent.maxTokens) * 100

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: agent.id,
    disabled: isDragDisabled || isSelectionMode,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-4 rounded-lg border transition-all duration-200 ${
        isSelected
          ? 'bg-primary/10 border-primary ring-2 ring-primary/20'
          : 'bg-card border-border hover:bg-secondary hover:border-border'
      } ${isSelectionMode ? 'cursor-pointer select-none' : 'cursor-pointer'} ${
        isDragging ? 'z-50 shadow-lg' : ''
      }`}
      data-agent-id={agent.id}
      data-status={agent.status}
      onClick={onSelect}
      onMouseDown={(e) => {
        // Prevent text selection on shift+click
        if (e.shiftKey) {
          e.preventDefault()
        }
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isSelectionMode ? (
            <div className="flex items-center">
              {isSelected ? (
                <CheckSquare className="w-4 h-4 text-primary" />
              ) : (
                <Square className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          ) : (
            !isDragDisabled && (
              <div
                className="flex items-center cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
                {...attributes}
                {...listeners}
                onClick={(e) => e.stopPropagation()} // Prevent card selection when dragging
              >
                <GripVertical className="w-4 h-4" />
              </div>
            )
          )}
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: statusColors[agent.status] }}
          ></span>
          <span className="text-foreground font-medium text-sm">{agent.name}</span>
        </div>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            agent.role === 'Legacy Agent'
              ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
          }`}
        >
          {roleDisplayNames[agent.role] || agent.role}
        </span>
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
            {agent.tokens < 1000 
              ? `${agent.tokens} / ${agent.maxTokens / 1000}K tokens`
              : `${Math.round(agent.tokens / 1000)}K / ${agent.maxTokens / 1000}K tokens`
            }
          </span>
        </div>
        <div className="text-muted-foreground text-xs line-clamp-2 min-h-[2rem]">
          {agent.status === 'busy' ? (
            <TypingIndicator agentName={agent.name} />
          ) : (
            agent.lastMessage || (agent.status === 'offline' ? 'Offline' : 'Ready')
          )}
        </div>
      </div>

      {!isSelectionMode && (
        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border">
          {isLegacy && onConvert ? (
            <button
              className="p-2 text-purple-500 hover:text-purple-400 hover:bg-purple-500/10 rounded-md transition-all"
              onClick={(e) => {
                e.stopPropagation()
                onConvert()
              }}
              title="Assign role configuration"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          ) : null}
          {hasConfig && onReassignRole && (
            <button
              className="p-2 text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-md transition-all"
              onClick={(e) => {
                e.stopPropagation()
                onReassignRole()
              }}
              title="Change role"
            >
              <UserCog className="w-4 h-4" />
            </button>
          )}
          <button
            className={`p-2 rounded-md transition-all ${
              isClearing
                ? 'text-blue-500 bg-blue-500/10 cursor-not-allowed'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
            onClick={(e) => {
              e.stopPropagation()
              if (!isClearing) {
                onClear()
              }
            }}
            disabled={isClearing}
            title={isClearing ? 'Clearing context...' : 'Clear session'}
          >
            {isClearing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
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
      )}
    </div>
  )
}
