import {
  Trash2,
  X,
  Sparkles,
  UserCog,
  CheckSquare,
  Square,
  GripVertical,
  Loader2,
} from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

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
      className={`relative group rounded-lg border transition-all duration-150 overflow-hidden ${
        isSelected
          ? 'bg-primary/8 border-primary/30 ring-1 ring-primary/20'
          : 'bg-card border-border hover:bg-accent/50 hover:border-border/80'
      } ${isSelectionMode ? 'cursor-pointer select-none' : 'cursor-pointer'} ${
        isDragging ? 'z-50 shadow-lg scale-[1.02]' : ''
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
      {/* Top legend */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <span
          className={`text-xs font-medium px-1.5 py-0.5 rounded text-uppercase tracking-wide ${
            agent.role === 'Legacy Agent'
              ? 'text-muted-foreground bg-muted/50'
              : 'text-primary bg-primary/10'
          }`}
        >
          {(roleDisplayNames[agent.role] || agent.role).toUpperCase()}
        </span>

        {isSelectionMode && (
          <div className="flex items-center">
            {isSelected ? (
              <CheckSquare className="w-3.5 h-3.5 text-primary" />
            ) : (
              <Square className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex items-center gap-2 px-3 pb-3">
        {!isSelectionMode && !isDragDisabled && (
          <div
            className="flex items-center cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>
        )}

        {/* Status indicator */}
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: statusColors[agent.status] }}
        />

        {/* Agent info - full width */}
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm text-foreground truncate">{agent.name}</div>
          <div className="text-xs text-muted-foreground truncate">{agent.id}</div>
        </div>
      </div>

      {/* Compact Content */}
      <div className="px-3 pb-3 space-y-2">
        {/* Inline token usage */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex-1 bg-muted/60 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full transition-all duration-300 rounded-full"
              style={{
                width: `${tokenPercentage}%`,
                backgroundColor:
                  tokenPercentage > 80 ? '#ef4444' : tokenPercentage > 60 ? '#f59e0b' : '#10b981',
              }}
            />
          </div>
          <span className="whitespace-nowrap">
            {agent.tokens === 0 ? '0K' : `${Math.round(agent.tokens / 1000)}K`} /{' '}
            {agent.maxTokens / 1000}K
          </span>
        </div>

        {/* Compact status/message */}
        <div className="text-xs text-muted-foreground">
          {agent.status === 'busy' ? (
            <div className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 animate-pulse text-primary" />
              <span>Typing...</span>
            </div>
          ) : (
            <div className="truncate">
              {agent.lastMessage || (agent.status === 'offline' ? 'Offline' : 'Ready')}
            </div>
          )}
        </div>
      </div>

      {/* Compact Actions */}
      {!isSelectionMode && (
        <div className="flex items-center gap-0.5 px-3 pb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          {isLegacy && onConvert && (
            <button
              className="p-1.5 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-md transition-all"
              onClick={(e) => {
                e.stopPropagation()
                onConvert()
              }}
              title="Assign role configuration"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          )}
          {hasConfig && onReassignRole && (
            <button
              className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md transition-all"
              onClick={(e) => {
                e.stopPropagation()
                onReassignRole()
              }}
              title="Change role"
            >
              <UserCog className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            className={`p-1.5 rounded-md transition-all ${
              isClearing
                ? 'text-blue-600 bg-blue-50 dark:bg-blue-950/30 cursor-not-allowed'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
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
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-all ml-auto"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            title="Remove from team"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
