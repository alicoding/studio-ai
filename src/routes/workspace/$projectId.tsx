import { createFileRoute, useNavigate, useParams, Outlet } from '@tanstack/react-router'
import { useEffect, useState, useMemo } from 'react'
import type { JSX } from 'react'
import { toast } from 'sonner'
import { DeleteAgentModal } from '../../components/modals/DeleteAgentModal'
import { Sidebar } from '../../components/layout/Sidebar'
import { ProjectTabs } from '../../components/projects/ProjectTabs'
import { ViewControls } from '../../components/projects/ViewControls'
import { AgentSelectionModal } from '../../components/projects/AgentSelectionModal'
import { CreateAgentModal } from '../../components/agents/CreateAgentModal'
import { AssignRoleModal } from '../../components/agents/AssignRoleModal'
import { TeamSelectionModal } from '../../components/modals/TeamSelectionModal'
import { Button } from '../../components/ui/button'
import { Plus } from 'lucide-react'
import { TeamTemplate } from '../../types/teams'
import { convertToolsToPermissions, type ToolPermission } from '../../types/tool-permissions'

import { useAgentStore, useProjectStore, useWorkflowStore, type Agent } from '../../stores'
import { useAgentRoles } from '../../hooks/useAgentRoles'
import { useWorkspaceData, type ProjectAgent } from '../../hooks/useWorkspaceData'

// SOLID: Modular operation hooks
import { useAgentOperations } from '../../hooks/useAgentOperations'
import { useMessageOperations } from '../../hooks/useMessageOperations'
import { useProjectOperations } from '../../hooks/useProjectOperations'
import { useRoleOperations } from '../../hooks/useRoleOperations'
import { useModalOperations } from '../../hooks/useModalOperations'
import { useWorkspaceLayout } from '../../hooks/useWorkspaceLayout'
import { useWebSocketOperations } from '../../hooks/useWebSocketOperations'
import { useWorkspaceShortcuts } from '../../hooks/useShortcuts'
import { useWorkflowEvents } from '../../hooks/useWorkflowEvents'
import { useApprovalEvents } from '../../hooks/useApprovalEvents'

import { CanvasContent } from '../../components/workspace/CanvasContent'
import { CreateProjectModal } from '../../components/projects/CreateProjectModal'
import { ConnectionStatusBanner } from '../../components/ui/ConnectionStatusBanner'
import VisualWorkflowBuilder from '../../components/workflow-builder/VisualWorkflowBuilder'
import HumanApprovalModal from '../../components/workflow/HumanApprovalModal'

export const Route = createFileRoute('/workspace/$projectId')({
  component: WorkspacePage,
})

interface ProjectData {
  name: string
  description?: string
  workspacePath?: string
}

