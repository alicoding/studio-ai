import { Router } from 'express'
import { ClaudeService } from '../services/ClaudeService.js'
import type { Role } from '../../../../src/types.js'
import { MessageRouter } from '../../../lib/ipc/MessageRouter.js'

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

    const messageRouter = MessageRouter.getInstance()
    const result = await messageRouter.routeMessage(message, fromAgentId, projectId)

    console.log(`Mention routed from ${fromAgentId} to ${result.targets.length} agents`)

    // Get socket.io instance to emit to UI
    const io = req.app.get('io')

    // For each target agent, send the mention through their session
    for (const targetAgentId of result.targets) {
      // Emit mention to UI for the target agent
      io.emit('agent:mention-received', {
        targetAgentId,
        fromAgentId,
        message,
        projectId,
        timestamp: new Date().toISOString(),
      })

      // TODO: In the future, we could also send through Claude API
      // For now, just notify the UI to handle it
    }

    res.json({
      message: 'Mention routed successfully',
      fromAgentId,
      projectId,
      targets: result.targets,
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

export default router
