import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState, useMemo } from 'react'
import { toast } from 'sonner'
import { DeleteAgentModal } from '../components/modals/DeleteAgentModal'
import { Sidebar } from '../components/layout/Sidebar'
import { ProjectTabs } from '../components/projects/ProjectTabs'
import { ViewControls } from '../components/projects/ViewControls'
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
import { StatusBar } from '../components/workspace/StatusBar'
import { ErrorMonitor } from '../services/ErrorMonitor'
import { useDiagnosticsStore } from '../stores/diagnostics'

export const Route = createFileRoute('/')({
  component: ProjectsPage,
})

function ProjectsPage() {
  const navigate = useNavigate()

  // DRY: Use shared hook for fetching projects
  const { projects } = useProjects()

  // Initialize diagnostic monitoring globally on app start
  useEffect(() => {
    console.log('[ProjectsPage] Initializing global diagnostic monitoring')
    const monitor = ErrorMonitor.getInstance()
    const { setDiagnostics, setMonitoring } = useDiagnosticsStore.getState()

    // Set up listeners if not already done
    if (!monitor.isMonitoring) {
      monitor.onDiagnosticsUpdated(({ source, diagnostics }) => {
        console.log(`[ProjectsPage] Global diagnostic update: ${diagnostics.length} for ${source}`)
        setDiagnostics(source, diagnostics)
      })

      monitor.onMonitoringStarted(() => {
        console.log('[ProjectsPage] Global monitoring started')
        setMonitoring(true)
      })

      monitor.onMonitoringStopped(() => {
        console.log('[ProjectsPage] Global monitoring stopped')
        setMonitoring(false)
      })

      // Start monitoring Claude Studio by default
      const projectPath = '/Users/ali/claude-swarm/claude-team/claude-studio'
      monitor
        .startMonitoring(projectPath)
        .then(() => {
          console.log('[ProjectsPage] Global monitoring initialized')
        })
        .catch((error) => {
          console.error('[ProjectsPage] Failed to start global monitoring:', error)
        })
    }
  }, [])

  // Use project agents from configured agents
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

  const { activeProjectId, setActiveProject, getOpenProjects } = useProjectStore()

  // WebSocket operations (handles event registration)
  useWebSocketOperations()

  // State for single agent deletion modal
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean
    agent: any | null
    isDeleting: boolean
  }>({
    isOpen: false,
    agent: null,
    isDeleting: false,
  })

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

  // Memoize agent IDs to prevent infinite loops
  const agentIds = useMemo(() => storeAgents.map((a) => a.id), [storeAgents])
  const agentIdsString = useMemo(() => agentIds.join(','), [agentIds])

  // Load role assignments when agent IDs change
  useEffect(() => {
    if (agentIds.length > 0) {
      loadAssignments(agentIds)
    }
  }, [agentIdsString, loadAssignments])

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

  const handleAgentRemove = async (agentId: string, skipConfirm = false) => {
    const agent = projectAgents.find((a) => a.id === agentId)
    if (agent) {
      if (skipConfirm) {
        // Batch deletion, skip individual modal
        await agentOps.removeAgentFromTeam(agentId, agent.name, true)
      } else {
        // Single deletion, show modal
        setDeleteModalState({
          isOpen: true,
          agent: agent,
          isDeleting: false,
        })
      }
    }
  }

  // Handle confirmation from the single delete modal
  const handleSingleDeleteConfirm = async () => {
    if (!deleteModalState.agent) return

    setDeleteModalState((prev) => ({ ...prev, isDeleting: true }))

    await agentOps.removeAgentFromTeam(
      deleteModalState.agent.id,
      deleteModalState.agent.name,
      true // Skip the old confirm dialog
    )

    setDeleteModalState({
      isOpen: false,
      agent: null,
      isDeleting: false,
    })
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
        <div className="flex flex-col h-[calc(100vh-90px)]">
          <div className="flex flex-1 overflow-hidden">
            <Sidebar
              isCollapsed={layout.sidebarCollapsed}
              isLoading={loadingAgents}
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
                  <>
                    <div className="flex-1 flex overflow-hidden">
                      {layout.isSingleView && <SingleView selectedAgentId={selectedAgentId} />}
                      {layout.isSplitView && <SplitView />}
                      {layout.isGridView && <GridView />}
                    </div>

                    {/* Chat input panel */}
                    {layout.showChatPanel && (
                      <ChatPanel
                        onSendMessage={handleSendMessage}
                        onBroadcast={handleBroadcast}
                        onInterrupt={handleInterrupt}
                      />
                    )}
                  </>
                )}
              </div>
            </main>
          </div>

          {/* VSCode-style status bar at bottom */}
          <StatusBar />
        </div>
      )}

      {/* Modals */}
      <AgentSelectionModal
        isOpen={modalOps.isAgentSelectionOpen}
        onClose={() => modalOps.closeModal('agentSelection')}
        onSelect={handleAddAgents}
        availableAgents={configs}
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

      {/* Single Agent Delete Modal */}
      {deleteModalState.agent && (
        <DeleteAgentModal
          isOpen={deleteModalState.isOpen}
          onClose={() => setDeleteModalState({ isOpen: false, agent: null, isDeleting: false })}
          onConfirm={handleSingleDeleteConfirm}
          agents={[deleteModalState.agent]}
          isDeleting={deleteModalState.isDeleting}
        />
      )}
    </>
  )
}
