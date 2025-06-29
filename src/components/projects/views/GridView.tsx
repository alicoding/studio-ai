import { useState } from 'react'
import { Terminal } from '../../terminal/Terminal'

interface GridViewProps {
  agents: Array<{ id: string; status: string }>
  onTerminalInput: (agentId: string, input: string) => void
}

export function GridView({ agents, onTerminalInput }: GridViewProps) {
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
    <div className="flex-1 grid grid-cols-2 gap-2 p-2">
      {[0, 1, 2, 3].map((index) => {
        const agentId = selectedAgents[index]
        return (
          <div
            key={index}
            className="flex flex-col border border-border rounded-lg overflow-hidden"
          >
            <div className="p-2 border-b border-border bg-card">
              <select
                value={agentId || ''}
                onChange={(e) => selectAgent(index, e.target.value)}
                className="w-full px-3 py-1 bg-input border border-border rounded-md text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select Agent</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.id} ({agent.status})
                  </option>
                ))}
              </select>
            </div>
            {agentId ? (
              <Terminal agentId={agentId} onInput={(input) => onTerminalInput(agentId, input)} />
            ) : (
              <div className="flex-1 flex items-center justify-center bg-background">
                <p className="text-muted-foreground">Select an agent</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
