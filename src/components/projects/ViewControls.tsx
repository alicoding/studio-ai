import { Menu, Square, Grid3X3, SplitSquareHorizontal, Download } from 'lucide-react'
import { useAgentStore, useProjectStore } from '../../stores'

type ViewMode = 'single' | 'split' | 'grid'

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

  const activeProjectId = useProjectStore((state) => state.activeProjectId)
  const projects = useProjectStore((state) => state.projects)
  const activeProject = projects.find((p) => p.id === activeProjectId)

  const handleExportSession = async () => {
    if (!selectedAgent || !activeProject || !selectedAgent.sessionId) {
      alert('No session to export. Please select an agent with an active session.')
      return
    }

    try {
      // Fetch the session messages in JSONL format
      const response = await fetch(
        `/api/studio-projects/${activeProjectId}/sessions/${selectedAgent.sessionId}/export`
      )

      if (!response.ok) {
        throw new Error('Failed to export session')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${selectedAgent.name}-${selectedAgent.sessionId}.jsonl`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Failed to export session:', error)
      alert('Failed to export session. Please try again.')
    }
  }

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

      {selectedAgent && selectedAgent.sessionId && (
        <button
          className="ml-auto mr-2 flex items-center gap-1 px-3 py-1.5 text-sm text-muted-foreground hover:text-white hover:bg-secondary rounded transition-colors"
          onClick={handleExportSession}
          title="Export session as JSONL"
        >
          <Download className="w-3 h-3" />
          Export
        </button>
      )}

      <span className="text-muted-foreground text-sm ml-auto">
        {selectedAgent ? `→ ${selectedAgent.name}` : '→ No agent selected'}
      </span>
    </div>
  )
}
