import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Sidebar } from '../components/layout/Sidebar'
import { ProjectTabs } from '../components/projects/ProjectTabs'
import { ViewControls } from '../components/projects/ViewControls'
import { MessageQueue } from '../components/projects/MessageQueue'
import { ChatPanel } from '../components/projects/ChatPanel'
import { AgentSelectionModal } from '../components/projects/AgentSelectionModal'
import { CreateAgentModal } from '../components/agents/CreateAgentModal'
import { AssignRoleModal } from '../components/agents/AssignRoleModal'
import { Button } from '../components/ui/button'
import { Plus } from 'lucide-react'

import { useAgentStore, useProjectStore, type Project } from '../stores'
import { useProjects } from '../hooks/useProjects'
import { useProjectAgents } from '../hooks/useProjectAgents'
import { useAgentRoles } from '../hooks/useAgentRoles'
import { useClaudeMessages } from '../hooks/useClaudeMessages'
import { useProcessManager } from '../hooks/useProcessManager'
import { useWebSocket } from '../hooks/useWebSocket'

import { SingleView } from '../components/projects/views/SingleView'
import { SplitView } from '../components/projects/views/SplitView'
import { GridView } from '../components/projects/views/GridView'
import { DevelopView } from '../components/projects/views/DevelopView'
import { CreateProjectModal } from '../components/projects/CreateProjectModal'

export const Route = createFileRoute('/')({
  component: ProjectsPage,
})

