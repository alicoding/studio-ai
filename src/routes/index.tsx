import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { toast } from 'sonner'
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

import { useAgentStore, useProjectStore } from '../stores'
import { useProjects } from '../hooks/useProjects'
import { useProjectAgents } from '../hooks/useProjectAgents'
import { useAgentRoles } from '../hooks/useAgentRoles'

// SOLID: Modular operation hooks
import { useAgentOperations } from '../hooks/useAgentOperations'
import { useMessageOperations } from '../hooks/useMessageOperations'
import { useProjectOperations } from '../hooks/useProjectOperations'
import { useRoleOperations } from '../hooks/useRoleOperations'
import { useModalOperations } from '../hooks/useModalOperations'
import { useWorkspaceLayout } from '../hooks/useWorkspaceLayout'
import { useWebSocketOperations } from '../hooks/useWebSocketOperations'

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

  // TODO Phase 3: Remove useProjectAgents hook completely, move server fetching to store
  const { agents: projectAgents, loading: loadingAgents } = useProjectAgents()

  // Agent roles hook
  const { loadAssignments, getAgentRole } = useAgentRoles()

  // SOLID: Modular operation hooks
  const agentOps = useAgentOperations()
  const messageOps = useMessageOperations()
  const projectOps = useProjectOperations()
  const roleOps = useRoleOperations()
  const modalOps = useModalOperations()
  const layout = useWorkspaceLayout()

  // Zustand stores
  const {
    selectedAgentId,
    configs, // Updated from availableConfigs
    addAgentConfig,
    setAgentConfigs,
    setAgents, // Add setAgents to sync from hook
    getProjectAgents: getStoreProjectAgents, // Use store getter instead of hook
  } = useAgentStore()

  const { activeProjectId, messageQueue, setActiveProject, clearQueue, getOpenProjects } =
    useProjectStore()

  // WebSocket operations (handles event registration)
  useWebSocketOperations()

  // Sync projectAgents from hook into Zustand store
  useEffect(() => {
    if (projectAgents.length > 0) {
      setAgents(projectAgents)
    } else if (projectAgents.length === 0 && !loadingAgents) {
      // Clear agents when no agents found (not loading)
      setAgents([])
    }
  }, [projectAgents, loadingAgents, setAgents])

  // Get agents from Zustand store instead of useProjectAgents hook
  const storeAgents = getStoreProjectAgents(activeProjectId || '')

  // Load role assignments when store agents change
  useEffect(() => {
    if (storeAgents.length > 0) {
      const agentIds = storeAgents.map((a) => a.id)
      loadAssignments(agentIds)
    }
  }, [storeAgents, loadAssignments])

  // Merge store agents with their role assignments
  const agentsWithRoles = storeAgents.map((agent) => {
    const roleConfig = getAgentRole(agent.id)
    return {
      ...agent,
      role: roleConfig?.role || agent.role,
    }
  })

  // Get only the open projects for workspace tabs
  const openProjects = getOpenProjects()

  // Get active project details
  const activeProject = projects.find((p) => p.id === activeProjectId)

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

  // Message handling
  const handleSendMessage = async (message: string) => {
    const result = await messageOps.sendMessage(message, agentsWithRoles, activeProject)
    if (!result.success && result.error) {
      toast.error(result.error)
    }
  }

  const handleBroadcast = () => {
    messageOps.broadcastMessage()
  }

  const handleInterrupt = () => {
    messageOps.interruptMessages()
  }

  // Agent operations
  const handleAgentPause = async (agentId: string) => {
    const agent = agentsWithRoles.find((a) => a.id === agentId)
    if (agent) {
      await agentOps.toggleAgent(agentId, agent)
    }
  }

  const handleAgentClear = async (agentId: string) => {
    // Clear session without prompting - will use system default
    const result = await agentOps.clearAgentSession(agentId)

    if (result.success) {
      toast.success(
        `Session cleared${result.newSessionId ? ` - New session: ${result.newSessionId.slice(0, 8)}...` : ''}`
      )
    } else if (result.error) {
      toast.error(`Failed to clear session: ${result.error}`)
    }
  }

  const handleAgentRemove = async (agentId: string) => {
    const agent = projectAgents.find((a) => a.id === agentId)
    if (agent) {
      await agentOps.removeAgentFromTeam(agentId, agent.name)
    }
  }

  // Project operations
  const handleCloseProject = async (projectId: string) => {
    await projectOps.closeProject(projectId)
  }

  const handleAddAgents = async (agentIds: string[]) => {
    const result = await agentOps.addAgentsToProject(agentIds)
    if (result.success) {
      modalOps.closeModal('agentSelection')
    }
  }

  const handleCreateAgent = (agentConfig: any) => {
    addAgentConfig(agentConfig)
    modalOps.closeModal('createAgent')
  }

  const handleCleanupZombies = async () => {
    const result = await agentOps.cleanupZombies()
    if (result.success) {
      toast.success(`Cleanup completed: ${result.killedCount || 0} zombie processes killed`)
    } else {
      toast.error('Failed to cleanup zombie processes')
    }
  }

  // Role operations
  const handleAgentConvert = async (agentId: string) => {
    // Use Zustand getter for more reliable agent lookup
    const agent = getStoreProjectAgents(activeProjectId || '').find((a) => a.id === agentId)
    if (agent) {
      console.log('Starting agent conversion for:', agent)
      roleOps.startAgentConversion(agent)
    } else {
      console.error('Agent not found for conversion:', agentId)
    }
  }

  const handleReassignRole = async (agentId: string) => {
    // Use Zustand getter for more reliable agent lookup
    const agent = getStoreProjectAgents(activeProjectId || '').find((a) => a.id === agentId)
    if (agent) {
      console.log('Starting role reassignment for:', agent)
      roleOps.startRoleReassignment(agent)
    } else {
      console.error('Agent not found for role reassignment:', agentId)
    }
  }

  const handleAssignRole = async (roleId: string, customTools?: string[]) => {
    await roleOps.assignRoleToAgent(roleId, customTools)
  }

  const handleCreateProject = (projectData: any) => {
    const result = projectOps.createProject(projectData)
    if (result.success) {
      modalOps.closeModal('createProject')
    }
  }

  return (
    <>
      <ProjectTabs
        projects={openProjects}
        activeProjectId={activeProjectId}
        onProjectSelect={setActiveProject}
        onProjectCreate={() => modalOps.openModal('createProject')}
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
              <Button onClick={() => modalOps.openModal('createProject')} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Create New Project
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-[calc(100vh-90px)]">
          <Sidebar
            isCollapsed={layout.sidebarCollapsed}
            isLoading={loadingAgents}
            onAgentPause={handleAgentPause}
            onAgentClear={handleAgentClear}
            onAgentRemove={handleAgentRemove}
            onAgentConvert={handleAgentConvert}
            onAgentReassignRole={handleReassignRole}
            onAddAgent={() => modalOps.openModal('agentSelection')}
            onCreateAgent={() => modalOps.openModal('createAgent')}
            onLoadTeam={() => toast.info('Load team template coming soon')}
          />

          <main className="flex-1 flex flex-col overflow-hidden">
            <ViewControls
              currentView={layout.viewMode}
              selectedAgentId={selectedAgentId}
              onViewChange={layout.setViewMode}
              onSidebarToggle={layout.toggleSidebar}
              onCleanupZombies={handleCleanupZombies}
            />

            <div className="flex-1 overflow-hidden flex flex-col">
              {layout.isDevelopView ? (
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
                  {layout.isSingleView && <SingleView selectedAgentId={selectedAgentId} />}
                  {layout.isSplitView && <SplitView />}
                  {layout.isGridView && <GridView />}
                </div>
              )}
            </div>

            {layout.showChatPanel && (
              <>
                <MessageQueue items={messageQueue} onClear={clearQueue} />

                <ChatPanel
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
        isOpen={modalOps.isAgentSelectionOpen}
        onClose={() => modalOps.closeModal('agentSelection')}
        onSelect={handleAddAgents}
        availableAgents={configs}
        currentAgentIds={agentsWithRoles.map((a) => a.id)}
      />

      <CreateAgentModal
        isOpen={modalOps.isCreateAgentOpen}
        onClose={() => modalOps.closeModal('createAgent')}
        onCreate={handleCreateAgent}
      />

      <AssignRoleModal
        isOpen={roleOps.showAssignRole}
        onClose={roleOps.cancelRoleAssignment}
        agentName={roleOps.selectedLegacyAgent?.name || ''}
        agentId={roleOps.selectedLegacyAgent?.id || ''}
        availableRoles={configs}
        currentAgentConfig={
          roleOps.selectedLegacyAgent
            ? roleOps.getAgentRoleAssignment(roleOps.selectedLegacyAgent.id) || undefined
            : undefined
        }
        onAssignRole={handleAssignRole}
        onCreateRole={() => {
          roleOps.cancelRoleAssignment()
          modalOps.openModal('createAgent')
        }}
        isReassignment={roleOps.getLegacyAgentSelection().isReassignment}
        currentRole={roleOps.selectedLegacyAgent?.role}
      />

      <CreateProjectModal
        isOpen={modalOps.isCreateProjectOpen}
        onClose={() => modalOps.closeModal('createProject')}
        onCreate={handleCreateProject}
      />
    </>
  )
}
