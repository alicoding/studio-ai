import { useState } from 'react'
import { MessageHistoryViewer } from '../../messages/MessageHistoryViewer'
import { useProjectStore, useAgentStore } from '../../../stores'

interface GridViewProps {}

export function GridView({}: GridViewProps) {
  const { activeProjectId } = useProjectStore()
  const { getProjectAgents } = useAgentStore()

  // Get agents from Zustand store
  const agents = getProjectAgents(activeProjectId || '')
  const [selectedAgents, setSelectedAgents] = useState<(string | null)[]>([
    agents[0]?.id || null,
    agents[1]?.id || null,
    agents[2]?.id || null,
    agents[3]?.id || null,
  ])

  const selectAgent = (index: number, agentId: string) => {
    const newSelection = [...selectedAgents]
    newSelection[index] = agentId
    setSelectedAgents(newSelection)
  }

  return (
    <div className="flex-1 overflow-auto p-2 h-full">
      <div className="grid grid-cols-2 gap-2 min-h-full">
        {[0, 1, 2, 3].map((index) => {
          const agentId = selectedAgents[index]
          const selectedAgent = agents.find((a) => a.id === agentId)

          return (
            <div
              key={index}
              className="flex flex-col border border-border rounded-lg overflow-hidden min-h-[400px]"
            >
              <div className="p-2 border-b border-border bg-card flex items-center gap-2">
                <select
                  value={agentId || ''}
                  onChange={(e) => selectAgent(index, e.target.value)}
                  className="flex-1 px-3 py-1 bg-input border border-border rounded-md text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select Agent</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} ({agent.status})
                    </option>
                  ))}
                </select>
              </div>
              {selectedAgent && activeProjectId ? (
                <div className="flex-1 overflow-hidden">
                  <MessageHistoryViewer
                    sessionId={selectedAgent.sessionId || selectedAgent.id}
                    projectId={activeProjectId}
                    agentName={selectedAgent.name}
                  />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center bg-background">
                  <p className="text-muted-foreground">
                    {!agentId ? 'Select an agent' : 'No active project'}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
