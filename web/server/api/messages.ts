import { Router } from 'express'
import { ClaudeService } from '../services/ClaudeService.js'
import type { Role } from '../../../../src/types.js'

const router = Router()
const claudeService = new ClaudeService()

// POST /api/messages - Send a message to Claude
// KISS: Simple endpoint that delegates to service
router.post('/', async (req, res) => {
  try {
    const {
      content,
      projectId,
      agentId,
      projectPath,
      role = 'dev',
      forceNewSession = false,
    } = req.body

    if (!content) {
      return res.status(400).json({ error: 'Content is required' })
    }

    if (!projectId || !agentId) {
      return res.status(400).json({ error: 'ProjectId and agentId are required' })
    }

    // Get socket.io instance to emit messages
    const io = req.app.get('io')

    // Emit user message immediately - use agent instance ID for consistent WebSocket routing
    // This matches the approach in claude-agent.ts for streaming messages
    const effectiveSessionId = agentId // Always use agent instance ID
    io.emit('message:new', {
      sessionId: effectiveSessionId,
      projectId: projectId,
      agentId: agentId,
      message: {
        role: 'user',
        content: content,
        timestamp: new Date().toISOString(),
      },
    })

    // Get agent configuration dynamically
    let agentConfig = undefined
    try {
      const { ConfigService } = await import('../../../src/services/ConfigService')
      const configService = ConfigService.getInstance()

      // Handle both legacy agentIds and new instance IDs
      const configId =
        agentId.includes('-') && agentId.split('-').length > 3
          ? agentId.split('-').slice(0, -2).join('-') // Extract original config ID from instance ID
          : agentId

      const storedConfig = await configService.getAgent(configId)
      if (storedConfig) {
        agentConfig = {
          systemPrompt: storedConfig.systemPrompt,
          tools: storedConfig.tools,
          model: storedConfig.model,
          maxTokens: storedConfig.maxTokens,
          temperature: storedConfig.temperature,
        }
      }
    } catch (error) {
      console.error('Failed to load agent configuration:', error)
      // Continue without configuration
    }

    // For now, return a simple JSON response
    // TODO: Add SSE streaming support later if needed
    const result = await claudeService.sendMessage(
      content,
      projectId,
      agentId,
      projectPath,
      role as Role,
      undefined,
      io,
      forceNewSession,
      agentConfig
    )

    // Don't emit assistant response here - it's already emitted from claude-agent during streaming

    res.json({
      success: true,
      response: result.response,
      sessionId: result.sessionId,
      projectId: projectId,
      agentId: agentId,
    })
  } catch (error) {
    console.error('Error sending message:', error)

    // Provide detailed error information
    let errorMessage = 'Failed to send message'
    let errorDetails = 'Unknown error'

    if (error instanceof Error) {
      errorMessage = error.message
      errorDetails = error.stack || error.message
    } else {
      errorDetails = String(error)
    }

    console.error('Full error details:', errorDetails)

    res.status(500).json({
      error: errorMessage,
      details: errorDetails,
      timestamp: new Date().toISOString(),
    })
  }
})

