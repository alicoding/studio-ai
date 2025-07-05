import { Server, Socket } from 'socket.io'
import { projectDiagnostics } from './services/ProjectDiagnostics'

interface AgentInfo {
  id: string
  role: string
  status: 'ready' | 'online' | 'busy' | 'offline'
  sessionId?: string
  pid?: number
}

interface ProjectInfo {
  id: string
  name: string
  path: string
  agents: string[] // agent IDs
}

interface ProjectData {
  id: string
  name: string
  description?: string
  workspacePath?: string
}

interface AgentConfig {
  id: string
  name: string
  role: string
  systemPrompt?: string
  tools?: string[]
  model?: string
  maxTokens?: number
  temperature?: number
}

interface RoleAssignment {
  id: string
  projectId: string
  role: string
  agentConfigId: string
  customTools?: string[]
}

// In-memory stores (will be replaced with proper storage later)
const connectedClients = new Map<string, Socket>()
const activeAgents = new Map<string, AgentInfo>()
const activeProjects = new Map<string, ProjectInfo>()

export function setupWebSocket(io: Server) {
  // Listen for diagnostic updates from the service
  projectDiagnostics.on('diagnostics:updated', (data) => {
    // Only emit to clients in the active project room
    io.emit('diagnostics:updated', data)
  })

  projectDiagnostics.on('diagnostics:summary', (data) => {
    io.emit('diagnostics:summary', data)
  })

  io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`)
    connectedClients.set(socket.id, socket)

    // Send current state to newly connected client
    socket.emit('initial-state', {
      agents: Array.from(activeAgents.values()),
      projects: Array.from(activeProjects.values()),
    })

    // Send current diagnostics immediately
    const currentDiagnostics = projectDiagnostics.getCurrentDiagnostics()
    socket.emit('diagnostics:current', {
      diagnostics: currentDiagnostics,
      timestamp: new Date(),
    })

    // Handle client disconnect
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`)
      connectedClients.delete(socket.id)
    })

    // Agent-related events
    socket.on('agent:status-update', (data: { agentId: string; status: AgentInfo['status'] }) => {
      const agent = activeAgents.get(data.agentId)
      if (agent) {
        agent.status = data.status
        // Broadcast to all clients
        io.emit('agent:status-changed', { agentId: data.agentId, status: data.status })
      }
    })

    socket.on('agent:message', (data: { from: string; to: string; content: string }) => {
      // Route message to specific agent or broadcast
      if (data.to === 'broadcast') {
        io.emit('agent:broadcast-message', data)
      } else {
        io.emit('agent:direct-message', data)
      }
    })

    socket.on(
      'agent:token-update',
      (data: { agentId: string; tokens: number; maxTokens: number }) => {
        io.emit('agent:token-usage', data)
      }
    )

    // Project-related events
    socket.on('project:select', async (data: { projectId: string; projectPath: string }) => {
      socket.join(`project:${data.projectId}`)
      
      // Switch diagnostics to this project
      await projectDiagnostics.switchProject(data.projectId, data.projectPath)
      
      socket.emit('project:selected', data.projectId)
    })

    socket.on('project:leave', (projectId: string) => {
      socket.leave(`project:${projectId}`)
    })

    // Terminal events
    socket.on('terminal:input', (data: { agentId: string; input: string }) => {
      // Integration point: Stage 3 - IPC System
      // await IPCClient.send(data.agentId, { type: 'input', content: data.input });

      // Forward to agent process (will be implemented with IPC)
      io.to(`agent:${data.agentId}`).emit('terminal:data', data.input)
    })

    socket.on('terminal:output', (data: { agentId: string; output: string }) => {
      // Broadcast terminal output to all clients watching this agent
      io.emit('terminal:data', { agentId: data.agentId, data: data.output })
    })

    // Command events
    socket.on('command:execute', (data: { command: string; args?: unknown }) => {
      console.log(`Executing command: ${data.command}`, data.args)
      // Integration point: Stage 7 - Command System
      // const result = await CommandParser.parseAndExecute(data.command, data.args);
      // Integration point: Stage 5 - Message Queue (for queued commands)
      // if (result.needsQueue) await MessageQueue.enqueue(result.agentId, result.message);

      // Command execution will be handled by command system
      socket.emit('command:result', { command: data.command, success: true })
    })

    // Message queue events
    socket.on('queue:add', (data: { agentId: string; message: string }) => {
      io.emit('queue:updated', { agentId: data.agentId, action: 'add', message: data.message })
    })

    socket.on('queue:clear', (agentId: string) => {
      io.emit('queue:updated', { agentId, action: 'clear' })
    })

    // Error handling
    socket.on('error', (error) => {
      console.error('Socket error:', error)
    })
  })

  // Heartbeat mechanism for connection health
  setInterval(() => {
    io.emit('ping', { timestamp: Date.now() })
  }, 30000) // Every 30 seconds

  return io
}

// Helper functions for managing state
export function registerAgent(agent: AgentInfo) {
  activeAgents.set(agent.id, agent)
  connectedClients.forEach((socket) => {
    socket.emit('agent:registered', agent)
  })
}

export function unregisterAgent(agentId: string) {
  activeAgents.delete(agentId)
  connectedClients.forEach((socket) => {
    socket.emit('agent:unregistered', agentId)
  })
}

export function updateAgentStatus(agentId: string, status: AgentInfo['status']) {
  const agent = activeAgents.get(agentId)
  if (agent) {
    agent.status = status
    connectedClients.forEach((socket) => {
      socket.emit('agent:status-changed', { agentId, status })
    })
  }
}

export function broadcastToProject(projectId: string, event: string, data: unknown) {
  connectedClients.forEach((socket) => {
    if (socket.rooms.has(`project:${projectId}`)) {
      socket.emit(event, data)
    }
  })
}

// Broadcast workspace data changes
export function broadcastWorkspaceUpdate(event: string, data: unknown) {
  connectedClients.forEach((socket) => {
    socket.emit(event, data)
  })
}

// Specific workspace update events
export function notifyProjectCreated(project: ProjectData) {
  broadcastWorkspaceUpdate('workspace:project-created', project)
}

export function notifyProjectUpdated(projectId: string, updates: Partial<ProjectData>) {
  broadcastWorkspaceUpdate('workspace:project-updated', { projectId, updates })
}

export function notifyAgentConfigChanged(agentId: string, config: AgentConfig) {
  broadcastWorkspaceUpdate('workspace:agent-config-changed', { agentId, config })
}

export function notifyRoleAssignmentChanged(projectId: string, roleAssignments: RoleAssignment[]) {
  broadcastWorkspaceUpdate('workspace:role-assignment-changed', { projectId, roleAssignments })
}
