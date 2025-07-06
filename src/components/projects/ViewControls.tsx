import { Menu, Square, Grid3X3, SplitSquareHorizontal, Code } from 'lucide-react'
import { useAgentStore } from '../../stores'

type ViewMode = 'single' | 'split' | 'grid' | 'develop'

interface ViewControlsProps {
  currentView: ViewMode
  selectedAgentId: string | null
  onViewChange: (view: ViewMode) => void
  onSidebarToggle: () => void
}

const viewIcons = {
  single: Square,
  split: SplitSquareHorizontal,
  grid: Grid3X3,
  develop: Code,
}

export function ViewControls({
  currentView,
  selectedAgentId,
  onViewChange,
  onSidebarToggle,
}: ViewControlsProps) {
  // Get the selected agent to show its name
  const selectedAgent = useAgentStore((state) =>
    selectedAgentId ? state.agents.find((a) => a.id === selectedAgentId) : null
  )

  return (
    <div className="flex items-center gap-2 p-2 bg-card border-b">
      <button
        className="p-2 text-muted-foreground hover:text-white hover:bg-secondary rounded transition-colors"
        title="Toggle Sidebar"
        onClick={onSidebarToggle}
      >
        <Menu className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-1 ml-2">
        {Object.entries(viewIcons).map(([mode, Icon]) => (
          <button
            key={mode}
            className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded transition-colors ${
              currentView === mode
                ? 'bg-blue-600 text-white'
                : 'text-muted-foreground hover:text-white hover:bg-secondary'
            }`}
            onClick={() => onViewChange(mode as ViewMode)}
          >
            <Icon className="w-3 h-3" />
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      <span className="text-muted-foreground text-sm ml-auto">
        {selectedAgent ? `→ ${selectedAgent.name}` : '→ No agent selected'}
      </span>
    </div>
  )
}
