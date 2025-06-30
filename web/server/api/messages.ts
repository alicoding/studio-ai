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
    const { content, sessionId, projectPath, role = 'dev' } = req.body

    if (!content) {
      return res.status(400).json({ error: 'Content is required' })
    }

    // Get socket.io instance to emit messages
    const io = req.app.get('io')

    // Emit user message immediately - use consistent sessionId
    const effectiveSessionId = sessionId || 'default'
    io.emit('message:new', {
      sessionId: effectiveSessionId,
      message: {
        role: 'user',
        content: content,
        timestamp: new Date().toISOString()
      }
    })

    // For now, return a simple JSON response
    // TODO: Add SSE streaming support later if needed
    const result = await claudeService.sendMessage(
      content,
      sessionId,
      projectPath,
      role as Role,
      undefined,
      io
    )

    // Don't emit assistant response here - it's already emitted from claude-agent during streaming
    
    res.json({
      success: true,
      response: result.response,
      sessionId: result.sessionId
    })
  } catch (error) {
    console.error('Error sending message:', error)
    res.status(500).json({ 
      error: 'Failed to send message',
      details: error instanceof Error ? error.message : String(error)
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
        timestamp: new Date().toISOString()
      })
      
      // TODO: In the future, we could also send through Claude API
      // For now, just notify the UI to handle it
    }
    
    res.json({
      message: 'Mention routed successfully',
      fromAgentId,
      projectId,
      targets: result.targets
    })
  } catch (error) {
    console.error('Error routing mention:', error)
    res.status(500).json({ error: 'Failed to route mention' })
  }
})

// DELETE /api/messages/sessions/:sessionId - Clean up session
router.delete('/sessions/:sessionId', (req, res) => {
  try {
    claudeService.removeAgent(req.params.sessionId)
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
        type: type
      }
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Error sending system message:', error)
    res.status(500).json({ error: 'Failed to send system message' })
  }
})

export default router