import { Terminal } from '../../terminal/Terminal'

interface SingleViewProps {
  selectedAgentId: string | null
  onTerminalInput: (agentId: string, input: string) => void
}

export function SingleView({ selectedAgentId, onTerminalInput }: SingleViewProps) {
  if (!selectedAgentId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-foreground">No Agent Selected</h3>
          <p className="text-muted-foreground">
            Select an agent from the sidebar to view their terminal
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0a0a0a] p-2">
      <div className="flex items-center justify-between px-2 py-1 mb-2 bg-background/50 rounded">
        <span className="text-sm text-muted-foreground">Agent: {selectedAgentId} - Connected</span>
      </div>
      <div className="flex-1 overflow-hidden">
        <Terminal
          agentId={selectedAgentId}
          onInput={(input) => onTerminalInput(selectedAgentId, input)}
        />
      </div>
    </div>
  )
}
