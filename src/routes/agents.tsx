import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { AgentConfigCard } from '../components/agents/AgentConfigCard'
import { CreateAgentModal } from '../components/agents/CreateAgentModal'
import { PageLayout } from '../components/layout/PageLayout'
import { useAgentStore, type AgentConfig } from '../stores'

export const Route = createFileRoute('/agents')({
  component: AgentsPage,
})

function AgentsPage() {
  const {
    configs: agents, // Updated from availableConfigs
    setAgentConfigs,
    addAgentConfig,
    updateAgentConfig,
    removeAgentConfig,
  } = useAgentStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingAgent, setEditingAgent] = useState<AgentConfig | null>(null)
  const [loading, setLoading] = useState(true)

  // Load agents from server on mount
  useEffect(() => {
    const loadAgents = async () => {
      try {
        const response = await fetch('/api/agents')
        if (response.ok) {
          const data = await response.json()
          setAgentConfigs(data)
        }
      } catch (error) {
        console.error('Failed to load agents:', error)
      } finally {
        setLoading(false)
      }
    }
    loadAgents()
  }, [setAgentConfigs])

  const filteredAgents = agents.filter((agent) => {
    // Safety check for agent properties
    if (!agent || !agent.name || !agent.role) {
      return false
    }

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

  const handleClone = async (id: string) => {
    const agent = agents.find((a) => a.id === id)
    if (agent) {
      const cloned = {
        ...agent,
        id: undefined, // Let server generate new ID
        name: `${agent.name} (Copy)`,
        projectsUsing: [],
      }

      try {
        const response = await fetch('/api/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cloned),
        })

        if (response.ok) {
          const newAgent = await response.json()
          addAgentConfig(newAgent)
        }
      } catch (error) {
        console.error('Failed to clone agent:', error)
        alert('Failed to clone agent')
      }
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this agent configuration?')) {
      try {
        const response = await fetch(`/api/agents/${id}`, {
          method: 'DELETE',
        })

        if (response.ok) {
          removeAgentConfig(id)
        } else {
          throw new Error('Failed to delete')
        }
      } catch (error) {
        console.error('Failed to delete agent:', error)
        alert('Failed to delete agent')
      }
    }
  }

  const handleSaveAgent = async (agent: AgentConfig) => {
    try {
      if (editingAgent) {
        // Update existing agent
        const response = await fetch(`/api/agents/${agent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(agent),
        })

        if (response.ok) {
          const updatedAgent = await response.json()
          updateAgentConfig(updatedAgent)
        } else {
          throw new Error('Failed to update')
        }
      } else {
        // Create new agent
        const response = await fetch('/api/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(agent),
        })

        if (response.ok) {
          const newAgent = await response.json()
          addAgentConfig(newAgent)
        } else {
          throw new Error('Failed to create')
        }
      }
      setShowModal(false)
      setEditingAgent(null)
    } catch (error) {
      console.error('Failed to save agent:', error)
      alert('Failed to save agent')
    }
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
          {loading ? (
            <div className="col-span-full text-center py-12">
              <div className="text-muted-foreground">Loading agents...</div>
            </div>
          ) : filteredAgents.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="text-muted-foreground">
                {searchQuery || roleFilter !== 'all'
                  ? 'No agents match your filters'
                  : 'No agent configurations yet. Create your first one!'}
              </div>
            </div>
          ) : (
            filteredAgents.map((agent) => (
              <AgentConfigCard
                key={agent.id}
                agent={agent}
                onEdit={handleEdit}
                onClone={handleClone}
                onDelete={handleDelete}
              />
            ))
          )}
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
