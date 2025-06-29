import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { AgentConfigCard } from '../components/agents/AgentConfigCard'
import { CreateAgentModal } from '../components/agents/CreateAgentModal'
import { PageLayout } from '../components/layout/PageLayout'
import { useAgentStore } from '../stores'

export const Route = createFileRoute('/agents')({
  component: AgentsPage,
})

interface AgentConfig {
  id: string
  name: string
  role: string
  systemPrompt: string
  tools: string[]
  model: string
  projectsUsing: string[]
}

function AgentsPage() {
  const {
    availableConfigs: agents,
    addAgentConfig,
    updateAgentConfig,
    removeAgentConfig,
  } = useAgentStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingAgent, setEditingAgent] = useState<AgentConfig | null>(null)

  const filteredAgents = agents.filter((agent) => {
    const matchesSearch =
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.role.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === 'all' || agent.role === roleFilter
    return matchesSearch && matchesRole
  })

  const handleEdit = (id: string) => {
    const agent = agents.find((a) => a.id === id)
    if (agent) {
      setEditingAgent(agent)
      setShowModal(true)
    }
  }

  const handleClone = (id: string) => {
    const agent = agents.find((a) => a.id === id)
    if (agent) {
      const cloned = {
        ...agent,
        id: `${agent.role}-${Date.now()}`,
        name: `${agent.name} (Copy)`,
        projectsUsing: [],
      }
      addAgentConfig(cloned)
    }
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this agent configuration?')) {
      removeAgentConfig(id)
    }
  }

  const handleSaveAgent = (agent: AgentConfig) => {
    if (editingAgent) {
      updateAgentConfig(agent)
    } else {
      addAgentConfig(agent)
    }
    setShowModal(false)
    setEditingAgent(null)
  }

  return (
    <PageLayout>
      <div className="flex flex-col space-y-6 bg-background">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Agent Configurations</h1>
          <button
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            onClick={() => {
              setEditingAgent(null)
              setShowModal(true)
            }}
          >
            Create New Agent
          </button>
        </div>

        <div className="flex gap-4 mb-6">
          <input
            type="text"
            className="flex-1 px-4 py-2 bg-input border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <select
            className="px-4 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="dev">Developer</option>
            <option value="architect">Architect</option>
            <option value="ux">UX Designer</option>
            <option value="tester">Tester</option>
            <option value="orchestrator">Orchestrator</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto">
          {filteredAgents.map((agent) => (
            <AgentConfigCard
              key={agent.id}
              agent={agent}
              onEdit={handleEdit}
              onClone={handleClone}
              onDelete={handleDelete}
            />
          ))}
        </div>

        <CreateAgentModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false)
            setEditingAgent(null)
          }}
          onCreate={handleSaveAgent}
          agent={editingAgent}
        />
      </div>
    </PageLayout>
  )
}
