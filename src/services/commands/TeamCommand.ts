/**
 * TeamCommand - Show team members
 * 
 * SOLID: Single Responsibility - Only handles team display
 * DRY: Reusable team formatting logic
 */

import type { CommandHandler, CommandContext, CommandResult } from './types'

export class TeamCommand implements CommandHandler {
  name = '#team'
  description = 'Show all agents in this project'
  usage = '#team [filter]'

  /**
   * Generate a readable agent display name and ID for @mentions
   */
  private getDisplayInfo(agent: any): { displayName: string, mentionId: string } {
    // Check if agent already has a readable ID (new format: dev1, ux1, etc.)
    if (agent.id.match(/^[a-z]+\d+$/)) {
      return {
        displayName: agent.name || `${agent.role.charAt(0).toUpperCase() + agent.role.slice(1)} ${agent.id.match(/\d+$/)?.[0] || '1'}`,
        mentionId: agent.id
      }
    }
    
    // Legacy agent with long ID - suggest readable alternative
    const suggestedId = `${agent.role}1`
    
    return {
      displayName: `${agent.name || agent.role} (legacy)`,
      mentionId: `${suggestedId} (or use full ID: ${agent.id.substring(0, 20)}...)`
    }
  }

  async execute(args: string, context: CommandContext): Promise<CommandResult> {
    const { agents } = context
    
    // Check if user wants to filter by role or status
    const filter = args.trim().toLowerCase()
    let filteredAgents = agents
    
    if (filter) {
      if (['active', 'busy', 'working'].includes(filter)) {
        filteredAgents = agents.filter(a => ['active', 'busy', 'working'].includes(a.status))
      } else if (['idle', 'online', 'available'].includes(filter)) {
        filteredAgents = agents.filter(a => ['idle', 'online'].includes(a.status))
      } else if (filter === 'offline') {
        filteredAgents = agents.filter(a => a.status === 'offline')
      } else {
        // Filter by role
        filteredAgents = agents.filter(a => a.role.toLowerCase().includes(filter))
      }
    }

    // Group agents by status
    const activeAgents = filteredAgents.filter((a) => a.status === 'active' || a.status === 'working' || a.status === 'busy')
    const idleAgents = filteredAgents.filter((a) => a.status === 'idle' || a.status === 'online')
    const offlineAgents = filteredAgents.filter((a) => a.status === 'offline')

    let teamMessage = filter 
      ? `📋 **Team Members** (${filteredAgents.length}/${agents.length} agents, filtered by: ${filter})\n\n`
      : `📋 **Team Members** (${agents.length} agents)\n\n`

    if (activeAgents.length > 0) {
      teamMessage += `**🟢 Active (${activeAgents.length}):**\n`
      activeAgents.forEach((agent) => {
        const { displayName, mentionId } = this.getDisplayInfo(agent)
        const task = agent.currentTask ? ` - ${agent.currentTask}` : ''
        teamMessage += `   • **${displayName}** (@${mentionId})${task}\n`
      })
      teamMessage += '\n'
    }

    if (idleAgents.length > 0) {
      teamMessage += `**🟡 Available (${idleAgents.length}):**\n`
      idleAgents.forEach((agent) => {
        const { displayName, mentionId } = this.getDisplayInfo(agent)
        teamMessage += `   • **${displayName}** (@${mentionId}) - ready\n`
      })
      teamMessage += '\n'
    }

    if (offlineAgents.length > 0) {
      teamMessage += `**⚫ Offline (${offlineAgents.length}):**\n`
      offlineAgents.forEach((agent) => {
        const { displayName, mentionId } = this.getDisplayInfo(agent)
        teamMessage += `   • **${displayName}** (@${mentionId})\n`
      })
      teamMessage += '\n'
    }

    if (filteredAgents.length === 0) {
      teamMessage += `_No agents found matching '${filter}'_\n\n`
    }
    
    const hasLegacyAgents = filteredAgents.some(a => !a.id.match(/^[a-z]+\d+$/))
    
    if (hasLegacyAgents) {
      teamMessage += `💡 **Tip:** Recreate legacy agents with \`#spawn [role]\` for simple @dev1, @ux1 names`
    } else {
      teamMessage += `💡 **Tip:** Use @dev1, @ux1, etc. for mentions`
    }

    return {
      type: 'message',
      content: teamMessage,
    }
  }
}