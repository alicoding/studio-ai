import { useState, useEffect } from 'react'
import { Modal } from '../shared/Modal'
import { useAgentStore } from '../../stores'
import { TeamTemplate, TeamAgent, TeamBuilderAgent } from '../../types/teams'

interface TeamBuilderProps {
  isOpen: boolean
  template?: TeamTemplate | null
  onSave: (template: Omit<TeamTemplate, 'id' | 'createdAt' | 'updatedAt'>) => void
  onCancel: () => void
}


export function TeamBuilder({ isOpen, template, onSave, onCancel }: TeamBuilderProps) {
  const { configs, setAgentConfigs } = useAgentStore()
  const [teamName, setTeamName] = useState('')
  const [teamDescription, setTeamDescription] = useState('')
  const [selectedAgents, setSelectedAgents] = useState<TeamBuilderAgent[]>([])
  const [draggedAgent, setDraggedAgent] = useState<TeamBuilderAgent | null>(null)
  
  // Reset form when template changes
  useEffect(() => {
    if (template) {
      setTeamName(template.name)
      setTeamDescription(template.description)
      // Map template agents to builder agents - need to match with available configs
      const builderAgents: TeamBuilderAgent[] = template.agents
        .map((agent, index) => {
          const config = configs.find(c => c.id === agent.configId || c.role === agent.role)
          if (config) {
            // Create unique instance ID for each agent
            const instanceId = `${config.id}_edit_${index}_${Date.now()}`
            return {
              id: instanceId, // Unique instance ID
              name: agent.name || config.name,
              role: config.role,
              systemPrompt: config.systemPrompt,
              configId: config.id, // Store original config ID
            }
          }
          return null
        })
        .filter(Boolean) as TeamBuilderAgent[]
      setSelectedAgents(builderAgents)
    } else {
      setTeamName('')
      setTeamDescription('')
      setSelectedAgents([])
    }
  }, [template, configs])
  
  // Load agent configs when modal opens (if not already loaded)
  useEffect(() => {
    if (isOpen && configs.length === 0) {
      fetch('/api/agents')
        .then(res => res.json())
        .then(data => {
          setAgentConfigs(data)
        })
        .catch(err => console.error('Failed to load agents:', err))
    }
  }, [isOpen, configs.length, setAgentConfigs])
  
  // Convert configs to available agents
  const availableAgents: TeamBuilderAgent[] = configs.map(config => ({
    id: config.id,
    name: config.name,
    role: config.role,
    systemPrompt: config.systemPrompt,
  }))

  const handleDragStart = (e: React.DragEvent, agent: TeamBuilderAgent) => {
    setDraggedAgent(agent)
    e.dataTransfer.effectAllowed = 'copy'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (draggedAgent) {
      // Allow duplicate roles - create a unique instance ID for each dropped agent
      const instanceId = `${draggedAgent.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      setSelectedAgents([
        ...selectedAgents,
        {
          id: instanceId, // Unique instance ID
          name: draggedAgent.name,
          role: draggedAgent.role,
          systemPrompt: draggedAgent.systemPrompt || '',
          configId: draggedAgent.id, // Store the original config ID
        },
      ])
    }
    setDraggedAgent(null)
  }

  const handleRemoveAgent = (agentId: string) => {
    setSelectedAgents(selectedAgents.filter((a) => a.id !== agentId))
  }

  const handleSave = () => {
    if (!teamName || selectedAgents.length === 0) {
      alert('Please provide a team name and select at least one agent')
      return
    }

    // Convert selected agents to team agents with proper configId reference
    const teamAgents: TeamAgent[] = selectedAgents.map((agent) => ({
      role: agent.role,
      name: agent.name, // Include name for display
      configId: agent.configId || agent.id, // Use configId if available (for duplicates), otherwise use id
      customizations: {
        // Empty for now, can be extended later
      }
    }))

    // Create the team template without id, createdAt, updatedAt (backend will handle)
    const teamData = {
      name: teamName,
      description: teamDescription,
      agents: teamAgents,
    }

    onSave(teamData)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={template ? 'Edit Team Template' : 'Create New Team'}
      className="team-builder-modal"
    >
      <div className="p-6">
        <div className="space-y-4 mb-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Team Name</label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g., Full Stack Team"
              className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Description</label>
            <textarea
              value={teamDescription}
              onChange={(e) => setTeamDescription(e.target.value)}
              placeholder="Describe this team's purpose and capabilities..."
              rows={3}
              className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Available Agents</h3>
            <p className="text-xs text-muted-foreground">Drag agents to add them. You can add the same agent multiple times.</p>
            <div className="space-y-2 max-h-64 overflow-y-auto p-2 border border-border rounded-md bg-card">
              {availableAgents.map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center gap-2 p-2 bg-secondary rounded-md cursor-move hover:bg-secondary/80 transition-colors"
                  draggable
                  onDragStart={(e) => handleDragStart(e, agent)}
                >
                  <span
                    className="px-2 py-1 rounded text-xs font-medium text-white"
                    style={{
                      backgroundColor:
                        agent.role === 'dev'
                          ? '#10b981'
                          : agent.role === 'ux'
                            ? '#f59e0b'
                            : agent.role === 'architect'
                              ? '#3b82f6'
                              : agent.role === 'tester'
                                ? '#ef4444'
                                : '#9333ea',
                    }}
                  >
                    {agent.role}
                  </span>
                  <span className="text-sm text-foreground">{agent.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Team Composition</h3>
            <div
              className="min-h-[256px] p-4 border-2 border-dashed border-border rounded-md bg-card transition-colors hover:border-primary/50"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {selectedAgents.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Drag agents here to add them to the team
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedAgents.map((agent, index) => {
                    // Count how many agents with same role appear before this one
                    const sameRoleCount = selectedAgents
                      .slice(0, index)
                      .filter(a => a.role === agent.role && a.configId === agent.configId).length
                    const displayName = sameRoleCount > 0 
                      ? `${agent.name} (${sameRoleCount + 1})` 
                      : agent.name

                    return (
                      <div
                        key={agent.id}
                        className="flex items-center justify-between p-2 bg-secondary rounded-md"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="px-2 py-1 rounded text-xs font-medium text-white"
                            style={{
                              backgroundColor:
                                agent.role === 'dev'
                                  ? '#10b981'
                                  : agent.role === 'ux'
                                    ? '#f59e0b'
                                    : agent.role === 'architect'
                                      ? '#3b82f6'
                                      : agent.role === 'tester'
                                        ? '#ef4444'
                                        : '#9333ea',
                            }}
                          >
                            {agent.role}
                          </span>
                          <span className="text-sm text-foreground">{displayName}</span>
                        </div>
                        <button
                          className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                          onClick={() => handleRemoveAgent(agent.id)}
                        >
                          ×
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 p-6 border-t">
        <button
          className="px-4 py-2 text-foreground bg-secondary hover:bg-secondary/80 rounded-md transition-colors"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          className="px-4 py-2 text-primary-foreground bg-primary hover:bg-primary/90 rounded-md transition-colors"
          onClick={handleSave}
        >
          {template ? 'Update Template' : 'Save as Template'}
        </button>
      </div>
    </Modal>
  )
}