// POST /api/messages/mention - Route @mention message to agents
router.post('/mention', async (req, res) => {
  try {
    const { message, fromAgentId, projectId } = req.body

    if (!message || !fromAgentId || !projectId) {
      return res.status(400).json({ error: 'Message, fromAgentId, and projectId are required' })
    }

    // Simple mention parsing - extract target agent and message content
    const parseMentions = (msg: string): Array<{targetAgent: string, content: string}> => {
      console.log(`[DEBUG] Parsing message: "${msg}"`)
      const mentions: Array<{targetAgent: string, content: string}> = []
      
      // Handle @all broadcast
      if (msg.startsWith('@all ')) {
        const content = msg.substring(5).trim()
        console.log(`[DEBUG] Found @all broadcast with content: "${content}"`)
        mentions.push({ targetAgent: 'all', content })
        return mentions
      }
      
      // Handle single @agent mention - be more flexible with the regex
      const match = msg.match(/^@([a-zA-Z0-9\-_]+)(?:\s+(.+))?$/)
      if (match) {
        const targetAgent = match[1]
        const content = match[2] || '' // Allow empty content
        console.log(`[DEBUG] Found mention to agent "${targetAgent}" with content: "${content}"`)
        mentions.push({ targetAgent, content })
      } else {
        console.log(`[DEBUG] No mention pattern matched for: "${msg}"`)
      }
      
      return mentions
    }
    
    const mentions = parseMentions(message)
    const routedTargets: string[] = []
    
    if (mentions.length === 0) {
      return res.status(400).json({ error: 'No valid mentions found in message' })
    }
    
    console.log(`Parsing mentions from message: "${message}"`, mentions)

    // Get socket.io instance to emit to UI
    const io = req.app.get('io')

    // For each mention, process the target
    for (const mention of mentions) {
      const targetAgentId = mention.targetAgent
      
      // Handle @all broadcast
      if (targetAgentId === 'all') {
        console.log('[Mention] Processing @all broadcast')
        // Get all agents from the agent store (this would need to be implemented)
        // For now, skip @all and let the BroadcastCommand handle it
        continue
      }
      
      console.log(`[Mention] Processing mention to ${targetAgentId}`)
      routedTargets.push(targetAgentId)
      // First, show the user's @mention message in the target agent's chat
      console.log(`[Mention] Emitting user message to sessionId: ${targetAgentId}`)
      io.emit('message:new', {
        sessionId: targetAgentId, // Use target agent ID for WebSocket routing
        projectId: projectId,
        agentId: targetAgentId,
        message: {
          role: 'user',
          content: `@${targetAgentId} ${mention.content}`,
          timestamp: new Date().toISOString(),
          fromAgent: fromAgentId,
        },
      })

      // Emit mention to UI for the target agent
      io.emit('agent:mention-received', {
        targetAgentId,
        fromAgentId,
        message,
        projectId,
        timestamp: new Date().toISOString(),
      })

      // Actually send the message to the target agent through Claude API
      try {
        console.log(`[Mention] Sending message to target agent ${targetAgentId}: "${message}"`)
        
        // Use the parsed message content from mention
        const messageContent = mention.content
        
        // Send the message to the target agent via Claude API
        const claudeResponse = await claudeService.sendMessage(
          `Message from @${fromAgentId}: ${messageContent}`,
          projectId,
          targetAgentId,
          undefined, // projectPath - will be resolved by service
          'dev', // default role
          undefined, // sessionId - will be resolved
          io, // socket for streaming
          false, // don't force new session
          undefined // agent config - will be resolved
        )
        
        console.log(`[Mention] Successfully delivered to ${targetAgentId}, response started`)
      } catch (error) {
        console.error(`[Mention] Failed to deliver message to ${targetAgentId}:`, error)
        
        // Emit error to UI
        io.emit('agent:mention-error', {
          targetAgentId,
          fromAgentId,
          error: error instanceof Error ? error.message : 'Failed to deliver message',
          projectId,
          timestamp: new Date().toISOString(),
        })
      }
    }

    res.json({
      message: 'Mention routed successfully',
      fromAgentId,
      projectId,
      targets: routedTargets,
    })
  } catch (error) {
    console.error('Error routing mention:', error)
    res.status(500).json({ error: 'Failed to route mention' })
  }
})

// DELETE /api/messages/sessions/:projectId/:agentId - Clean up session
router.delete('/sessions/:projectId/:agentId', async (req, res) => {
  try {
    const { projectId, agentId } = req.params
    await claudeService.removeAgent(projectId, agentId)
    res.json({ success: true })
  } catch (error) {
    console.error('Error removing session:', error)
    res.status(500).json({ error: 'Failed to remove session' })
  }
})

// POST /api/messages/system - Send a system message to the chat
router.post('/system', async (req, res) => {
  try {
    const { sessionId, content, type = 'system' } = req.body

    if (!sessionId || !content) {
      return res.status(400).json({ error: 'SessionId and content are required' })
    }

    // Get socket.io instance to emit messages
    const io = req.app.get('io')

    // Emit system message to chat
    io.emit('message:new', {
      sessionId: sessionId,
      message: {
        role: 'system',
        content: content,
        timestamp: new Date().toISOString(),
        type: type,
      },
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Error sending system message:', error)
    res.status(500).json({ error: 'Failed to send system message' })
  }
})

// POST /api/messages/abort - Abort an ongoing message for a specific agent
router.post('/abort', async (req, res) => {
  try {
    const { projectId, agentId } = req.body

    if (!projectId || !agentId) {
      return res.status(400).json({ error: 'ProjectId and agentId are required' })
    }

    console.log(`[API] Abort request received for agent ${agentId} in project ${projectId}`)
    
    // Get the agent and abort its current operation
    const agent = await claudeService.getOrCreateAgent(projectId, agentId)
    console.log(`[API] Got agent instance, calling abort()`)
    agent.abort()

    // Get socket.io instance to emit abort notification
    const io = req.app.get('io')
    
    // Emit abort notification to UI
    io.emit('message:aborted', {
      sessionId: agentId,
      projectId: projectId,
      agentId: agentId,
      timestamp: new Date().toISOString(),
    })

    console.log(`Aborted message for agent ${agentId} in project ${projectId}`)

    res.json({ 
      success: true,
      message: 'Message aborted successfully',
      agentId,
      projectId
    })
  } catch (error) {
    console.error('Error aborting message:', error)
    res.status(500).json({ error: 'Failed to abort message' })
  }
})

export default router
