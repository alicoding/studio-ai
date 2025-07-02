import { useState } from 'react'
import { Modal } from '../shared/Modal'

interface TeamAgent {
  role: string
  name: string
  systemPrompt: string
}

interface AvailableAgent extends TeamAgent {
  id: string
}

interface SelectedAgent extends TeamAgent {
  id: string
}

interface TeamTemplate {
  id: string
  name: string
  description: string
  agents: TeamAgent[]
  createdAt: string
}

interface TeamBuilderProps {
  isOpen: boolean
  template?: TeamTemplate | null
  onSave: (template: TeamTemplate) => void
  onCancel: () => void
}

// Mock available agent configurations
const AVAILABLE_AGENTS: AvailableAgent[] = [
  { id: 'dev1', name: 'dev_agent', role: 'dev', systemPrompt: 'You are a developer...' },
  { id: 'ux1', name: 'ux_designer', role: 'ux', systemPrompt: 'You are a UX designer...' },
  { id: 'arch1', name: 'architect', role: 'architect', systemPrompt: 'You are an architect...' },
  { id: 'test1', name: 'qa_engineer', role: 'tester', systemPrompt: 'You are a QA engineer...' },
  {
    id: 'orch1',
    name: 'orchestrator',
    role: 'orchestrator',
    systemPrompt: 'You are an orchestrator...',
  },
]

export function TeamBuilder({ isOpen, template, onSave, onCancel }: TeamBuilderProps) {
  const [teamName, setTeamName] = useState(template?.name || '')
  const [teamDescription, setTeamDescription] = useState(template?.description || '')
  const [selectedAgents, setSelectedAgents] = useState<SelectedAgent[]>(
    template?.agents.map((a) => ({
      id: a.name,
      name: a.name,
      role: a.role,
      systemPrompt: a.systemPrompt,
    })) || []
  )
  const [draggedAgent, setDraggedAgent] = useState<AvailableAgent | null>(null)

  const handleDragStart = (e: React.DragEvent, agent: AvailableAgent) => {
    setDraggedAgent(agent)
    e.dataTransfer.effectAllowed = 'copy'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (draggedAgent && !selectedAgents.find((a) => a.id === draggedAgent.id)) {
      setSelectedAgents([
        ...selectedAgents,
        {
          id: draggedAgent.id,
          name: draggedAgent.name,
          role: draggedAgent.role,
          systemPrompt: draggedAgent.systemPrompt || '',
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

    const newTemplate: TeamTemplate = {
      id: template?.id || `team-${Date.now()}`,
      name: teamName,
      description: teamDescription,
      agents: selectedAgents.map((a) => ({
        role: a.role,
        name: a.name,
        systemPrompt: a.systemPrompt,
      })),
      createdAt: template?.createdAt || new Date().toISOString(),
    }

    onSave(newTemplate)
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
            <div className="space-y-2 max-h-64 overflow-y-auto p-2 border border-border rounded-md bg-card">
              {AVAILABLE_AGENTS.map((agent) => (
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
                  {selectedAgents.map((agent) => (
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
                        <span className="text-sm text-foreground">{agent.name}</span>
                      </div>
                      <button
                        className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                        onClick={() => handleRemoveAgent(agent.id)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
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
