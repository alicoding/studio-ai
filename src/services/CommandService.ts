interface CommandContext {
  sessionId: string
  projectId: string
  agents: any[]
  selectedAgentId?: string
}

interface CommandResult {
  type: 'message' | 'action' | 'error'
  content: string
  action?: () => void
}

export class CommandService {
  private static instance: CommandService

  private constructor() {}

  static getInstance(): CommandService {
    if (!CommandService.instance) {
      CommandService.instance = new CommandService()
    }
    return CommandService.instance
  }

  /**
   * Parse and execute command
   */
  async executeCommand(message: string, context: CommandContext): Promise<CommandResult> {
    const [command, ...args] = message.split(' ')
    const commandName = command.toLowerCase()

    switch (commandName) {
      case '#team':
        return this.handleTeamCommand(context)

      case '#help':
        return this.handleHelpCommand()

      case '#clear':
        return this.handleClearCommand()

      case '#broadcast':
        return this.handleBroadcastCommand(args.join(' '), context)

      case '#spawn':
        return this.handleSpawnCommand(args[0], context)

      case '#interrupt':
        return this.handleInterruptCommand(args[0], context)

      default:
        return {
          type: 'error',
          content: `Unknown command: ${command}. Type #help for available commands.`,
        }
    }
  }

  /**
   * Show team members with proper status
   */
  private async handleTeamCommand(context: CommandContext): Promise<CommandResult> {
    const { agents } = context

    // Group agents by status
    const activeAgents = agents.filter((a) => a.status === 'active' || a.status === 'working')
    const idleAgents = agents.filter((a) => a.status === 'idle' || a.status === 'online')
    const offlineAgents = agents.filter((a) => a.status === 'offline')

    let teamMessage = `📋 **Team Members** (${agents.length} agents)\n\n`

    if (activeAgents.length > 0) {
      teamMessage += `**Active:**\n`
      activeAgents.forEach((agent) => {
        const task = agent.currentTask ? ` - ${agent.currentTask}` : ''
        teamMessage += `🟢 **@${agent.id}** - ${agent.role}${task}\n`
      })
      teamMessage += '\n'
    }

    if (idleAgents.length > 0) {
      teamMessage += `**Available:**\n`
      idleAgents.forEach((agent) => {
        teamMessage += `🟡 **@${agent.id}** - ${agent.role} (ready)\n`
      })
      teamMessage += '\n'
    }

    if (offlineAgents.length > 0) {
      teamMessage += `**Offline:**\n`
      offlineAgents.forEach((agent) => {
        teamMessage += `⚫ **@${agent.id}** - ${agent.role}\n`
      })
    }

    return {
      type: 'message',
      content: teamMessage,
    }
  }

  /**
   * Show help information
   */
  private handleHelpCommand(): CommandResult {
    const helpMessage = `📖 **Available Commands**

**Team Management:**
• **#team** - Show all agents in this project
• **#spawn** [role] - Add a new agent with specified role
• **#interrupt** @agent - Interrupt agent for priority change

**Communication:**
• **@agent** [message] - Send a message to specific agent
• **#broadcast** [message] - Send to all agents in project
• **#clear** - Clear the conversation

**Help:**
• **#help** - Show this help information`

    return {
      type: 'message',
      content: helpMessage,
    }
  }

  /**
   * Clear conversation
   */
  private handleClearCommand(): CommandResult {
    return {
      type: 'message',
      content: '🧹 **Conversation cleared**',
      action: () => {
        // Action will be handled by UI
      },
    }
  }

  /**
   * Broadcast message
   */
  private handleBroadcastCommand(message: string, context: CommandContext): CommandResult {
    if (!message.trim()) {
      return {
        type: 'error',
        content: 'Broadcast message cannot be empty. Usage: #broadcast [message]',
      }
    }

    const recipientCount = context.agents.filter((a) => a.id !== context.selectedAgentId).length

    return {
      type: 'message',
      content: `📢 **Broadcasting to ${recipientCount} agents:** ${message}`,
      action: async () => {
        // Broadcast will be handled by MessageService with context
        console.log(
          'Broadcasting to project:',
          context.projectId,
          'from agent:',
          context.selectedAgentId
        )
      },
    }
  }

  /**
   * Spawn new agent
   */
  private handleSpawnCommand(role: string, context: CommandContext): CommandResult {
    if (!role) {
      return {
        type: 'error',
        content: 'Please specify a role. Usage: #spawn [role]',
      }
    }

    // Check if agent with this role already exists
    const existingAgent = context.agents.find((a) => a.role === role)
    if (existingAgent) {
      return {
        type: 'message',
        content: `⚠️ Agent with role '${role}' already exists: ${existingAgent.name} (${existingAgent.status})`,
      }
    }

    return {
      type: 'action',
      content: `🚀 **Spawning ${role} agent for project ${context.projectId}...**`,
      action: async () => {
        // Spawning will be handled by ProcessManager with project context
        console.log('Spawning agent with role:', role, 'for project:', context.projectId)
      },
    }
  }

  /**
   * Interrupt agent
   */
  private handleInterruptCommand(agentMention: string, context: CommandContext): CommandResult {
    if (!agentMention || !agentMention.startsWith('@')) {
      return {
        type: 'error',
        content: 'Please specify an agent. Usage: #interrupt @agent',
      }
    }

    const agentId = agentMention.substring(1)
    const agent = context.agents.find((a) => a.id === agentId)

    if (!agent) {
      return {
        type: 'error',
        content: `Agent @${agentId} not found in this project`,
      }
    }

    if (agent.status === 'offline') {
      return {
        type: 'error',
        content: `Cannot interrupt @${agentId} - agent is offline`,
      }
    }

    return {
      type: 'action',
      content: `⚡ **Interrupting @${agentId}...**`,
      action: async () => {
        // Interrupt will be handled by ProcessManager
      },
    }
  }

  /**
   * Send command result as system message
   */
  async sendSystemMessage(sessionId: string, content: string): Promise<void> {
    await fetch('/api/messages/system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        content,
        type: 'command-response',
      }),
    })
  }
}
