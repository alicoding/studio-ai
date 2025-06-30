import { MessageHistoryViewer } from '../../messages/MessageHistoryViewer'
import { useProjectStore, useAgentStore } from '../../../stores'
import { useProjectAgents } from '../../../hooks/useProjectAgents'

interface SingleViewProps {
  selectedAgentId: string | null
}

export function SingleView({ selectedAgentId }: SingleViewProps) {
  const { activeProjectId } = useProjectStore()
  const { agents: projectAgents } = useProjectAgents()
  const { agents: storeAgents } = useAgentStore()

  // Find the selected agent - prioritize store data for real-time updates
  const storeAgent = storeAgents.find(agent => agent.id === selectedAgentId)
  const projectAgent = projectAgents.find(agent => agent.id === selectedAgentId)
  
  // Use store agent if available (for real-time updates), otherwise fallback to project agent
  const selectedAgent = storeAgent || projectAgent

  if (!selectedAgentId || !selectedAgent) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-foreground">No Agent Selected</h3>
          <p className="text-muted-foreground">
            Select an agent from the sidebar to view their conversation
          </p>
        </div>
      </div>
    )
  }

  if (!activeProjectId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-foreground">No Active Project</h3>
          <p className="text-muted-foreground">
            Please select or create a project first
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      <div className="border-b bg-muted/30 px-4 py-2">
        <span className="text-sm font-medium text-foreground">
          {selectedAgent.name} - {selectedAgent.lastMessage}
        </span>
      </div>
      <div className="flex-1 overflow-hidden">
        <MessageHistoryViewer
          sessionId={selectedAgent.sessionId || selectedAgent.id}
          projectId={activeProjectId}
          agentName={selectedAgent.name}
        />
      </div>
    </div>
  )
}