function ProjectsPage() {
  const navigate = useNavigate()

  // DRY: Use shared hook for fetching projects
  const { projects } = useProjects()

  // Get project-specific agents
  const { agents: projectAgents, loading: loadingAgents } = useProjectAgents()

  // Agent roles hook
  const { assignRole, roleAssignments, loadAssignments, getAgentRole } = useAgentRoles()

  // Load role assignments when agents change
  useEffect(() => {
    if (projectAgents.length > 0) {
      const agentIds = projectAgents.map((a) => a.id)
      loadAssignments(agentIds)
    }
  }, [projectAgents, loadAssignments])

  // Merge agents with their role assignments
  const agentsWithRoles = projectAgents.map((agent) => {
    const roleConfig = getAgentRole(agent.id)
    return {
      ...agent,
      role: roleConfig?.role || agent.role,
    }
  })

  // Claude messages hook
  const { sendMessage: sendClaudeMessage } = useClaudeMessages()

  // Process management hook
  const processManager = useProcessManager()

  // WebSocket connection
  const { socket } = useWebSocket()

  // Zustand stores
  const {
    selectedAgentId,
    availableConfigs,
    setSelectedAgent,
    updateAgentStatus,
    updateAgentSessionId,
    removeAgent,
    addAgentConfig,
    setAgentConfigs,
  } = useAgentStore()

  const {
    activeProjectId,
    messageQueue,
    viewMode,
    sidebarCollapsed,
    setActiveProject,
    addProject,
    addToQueue,
    clearQueue,
    setViewMode,
    setSidebarCollapsed,
    getOpenProjects,
    closeProjectInWorkspace,
    openProjectInWorkspace,
  } = useProjectStore()

  // Get only the open projects for workspace tabs
  const openProjects = getOpenProjects()

  // Get active project details
  const activeProject = projects.find((p) => p.id === activeProjectId)

  // Modal states
  const [showAgentSelection, setShowAgentSelection] = useState(false)
  const [showCreateAgent, setShowCreateAgent] = useState(false)
  const [showCreateProject, setShowCreateProject] = useState(false)
  const [showAssignRole, setShowAssignRole] = useState(false)
  const [selectedLegacyAgent, setSelectedLegacyAgent] = useState<any>(null)

  // Load agent configs from server on mount
  useEffect(() => {
    const loadAgentConfigs = async () => {
      try {
        const response = await fetch('/api/agents')
        if (response.ok) {
          const configs = await response.json()
          setAgentConfigs(configs)
        }
      } catch (error) {
        console.error('Failed to load agent configs:', error)
      }
    }
    loadAgentConfigs()
  }, [setAgentConfigs])

  // Listen for agent status updates via WebSocket
  useEffect(() => {
    if (!socket) return

    const handleAgentStatusUpdate = (data: any) => {
      console.log('Agent status update:', data)
      if (data.agentId && data.status) {
        updateAgentStatus(data.agentId, data.status)
      }
    }

    socket.on('agent:status', handleAgentStatusUpdate)

    return () => {
      socket.off('agent:status', handleAgentStatusUpdate)
    }
  }, [socket, updateAgentStatus])

  const handleSendMessage = async (message: string) => {
    if (message.startsWith('@')) {
      // Use ProcessManager for @mentions - auto-respawns dead agents
      if (activeProjectId && selectedAgentId) {
        try {
          await processManager.sendMention(message, selectedAgentId, activeProjectId)
          addToQueue({
            target: message.split(' ')[0],
            message: message.split(' ').slice(1).join(' '),
          })
        } catch (error) {
          console.error('Failed to send @mention:', error)
        }
      }
    } else if (message.startsWith('#')) {
      console.log('Execute command (UI-first):', message)
    } else {
      // Send regular messages through Claude API
      // Get the selected agent to use their sessionId
      const selectedAgent = agentsWithRoles.find((a) => a.id === selectedAgentId)

      const result = await sendClaudeMessage(message, {
        projectPath: activeProject?.path,
        role: 'dev', // Valid roles: 'dev', 'ux', 'test', 'pm'
        sessionId: selectedAgent?.sessionId || undefined, // Use selected agent's sessionId for resuming
      })

      if (result && result.sessionId) {
        console.log('Claude response:', result.response)
        console.log('New session ID:', result.sessionId)

        // Update the agent's sessionId if we have a selected agent
        if (selectedAgentId) {
          updateAgentSessionId(selectedAgentId, result.sessionId)
        }
        // Messages are handled via WebSocket events in the API
      }
    }
  }

  const handleBroadcast = () => {
    console.log('Broadcast command (UI-first):', '#broadcast')
  }

  const handleInterrupt = () => {
    clearQueue()
    console.log('Queue clear (UI-first):', selectedAgentId)
  }

  const handleAgentPause = async (agentId: string) => {
    try {
      // Get agent from Zustand store
      const agent = agentsWithRoles.find((a) => a.id === agentId)
      if (!agent || !activeProjectId) return

      if (agent.status === 'offline') {
        // Agent is offline - spawn it
        console.log(`Spawning agent ${agentId}...`)

        // Try to find existing config first
        const existingConfig = availableConfigs.find((c) => c.id === agentId)

        const agentConfig = existingConfig
          ? {
              role: existingConfig.role,
              systemPrompt: existingConfig.systemPrompt,
              tools: existingConfig.tools,
            }
          : {
              // Create dynamic config for agents without existing configuration
              name: agent.name,
              role: agent.role,
              systemPrompt: `You are ${agent.name}, a ${agent.role} agent.`,
              tools: ['file_system', 'terminal', 'web_search'],
              model: 'claude-3-opus',
            }

        await processManager.spawnAgent(agentId, activeProjectId, agentConfig)

        // Update UI status to online
        updateAgentStatus(agentId, 'online')
        console.log(`Agent ${agentId} spawned and online`)
      } else {
        // Agent is online/busy/ready - kill the process
        console.log(`Stopping agent ${agentId}...`)
        await processManager.killAgent(agentId)

        // Update UI status to offline
        updateAgentStatus(agentId, 'offline')
        console.log(`Agent ${agentId} stopped`)
      }
    } catch (error) {
      console.error(`Failed to toggle agent ${agentId}:`, error)
      // Revert UI status on error
      const agent = agentsWithRoles.find((a) => a.id === agentId)
      if (agent) {
        updateAgentStatus(agentId, agent.status)
      }
    }
  }

  const handleAgentClear = (agentId: string) => {
    console.log('Clear agent tokens (UI-first):', agentId)
    // emit('agent:token-update', { agentId, tokens: 0, maxTokens: 200000 })
  }

  const handleAgentRemove = async (agentId: string) => {
    const agent = projectAgents.find((a) => a.id === agentId)
    if (agent && confirm(`Remove ${agent.name} from team?`)) {
      try {
        // Kill the agent process if it exists
        await processManager.killAgent(agentId)
        // Remove from Zustand store
        removeAgent(agentId)
        console.log(`Agent ${agentId} removed from team and process killed`)
      } catch (error) {
        console.error(`Failed to remove agent ${agentId}:`, error)
        // Still remove from UI store even if process kill fails
        removeAgent(agentId)
      }
    }
  }

  const handleCloseProject = async (projectId: string) => {
    const project = openProjects.find((p) => p.id === projectId)
    if (project) {
      try {
        // Kill all agents for this project
        await processManager.killProject(projectId)
        // Close project in workspace
        closeProjectInWorkspace(projectId)
        console.log(`Project ${projectId} closed and all agents killed`)
      } catch (error) {
        console.error(`Failed to cleanup project ${projectId}:`, error)
        // Still close the project even if cleanup fails
        closeProjectInWorkspace(projectId)
      }
    }
  }

  const handleAddAgents = async (agentIds: string[]) => {
    if (!activeProjectId) return

    try {
      // Spawn agents using ProcessManager
      for (const agentId of agentIds) {
        const agentConfig = availableConfigs.find((c) => c.id === agentId)
        if (agentConfig) {
          await processManager.spawnAgent(agentId, activeProjectId, {
            role: agentConfig.role,
            systemPrompt: agentConfig.systemPrompt || '',
            tools: agentConfig.tools || [],
          })
          console.log(`Agent ${agentId} spawned for project ${activeProjectId}`)
        }
      }
      setShowAgentSelection(false)
    } catch (error) {
      console.error('Failed to add agents:', error)
    }
  }

  const handleCreateAgent = (agentConfig: any) => {
    addAgentConfig(agentConfig)
    setShowCreateAgent(false)
  }

  const handleCleanupZombies = async () => {
    try {
      const result = await processManager.cleanup()
      console.log('Zombie cleanup completed:', result)
      alert(`Cleanup completed: ${result?.killedCount || 0} zombie processes killed`)
    } catch (error) {
      console.error('Failed to cleanup zombies:', error)
      alert('Failed to cleanup zombie processes')
    }
  }

  const handleAgentConvert = async (agentId: string) => {
    const agent = agentsWithRoles.find((a) => a.id === agentId)
    if (!agent) return

    setSelectedLegacyAgent(agent)
    setShowAssignRole(true)
  }

  const handleReassignRole = async (agentId: string) => {
    const agent = agentsWithRoles.find((a) => a.id === agentId)
    if (!agent) return

    setSelectedLegacyAgent(agent)
    setShowAssignRole(true)
  }

  const handleAssignRole = async (roleId: string, customTools?: string[]) => {
    if (!selectedLegacyAgent) return

    try {
      const roleConfig = availableConfigs.find((c) => c.id === roleId)
      if (!roleConfig) return

      // Simply assign the role to the agent
      await assignRole(selectedLegacyAgent.id, roleId, customTools)

      console.log(`Agent ${selectedLegacyAgent.name} assigned role ${roleConfig.name}`)
      setShowAssignRole(false)
      setSelectedLegacyAgent(null)
    } catch (error) {
      console.error('Failed to assign role:', error)
      alert(`Failed to assign role: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleCreateProject = (projectData: any) => {
    const newProject: Project = {
      ...projectData,
      id: `project-${Date.now()}`,
      lastModified: new Date().toISOString(),
      agentCount: 0,
      agentIds: [],
      directory:
        projectData.directory ||
        `~/projects/${projectData.name.toLowerCase().replace(/\s+/g, '-')}`,
    }

    // Add project to store
    addProject(newProject)

    // Open in workspace and make active
    openProjectInWorkspace(newProject.id)

    // Close modal
    setShowCreateProject(false)

    // In a real implementation, this would:
    // 1. Create the actual directory on the filesystem
    // 2. Initialize git repository if requested
    // 3. Copy template files if using a template
    // 4. Set up project configuration
    console.log('Creating project directory:', newProject.path)
  }

  return (
    <>
      <ProjectTabs
        projects={openProjects}
        activeProjectId={activeProjectId}
        onProjectSelect={setActiveProject}
        onProjectCreate={() => setShowCreateProject(true)}
        onProjectClose={handleCloseProject}
      />

      {openProjects.length === 0 ? (
        <div className="flex items-center justify-center h-[calc(100vh-90px)]">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-4">No projects open</h2>
            <p className="text-muted-foreground mb-6">
              Open a project from the Projects page or create a new one to get started.
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => navigate({ to: '/projects' })}>Browse Projects</Button>
              <Button onClick={() => setShowCreateProject(true)} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Create New Project
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-[calc(100vh-90px)]">
          <Sidebar
            agents={agentsWithRoles}
            selectedAgentId={selectedAgentId}
            isCollapsed={sidebarCollapsed}
            isLoading={loadingAgents}
            availableConfigs={availableConfigs}
            onAgentSelect={setSelectedAgent}
            onAgentPause={handleAgentPause}
            onAgentClear={handleAgentClear}
            onAgentRemove={handleAgentRemove}
            onAgentConvert={handleAgentConvert}
            onAgentReassignRole={handleReassignRole}
            onAddAgent={() => setShowAgentSelection(true)}
            onCreateAgent={() => setShowCreateAgent(true)}
            onLoadTeam={() => alert('Load team template coming soon')}
          />

          <main className="flex-1 flex flex-col overflow-hidden">
            <ViewControls
              currentView={viewMode}
              selectedAgentId={selectedAgentId}
              onViewChange={setViewMode}
              onSidebarToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
              onCleanupZombies={handleCleanupZombies}
            />

            <div className="flex-1 overflow-hidden flex flex-col">
              {viewMode === 'develop' ? (
                <DevelopView
                  onTerminalInput={(command) =>
                    console.log('Develop terminal input (UI-first):', {
                      agentId: 'server',
                      input: command,
                    })
                  }
                />
              ) : (
                <div className="flex-1 flex overflow-hidden">
                  {viewMode === 'single' && <SingleView selectedAgentId={selectedAgentId} />}
                  {viewMode === 'split' && <SplitView agents={projectAgents} />}
                  {viewMode === 'grid' && <GridView agents={projectAgents} />}
                </div>
              )}
            </div>

            {viewMode !== 'develop' && (
              <>
                <MessageQueue items={messageQueue} onClear={clearQueue} />

                <ChatPanel
                  agents={projectAgents}
                  onSendMessage={handleSendMessage}
                  onBroadcast={handleBroadcast}
                  onInterrupt={handleInterrupt}
                />
              </>
            )}
          </main>
        </div>
      )}

      {/* Modals */}
      <AgentSelectionModal
        isOpen={showAgentSelection}
        onClose={() => setShowAgentSelection(false)}
        onSelect={handleAddAgents}
        availableAgents={availableConfigs}
        currentAgentIds={agentsWithRoles.map((a) => a.id)}
      />

      <CreateAgentModal
        isOpen={showCreateAgent}
        onClose={() => setShowCreateAgent(false)}
        onCreate={handleCreateAgent}
      />

      <AssignRoleModal
        isOpen={showAssignRole}
        onClose={() => {
          setShowAssignRole(false)
          setSelectedLegacyAgent(null)
        }}
        agentName={selectedLegacyAgent?.name || ''}
        agentId={selectedLegacyAgent?.id || ''}
        availableRoles={availableConfigs}
        currentAgentConfig={
          selectedLegacyAgent && roleAssignments[selectedLegacyAgent.id]
            ? availableConfigs.find((c) => c.id === roleAssignments[selectedLegacyAgent.id].roleId)
            : undefined
        }
        onAssignRole={handleAssignRole}
        onCreateRole={() => {
          setShowAssignRole(false)
          setShowCreateAgent(true)
        }}
        isReassignment={!!(selectedLegacyAgent && roleAssignments[selectedLegacyAgent.id])}
        currentRole={selectedLegacyAgent?.role}
      />

      <CreateProjectModal
        isOpen={showCreateProject}
        onClose={() => setShowCreateProject(false)}
        onCreate={handleCreateProject}
      />
    </>
  )
}
