/**
 * MessageRouter - @Mention Routing and Message Parsing
 * 
 * SOLID: Single Responsibility - only handles message routing
 * DRY: Reuses mention parsing logic consistently
 * KISS: Simple regex parsing and routing to agents
 */

import { ProcessRegistry } from '../process/ProcessRegistry.js'
import { ProcessManager } from '../process/ProcessManager.js'
import { IPCClient } from './IPCClient.js'
import { IPCMessage, MentionMessage } from './types.js'

export class MessageRouter {
  private static instance: MessageRouter | null = null
  private registry: ProcessRegistry
  private processManager: ProcessManager
  private ipcClient: IPCClient

  private constructor() {
    this.registry = ProcessRegistry.getInstance()
    this.processManager = ProcessManager.getInstance()
    this.ipcClient = new IPCClient()
  }

  /**
   * Singleton pattern
   */
  public static getInstance(): MessageRouter {
    if (!MessageRouter.instance) {
      MessageRouter.instance = new MessageRouter()
    }
    return MessageRouter.instance
  }

  /**
   * Parse and route a message from ChatPanel
   */
  public async routeMessage(
    message: string,
    fromAgentId: string,
    projectId: string
  ): Promise<{routed: boolean, targets: string[]}> {
    const mentions = this.parseMentions(message)
    
    if (mentions.length === 0) {
      return { routed: false, targets: [] }
    }

    const routedTargets: string[] = []

    for (const mention of mentions) {
      try {
        const success = await this.routeMention(mention, fromAgentId, projectId)
        if (success) {
          routedTargets.push(mention.targetAgent)
        }
      } catch (error) {
        console.error(`Failed to route mention to ${mention.targetAgent}:`, error)
      }
    }

    return {
      routed: routedTargets.length > 0,
      targets: routedTargets
    }
  }

  /**
   * Parse @mentions from message text
   */
  public parseMentions(message: string): MentionMessage[] {
    const mentions: MentionMessage[] = []
    
    // Regex to match @agentId followed by content
    const mentionRegex = /@(\w+)\s+([^@]+?)(?=@\w+|$)/g
    
    let match
    while ((match = mentionRegex.exec(message)) !== null) {
      const [, targetAgent, content] = match
      
      mentions.push({
        targetAgent: targetAgent.trim(),
        content: content.trim(),
        projectId: '', // Will be filled by caller
        from: {
          agentId: '', // Will be filled by caller
          role: ''     // Will be filled by caller
        }
      })
    }

    // Also handle simple format: "@agent do something"
    if (mentions.length === 0) {
      const simpleMatch = message.match(/^@(\w+)\s+(.+)$/)
      if (simpleMatch) {
        const [, targetAgent, content] = simpleMatch
        mentions.push({
          targetAgent: targetAgent.trim(),
          content: content.trim(),
          projectId: '',
          from: { agentId: '', role: '' }
        })
      }
    }

    return mentions
  }  /**
   * Route a single mention to target agent
   */
  private async routeMention(
    mention: MentionMessage,
    fromAgentId: string,
    projectId: string
  ): Promise<boolean> {
    // Check if target agent exists and is reachable
    const targetAgent = this.registry.get(mention.targetAgent)
    
    if (!targetAgent) {
      console.warn(`Target agent ${mention.targetAgent} not found in registry`)
      return false
    }

    // If agent is offline or dead, try to respawn it
    if (targetAgent.status === 'offline' || !targetAgent.pid) {
      try {
        console.log(`Auto-respawning agent ${mention.targetAgent} for @mention`)
        await this.processManager.ensureAgentAlive(mention.targetAgent)
      } catch (error) {
        console.error(`Failed to respawn agent ${mention.targetAgent}:`, error)
        return false
      }
    }

    // Send mention via IPC
    try {
      const success = await this.ipcClient.sendMention(
        fromAgentId,
        mention.targetAgent,
        mention.content,
        projectId
      )

      if (success) {
        console.log(`@mention routed: ${fromAgentId} → ${mention.targetAgent}`)
        
        // Update target agent status to busy
        await this.registry.updateStatus(mention.targetAgent, 'busy')
      }

      return success
    } catch (error) {
      console.error(`IPC routing failed for ${mention.targetAgent}:`, error)
      return false
    }
  }

  /**
   * Broadcast message to all online agents in project
   */
  public async broadcastToProject(
    message: string,
    fromAgentId: string,
    projectId: string
  ): Promise<{success: string[], failed: string[]}> {
    const projectAgents = this.registry.getByProject(projectId)
    const onlineAgents = projectAgents.filter(agent => 
      agent.status === 'online' && agent.agentId !== fromAgentId
    )

    if (onlineAgents.length === 0) {
      console.log(`No online agents in project ${projectId} for broadcast`)
      return { success: [], failed: [] }
    }

    const targetIds = onlineAgents.map(agent => agent.agentId)
    
    console.log(`Broadcasting to ${targetIds.length} agents in project ${projectId}`)
    
    return await this.ipcClient.sendBroadcast(
      fromAgentId,
      targetIds,
      message,
      projectId
    )
  }

  /**
   * Get available agents for @mention autocomplete
   */
  public getAvailableAgents(projectId?: string): Array<{
    agentId: string
    role: string
    status: string
    isReachable: boolean
  }> {
    const agents = projectId 
      ? this.registry.getByProject(projectId)
      : this.registry.getOnlineAgents()

    return agents.map(agent => ({
      agentId: agent.agentId,
      role: agent.role,
      status: agent.status,
      isReachable: agent.status !== 'offline' && agent.pid !== null
    }))
  }

  /**
   * Check if message contains mentions
   */
  public hasMentions(message: string): boolean {
    return /@\w+/.test(message)
  }

  /**
   * Check if message is a broadcast command
   */
  public isBroadcast(message: string): boolean {
    return message.startsWith('#broadcast') || message.startsWith('#all')
  }
}