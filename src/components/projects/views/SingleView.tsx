import { useMemo } from 'react'
import { MessageHistoryViewer } from '../../messages/MessageHistoryViewer'
import { useProjectStore, useAgentStore } from '../../../stores'

interface SingleViewProps {
  selectedAgentId: string | null
}

export function SingleView({ selectedAgentId }: SingleViewProps) {
  const activeProjectId = useProjectStore((state) => state.activeProjectId)
  const getAgent = useAgentStore((state) => state.getAgent)
  const agents = useAgentStore((state) => state.agents)

  // Check if agents have been loaded yet
  const agentsLoaded = agents.length > 0

  // Memoize the selected agent to prevent unnecessary re-renders
  const selectedAgent = useMemo(() => {
    const agent = selectedAgentId ? getAgent(selectedAgentId) : null
    console.log('[SingleView] Selected agent:', {
      agentId: selectedAgentId,
      agent: agent,
      agentsLoaded,
      agentsCount: agents.length,
      sessionId: agent?.sessionId,
      fallbackId: agent?.id,
    })
    return agent
  }, [selectedAgentId, getAgent, agentsLoaded, agents.length])

  // Always call useMemo, even if we won't use the result
  const messageHistoryViewer = useMemo(() => {
    if (!selectedAgent || !activeProjectId) return null

    // Only use sessionId if it exists, don't fall back to agent ID
    const sessionId = selectedAgent.sessionId
    console.log('[SingleView] Creating MessageHistoryViewer with sessionId:', sessionId)

    return (
      <MessageHistoryViewer
        key={`${selectedAgent.id}`} // Force re-mount when agent changes
        projectId={activeProjectId}
        agentName={selectedAgent.name}
        agentId={selectedAgent.id}
      />
    )
  }, [selectedAgent, activeProjectId])

  // Show loading state if we have a selectedAgentId but agents haven't loaded yet
  if (selectedAgentId && !agentsLoaded) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-foreground">Loading Agent...</h3>
          <p className="text-muted-foreground">Initializing workspace</p>
        </div>
      </div>
    )
  }

  // Show "No Agent Selected" only if there's truly no selection
  if (!selectedAgentId || (!selectedAgent && agentsLoaded)) {
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
          <p className="text-muted-foreground">Please select or create a project first</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      <div className="border-b bg-muted/30 px-4 py-2">
        <span className="text-sm font-medium text-foreground">
          {selectedAgent?.name} - {selectedAgent?.lastMessage || 'No messages yet'}
        </span>
      </div>
      <div className="flex-1 overflow-hidden">{messageHistoryViewer}</div>
    </div>
  )
}
