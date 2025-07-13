interface ParsedMention {
  targetAgentId: string
  content: string
}

interface SendMessageOptions {
  fromAgentId: string
  projectId: string
  sessionId?: string
}

export class MessageService {
  private static instance: MessageService

  private constructor() {
    // Client-side service - uses API calls
  }

  static getInstance(): MessageService {
    if (!MessageService.instance) {
      MessageService.instance = new MessageService()
    }
    return MessageService.instance
  }

  /**
   * Parse @mention from message
   */
  private parseMention(message: string): ParsedMention | null {
    // Match "@agentId message content"
    const match = message.match(/^@([a-zA-Z0-9_-]+)\s+(.+)$/)
    if (!match) return null

    return {
      targetAgentId: match[1],
      content: match[2]
    }
  }

  /**
   * Send a message, handling @mentions and regular messages
   */
  async sendMessage(message: string, options: SendMessageOptions): Promise<void> {
    // Handle @mentions
    if (message.startsWith('@')) {
      const mention = this.parseMention(message)
      if (!mention) {
        throw new Error('Invalid @mention format')
      }

      // Send via API to target agent
      const response = await fetch('/api/messages/mention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `@${mention.targetAgentId} ${mention.content}`,
          fromAgentId: options.fromAgentId,
          projectId: options.projectId
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to send mention: ${response.statusText}`)
      }

      return
    }

    // Handle regular messages to current agent
    if (options.sessionId) {
      await this.sendDirectMessage(message, options.sessionId)
    }
  }

  /**
   * Send direct message to agent's session
   */
  private async sendDirectMessage(message: string, sessionId: string): Promise<void> {
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        content: message,
        role: 'user'
      })
    })

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.statusText}`)
    }
  }

  /**
   * Send broadcast message to all agents in project
   */
  async sendBroadcast(message: string, options: SendMessageOptions): Promise<void> {
    const response = await fetch('/api/messages/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        fromAgentId: options.fromAgentId,
        projectId: options.projectId
      })
    })

    if (!response.ok) {
      throw new Error(`Failed to send broadcast: ${response.statusText}`)
    }
  }
}