function WorkspacePage(): JSX.Element | null {
  const navigate = useNavigate()
  const { projectId } = useParams({ from: '/workspace/$projectId' })

  // Zustand stores - get these first
  const { activeProjectId, setActiveProject, getOpenProjects, openProjectInWorkspace } =
    useProjectStore()
  const { clearProjectData: clearWorkflowData } = useWorkflowStore()
  const { clearProjectData: clearAgentData } = useAgentStore()

  // Set the active project based on URL and ensure it's opened in workspace
  useEffect(() => {
    if (projectId) {
      setActiveProject(projectId)
      openProjectInWorkspace(projectId) // Ensure project is open in tabs

      // Clear data from other projects when switching to prevent data bleeding
      clearWorkflowData() // Clear all workflow data
      clearAgentData(projectId) // Keep only agents for current project
    }
  }, [projectId, setActiveProject, openProjectInWorkspace, clearWorkflowData, clearAgentData])

  // DRY: Use optimized workspace data hook for all workspace data
  const { data: workspaceData, loading: workspaceLoading } = useWorkspaceData({
    includeAgents: true,
    includeRoles: true,
    autoRefresh: false, // Disable auto-refresh to prevent constant updates
  })

  // Extract data from workspace hook with memoization
  const projects = useMemo(() => workspaceData?.projects || [], [workspaceData?.projects])
  const agentConfigs = useMemo(
    () => workspaceData?.agentConfigs || [],
    [workspaceData?.agentConfigs]
  )
  const projectAgents = useMemo(
    () => workspaceData?.projectAgents || {},
    [workspaceData?.projectAgents]
  )

  // Get current project
  const currentProject = useMemo(
    () => projects.find((p) => p.id === projectId),
    [projects, projectId]
  )

  // Redirect if project not found
  useEffect(() => {
    if (!workspaceLoading && projects.length > 0 && !currentProject) {
      toast.error('Project not found')
      navigate({ to: '/' })
    }
  }, [workspaceLoading, projects, currentProject, navigate])

  // Get current project agents from workspace data with memoization
  const currentProjectAgents = useMemo(
    () => (projectId ? projectAgents[projectId] || [] : []),
    [projectAgents, projectId]
  )
  const loadingAgents = workspaceLoading

  // Agent roles hook
  const { loadAssignments } = useAgentRoles()

  // SOLID: Modular operation hooks
  const agentOps = useAgentOperations()
  const messageOps = useMessageOperations()
  const projectOps = useProjectOperations()
  const roleOps = useRoleOperations()
  const modalOps = useModalOperations()
  const layout = useWorkspaceLayout()

  // Zustand stores
  const {
    configs, // Updated from availableConfigs
    addAgentConfig,
    setAgentConfigs,
    setAgents, // Add setAgents to sync from hook
    getProjectAgents: getStoreProjectAgents, // Use store getter instead of hook
  } = useAgentStore()

  // WebSocket operations (handles event registration)
  useWebSocketOperations()

  // Project-scoped workflow events (SSE for workflow updates)
  useWorkflowEvents(projectId)

  // Approval events for human-in-the-loop workflows
  const {
    pendingApproval,
    isModalOpen: isApprovalModalOpen,
    closeModal: closeApprovalModal,
    onApprovalProcessed,
  } = useApprovalEvents(projectId)

  // Get only the open projects for workspace tabs
  const openProjects = getOpenProjects()

  // Get raw openProjectIds from store to check restoration status
  const openProjectIds = useProjectStore((state) => state.openProjects)

  // Ensure current project is always shown in tabs, even if not in openProjects yet
  const projectsForTabs = useMemo(() => {
    if (currentProject && !openProjects.find((p) => p.id === currentProject.id)) {
      // Convert currentProject to Project format for tabs
      const projectForTab = {
        id: currentProject.id,
        name: currentProject.name,
        description: currentProject.description,
        path: currentProject.workspacePath || '',
        createdAt: new Date().toISOString(),
        sessionCount: 0,
        status: 'active' as const,
        lastModified: new Date().toISOString(),
        tags: [],
        favorite: false,
      }
      return [...openProjects, projectForTab]
    }
    return openProjects
  }, [openProjects, currentProject])

  // Message handling functions
  const handleBroadcast = () => {
    messageOps.broadcastMessage()
  }

  const handleInterrupt = () => {
    messageOps.interruptMessages()
  }

  // Set up workspace shortcuts
  useWorkspaceShortcuts(
    {
      'interrupt-agents': handleInterrupt,
      'broadcast-message': handleBroadcast,
      'clear-context': () => {
        if (layout.selectedAgentId) {
          handleAgentClear(layout.selectedAgentId)
        }
      },
      'new-project': () => modalOps.openModal('createProject'),
      'new-workflow': () => navigate({ to: `/workspace/${projectId}/workflows/new` }),
    },
    openProjects.length > 0
  ) // Only enable when workspace is active

  // State for single agent deletion modal
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean
    agent: ProjectAgent | null
    isDeleting: boolean
  }>({
    isOpen: false,
    agent: null,
    isDeleting: false,
  })

  // Sync project agents from workspace data into Zustand store
  useEffect(() => {
    if (currentProjectAgents.length > 0 && projectId) {
      const agentsWithOrder: Agent[] = currentProjectAgents.map((agent, index) => ({
        id: agent.id,
        name: agent.name,
        role: agent.role,
        status: agent.status,
        tokens: agent.sessionId ? agent.totalTokens : 0,
        maxTokens: 200000,
        lastMessage: agent.lastMessage,
        sessionId: agent.sessionId || undefined,
        order: index,
        customTools: agent.customTools,
        projectId: projectId, // Set the project ID for proper filtering
      }))
      setAgents(agentsWithOrder)
    } else if (currentProjectAgents.length === 0 && !loadingAgents) {
      // Clear agents when no agents found (not loading)
      setAgents([])
    }
  }, [currentProjectAgents, loadingAgents, setAgents, projectId])

  // Get agents from Zustand store instead of useProjectAgents hook
  const storeAgents = getStoreProjectAgents(projectId || '')

  // Memoize agent IDs to prevent infinite loops
  const agentIds = useMemo(() => storeAgents.map((a) => a.id), [storeAgents])

  // Load role assignments when agent IDs change (using string comparison to prevent loops)
  const agentIdsString = useMemo(() => agentIds.join(','), [agentIds])
  const [loadedAgentIds, setLoadedAgentIds] = useState<string>('')

  useEffect(() => {
    // Only load if agent IDs have actually changed and we haven't loaded them yet
    if (agentIdsString !== loadedAgentIds && agentIds.length > 0) {
      console.log('Loading role assignments for agents:', agentIds, 'in project:', projectId)
      loadAssignments(agentIds, projectId || undefined)
      setLoadedAgentIds(agentIdsString)
    }
  }, [agentIdsString, loadedAgentIds, agentIds, loadAssignments, projectId])

  // Sync agent configs from workspace data into Zustand store
  useEffect(() => {
    if (agentConfigs.length > 0) {
      setAgentConfigs(
        agentConfigs.map((config) => {
          // Convert string[] tools to ToolPermission[] if needed
          let tools: ToolPermission[]
          if (
            Array.isArray(config.tools) &&
            config.tools.length > 0 &&
            typeof config.tools[0] === 'string'
          ) {
            tools = convertToolsToPermissions(config.tools as string[])
          } else {
            tools = config.tools as unknown as ToolPermission[]
          }

          return {
            ...config,
            projectsUsing: [],
            tools,
          }
        })
      )
    }
  }, [agentConfigs, setAgentConfigs])

  const handleAgentClear = async (agentId: string) => {
    // Clear session without prompting - will use system default
    try {
      const result = await agentOps.clearAgentSession(agentId)

      if (result.success) {
        toast.success('Context cleared - agent is now ready for new conversation')
      } else if (result.error) {
        toast.error(`Failed to clear context: ${result.error}`)
      }
    } catch (error) {
      // Handle errors thrown by improved backend validation
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      toast.error(`Failed to clear context: ${errorMessage}`)
      console.error('Agent clear error:', error)
    }
  }

  const handleAgentRemove = async (agentId: string, skipConfirm = false) => {
    const agent = currentProjectAgents.find((a) => a.id === agentId)
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

  const handleAddAgents = async (agentIds: string[]) => {
    const result = await agentOps.addAgentsToProject(agentIds)
    if (result.success) {
      modalOps.closeModal('agentSelection')
    }
  }

  const handleCreateAgent = (agentConfig: import('../../stores').AgentConfig) => {
    addAgentConfig(agentConfig)
    modalOps.closeModal('createAgent')
  }

  // Role operations
  const handleAgentConvert = async (agentId: string) => {
    // Use Zustand getter for more reliable agent lookup
    const agent = getStoreProjectAgents(projectId || '').find((a) => a.id === agentId)
    if (agent) {
      roleOps.startAgentConversion(agent)
    }
  }

  const handleReassignRole = async (agentId: string) => {
    // Use Zustand getter for more reliable agent lookup
    const agent = getStoreProjectAgents(projectId || '').find((a) => a.id === agentId)
    if (agent) {
      roleOps.startRoleReassignment(agent)
    }
  }

  const handleAssignRole = async (roleId: string, customTools?: string[]) => {
    await roleOps.assignRoleToAgent(roleId, customTools)
  }

  // Project operations
  const handleCloseProject = async (projectId: string) => {
    await projectOps.closeProject(projectId)
  }

  const handleCreateProject = async (projectData: ProjectData) => {
    const result = await projectOps.createProject(projectData)
    if (result.success) {
      modalOps.closeModal('createProject')
    }
  }

  const handleLoadTeam = async (team: TeamTemplate) => {
    if (!projectId) {
      toast.error('Please select a project first')
      return
    }

    // Get unique agent configs from the team
    const configIds = [...new Set(team.agents.map((agent) => agent.configId).filter(Boolean))]

    if (configIds.length === 0) {
      toast.error('This team template has no valid agent configurations')
      return
    }

    // Add all agents from the team to the project with their custom names and roles
    const agentsToAdd = team.agents
      .filter((agent) => agent.configId)
      .map((agent) => ({
        configId: agent.configId!,
        name: agent.name,
        role: agent.role, // Include the role from the team configuration
      }))

    if (agentsToAdd.length > 0) {
      try {
        console.log('Adding agents to project:', agentsToAdd)
        const result = await agentOps.addAgentsToProject(agentsToAdd)

        if (result.success) {
          modalOps.closeModal('teamSelection')
          toast.success(`Loaded team "${team.name}" with ${team.agents.length} agents`)
        } else {
          toast.error(result.error || 'Failed to add agents to project')
          console.error('Failed to add agents:', result.error)
        }
      } catch (error) {
        console.error('Failed to add agents:', error)
        toast.error('An error occurred while loading the team')
      }
    } else {
      toast.error('No valid agents to add from this team')
    }
  }

  // Show loading state while project data loads
  if (workspaceLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Loading workspace...</h2>
          <p className="text-muted-foreground">Setting up your project environment</p>
        </div>
      </div>
    )
  }

  // Show error if project not found
  if (!currentProject) {
    return null // Will redirect in useEffect
  }

  return (
    <>
      <ConnectionStatusBanner />
      <ProjectTabs
        projects={projectsForTabs}
        activeProjectId={activeProjectId}
        onProjectSelect={(newProjectId) => {
          setActiveProject(newProjectId)
          navigate({ to: `/workspace/${newProjectId}` })
        }}
        onProjectCreate={() => modalOps.openModal('createProject')}
        onProjectClose={handleCloseProject}
      />

      {!currentProject &&
      openProjectIds.length > 0 &&
      projectsForTabs.length === 0 &&
      projects.length === 0 ? (
        // Show loading state when we have persisted project IDs but projects haven't loaded yet
        <div className="flex items-center justify-center h-[calc(100vh-90px)]">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-4">Loading workspace...</h2>
            <p className="text-muted-foreground">Restoring your open projects</p>
          </div>
        </div>
      ) : !currentProject && projectsForTabs.length === 0 ? (
        <div className="flex items-center justify-center h-[calc(100vh-90px)]">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-4">No projects open</h2>
            <p className="text-muted-foreground mb-6">
              Open a project from the Dashboard or create a new one to get started.
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => navigate({ to: '/' })}>Go to Dashboard</Button>
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
              onLoadTeam={() => modalOps.openModal('teamSelection')}
              projectId={projectId}
            />

            <main className="flex-1 flex flex-col overflow-hidden">
              <ViewControls
                currentView={layout.viewMode}
                selectedAgentId={layout.selectedAgentId}
                canvasMode={layout.canvasMode}
                onViewChange={layout.setViewMode}
                onSidebarToggle={layout.toggleSidebar}
                onNewWorkflow={() => {
                  console.log('New Workflow clicked! ProjectId:', projectId)
                  navigate({ to: `/workspace/${projectId}/workflows/new` })
                }}
              />

              <div className="flex-1 overflow-hidden">
                {/* Check if we have a child route (like /workflows/new) */}
                <Outlet />
                {/* Canvas Content - State-preserving agent/workflow view */}
                <CanvasContent />
              </div>
            </main>
          </div>
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
        currentAgentAssignment={
          roleOps.selectedLegacyAgent
            ? roleOps.getAgentRoleAssignmentData(roleOps.selectedLegacyAgent.id) || undefined
            : undefined
        }
        onAssignRole={handleAssignRole}
        onCreateRole={() => {
          roleOps.cancelRoleAssignment()
          modalOps.openModal('createAgent')
        }}
        isReassignment={roleOps.getLegacyAgentSelection().isReassignment}
        currentRole={roleOps.selectedLegacyAgent?.role}
        currentCustomTools={roleOps.selectedLegacyAgent?.customTools}
      />

      <TeamSelectionModal
        isOpen={modalOps.isTeamSelectionOpen}
        onClose={() => modalOps.closeModal('teamSelection')}
        onSelectTeam={handleLoadTeam}
      />

      {modalOps.isWorkflowBuilderOpen && (
        <VisualWorkflowBuilder
          onClose={() => modalOps.closeModal('workflowBuilder')}
          scope="project"
          projectId={projectId}
        />
      )}

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

      {/* Human Approval Modal */}
      <HumanApprovalModal
        approval={pendingApproval}
        isOpen={isApprovalModalOpen}
        onClose={closeApprovalModal}
        onApprovalProcessed={onApprovalProcessed}
      />
    </>
  )
}
