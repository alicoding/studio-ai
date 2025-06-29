import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Sidebar } from '../components/layout/Sidebar'
import { ProjectTabs } from '../components/projects/ProjectTabs'
import { ViewControls } from '../components/projects/ViewControls'
import { MessageQueue } from '../components/projects/MessageQueue'
import { ChatPanel } from '../components/projects/ChatPanel'
import { AgentSelectionModal } from '../components/projects/AgentSelectionModal'
import { CreateAgentModal } from '../components/agents/CreateAgentModal'

import { useAgentStore, useProjectStore, type Project } from '../stores'

import { SingleView } from '../components/projects/views/SingleView'
import { SplitView } from '../components/projects/views/SplitView'
import { GridView } from '../components/projects/views/GridView'
import { DevelopView } from '../components/projects/views/DevelopView'
import { CreateProjectModal } from '../components/projects/CreateProjectModal'

export const Route = createFileRoute('/')({
  component: ProjectsPage,
})

function ProjectsPage() {
  // Zustand stores
  const {
    agents,
    selectedAgentId,
    availableConfigs,
    setSelectedAgent,
    updateAgentStatus,
    removeAgent,
    sendMessage,
    addAgentConfig,
  } = useAgentStore()

  const {
    projects,
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
    removeProject,
  } = useProjectStore()

  // Modal states
  const [showAgentSelection, setShowAgentSelection] = useState(false)
  const [showCreateAgent, setShowCreateAgent] = useState(false)
  const [showCreateProject, setShowCreateProject] = useState(false)

  const handleSendMessage = (message: string) => {
    if (message.startsWith('@')) {
      const match = message.match(/^@(\w+)\s+(.+)$/)
      if (match) {
        const [, targetAgent, content] = match
        sendMessage(selectedAgentId || 'user', targetAgent, content)
        addToQueue({ target: targetAgent, message: content })
      }
    } else if (message.startsWith('#')) {
      console.log('Execute command (UI-first):', message)
    } else if (selectedAgentId) {
      console.log('Terminal input (UI-first):', { agentId: selectedAgentId, input: message })
    }
  }

  const handleBroadcast = () => {
    console.log('Broadcast command (UI-first):', '#broadcast')
  }

  const handleInterrupt = () => {
    clearQueue()
    console.log('Queue clear (UI-first):', selectedAgentId)
  }

  const handleAgentPause = (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId)
    if (agent) {
      const newStatus = agent.status === 'offline' ? 'online' : 'offline'
      updateAgentStatus(agentId, newStatus)
    }
  }

  const handleAgentClear = (agentId: string) => {
    console.log('Clear agent tokens (UI-first):', agentId)
    // emit('agent:token-update', { agentId, tokens: 0, maxTokens: 200000 })
  }

  const handleAgentRemove = (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId)
    if (agent && confirm(`Remove ${agent.name} from team?`)) {
      removeAgent(agentId)
    }
  }

  const handleCloseProject = (projectId: string) => {
    if (projects.length === 1) {
      alert('Cannot close the last project')
      return
    }

    const project = projects.find((p) => p.id === projectId)
    if (project && confirm(`Close "${project.name}"?`)) {
      removeProject(projectId)
    }
  }

  const handleAddAgents = (agentIds: string[]) => {
    console.log('Adding agents to project:', agentIds)
    setShowAgentSelection(false)
  }

  const handleCreateAgent = (agentConfig: any) => {
    addAgentConfig(agentConfig)
    setShowCreateAgent(false)
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

    // Set as active project
    setActiveProject(newProject.id)

    // Close modal
    setShowCreateProject(false)

    // In a real implementation, this would:
    // 1. Create the actual directory on the filesystem
    // 2. Initialize git repository if requested
    // 3. Copy template files if using a template
    // 4. Set up project configuration
    console.log('Creating project directory:', newProject.directory)
  }

  return (
    <>
      <ProjectTabs
        projects={projects}
        activeProjectId={activeProjectId}
        onProjectSelect={setActiveProject}
        onProjectCreate={() => setShowCreateProject(true)}
        onProjectClose={handleCloseProject}
      />

      <div className="flex h-[calc(100vh-90px)]">
        <Sidebar
          agents={agents}
          selectedAgentId={selectedAgentId}
          isCollapsed={sidebarCollapsed}
          onAgentSelect={setSelectedAgent}
          onAgentPause={handleAgentPause}
          onAgentClear={handleAgentClear}
          onAgentRemove={handleAgentRemove}
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
          />

          <div className="flex-1 overflow-hidden">
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
                {viewMode === 'single' && (
                  <SingleView
                    selectedAgentId={selectedAgentId}
                    onTerminalInput={(agentId, input) =>
                      console.log('Single view terminal input (UI-first):', { agentId, input })
                    }
                  />
                )}
                {viewMode === 'split' && (
                  <SplitView
                    agents={agents}
                    onTerminalInput={(agentId, input) =>
                      console.log('Split view terminal input (UI-first):', { agentId, input })
                    }
                  />
                )}
                {viewMode === 'grid' && (
                  <GridView
                    agents={agents}
                    onTerminalInput={(agentId, input) =>
                      console.log('Grid view terminal input (UI-first):', { agentId, input })
                    }
                  />
                )}
              </div>
            )}
          </div>

          {viewMode !== 'develop' && (
            <>
              <MessageQueue items={messageQueue} onClear={clearQueue} />

              <ChatPanel
                agents={agents}
                onSendMessage={handleSendMessage}
                onBroadcast={handleBroadcast}
                onInterrupt={handleInterrupt}
              />
            </>
          )}
        </main>
      </div>

      {/* Modals */}
      <AgentSelectionModal
        isOpen={showAgentSelection}
        onClose={() => setShowAgentSelection(false)}
        onSelect={handleAddAgents}
        availableAgents={availableConfigs}
        currentAgentIds={agents.map((a) => a.id)}
      />

      <CreateAgentModal
        isOpen={showCreateAgent}
        onClose={() => setShowCreateAgent(false)}
        onCreate={handleCreateAgent}
      />

      <CreateProjectModal
        isOpen={showCreateProject}
        onClose={() => setShowCreateProject(false)}
        onCreate={handleCreateProject}
      />
    </>
  )
}
