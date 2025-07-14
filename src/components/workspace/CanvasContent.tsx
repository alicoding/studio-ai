/**
 * Canvas Content Component - State-Preserving Multi-Mode Canvas
 *
 * SOLID: Single responsibility - canvas content management
 * DRY: Reuses existing chat and workflow components
 * KISS: Simple mode switching with state preservation
 * State Preservation: Both components stay mounted, visibility toggled
 */

import React, { useMemo } from 'react'
import { useWorkspaceLayout } from '../../hooks/useWorkspaceLayout'
import { WorkflowDetails } from '../workflow/WorkflowDetails'
import { ApprovalCanvasContent } from '../approvals/ApprovalCanvasContent'
import { MessageSquare } from 'lucide-react'
import { MessageHistoryViewer } from '../messages/MessageHistoryViewer'
import { ChatPanel } from '../projects/ChatPanel'
import { useMessageOperations } from '../../hooks/useMessageOperations'
import { useAgentStore, useProjectStore } from '../../stores'

interface CanvasContentProps {
  className?: string
}

export const CanvasContent: React.FC<CanvasContentProps> = ({ className = '' }) => {
  const { canvasMode, selectedAgentId, selectedWorkflowId } = useWorkspaceLayout()
  const messageOps = useMessageOperations()
  const { activeProjectId, projects } = useProjectStore()
  const { getAgent, getProjectAgents } = useAgentStore()

  // Get the selected agent and active project
  const selectedAgent = useMemo(() => {
    return selectedAgentId ? getAgent(selectedAgentId) : null
  }, [selectedAgentId, getAgent])

  const agents = useMemo(() => {
    return getProjectAgents(activeProjectId || '')
  }, [activeProjectId, getProjectAgents])

  const activeProject = useMemo(() => {
    return activeProjectId ? projects.find((p) => p.id === activeProjectId) : undefined
  }, [activeProjectId, projects])

  // Handle sending messages
  const handleSendMessage = async (message: string) => {
    const result = await messageOps.sendMessage(message, agents, activeProject)
    if (!result.success && result.error) {
      console.error('Failed to send message:', result.error)
    }
  }

  // Handle interrupt
  const handleInterrupt = () => {
    messageOps.interruptMessages()
  }

  return (
    <div className={`canvas-content relative w-full h-full ${className}`}>
      {/* Agent Chat Panel - Always mounted to preserve state */}
      <div
        className="absolute inset-0 flex flex-col"
        style={{
          display: canvasMode === 'agent' ? 'flex' : 'none',
        }}
      >
        {selectedAgentId && selectedAgent && activeProjectId ? (
          <>
            {/* Agent header */}
            <div className="border-b bg-muted/30 px-4 py-2">
              <span className="text-sm font-medium text-foreground">
                {selectedAgent.name} - {selectedAgent.lastMessage || 'No messages yet'}
              </span>
            </div>

            {/* Message history */}
            <div className="flex-1 overflow-hidden">
              <MessageHistoryViewer
                key={`${selectedAgent.id}-${selectedAgent.sessionId || 'no-session'}`}
                sessionId={selectedAgent.sessionId || ''}
                projectId={activeProjectId}
                agentName={selectedAgent.name}
                agentId={selectedAgent.id}
              />
            </div>

            {/* Chat input */}
            <ChatPanel onSendMessage={handleSendMessage} onInterrupt={handleInterrupt} />
          </>
        ) : (
          <div className="flex items-center justify-center h-full p-8">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-2">
                {!selectedAgentId ? 'No Agent Selected' : 'Loading Agent...'}
              </h3>
              <p className="text-sm">
                {!selectedAgentId
                  ? 'Select an agent from the sidebar to start chatting'
                  : 'Initializing chat interface...'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Workflow Details Panel - Always mounted to preserve state */}
      <div
        className="absolute inset-0"
        style={{
          display: canvasMode === 'workflow' ? 'block' : 'none',
        }}
      >
        <WorkflowDetails selectedWorkflowId={selectedWorkflowId} />
      </div>

      {/* Approval Canvas Panel - Always mounted to preserve state */}
      <div
        className="absolute inset-0"
        style={{
          display: canvasMode === 'approval' ? 'block' : 'none',
        }}
      >
        <ApprovalCanvasContent scope="project" projectId={activeProjectId || undefined} />
      </div>
    </div>
  )
}
