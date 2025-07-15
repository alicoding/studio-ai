import { Router, Request, Response } from 'express'
import { ClaudeService } from '../services/ClaudeService'
import type { Role } from '../services/claude-agent'
import { getResponseTracker } from '../services/ResponseTracker'
const router = Router()
const claudeService = new ClaudeService()

// POST /api/messages - Send a message to Claude
// KISS: Simple endpoint that delegates to service
// Used for real-time interactive agent communication
router.post('/', async (req: Request, res: Response) => {
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

    // Resolve project path if not provided
    let resolvedProjectPath = projectPath
    if (!resolvedProjectPath && projectId) {
      try {
        const { StudioProjectService } = await import('../services/StudioProjectService')
        const projectService = new StudioProjectService()
        const project = await projectService.getProjectWithAgents(projectId)
        resolvedProjectPath = project.workspacePath
        console.log(`[MESSAGES API DEBUG] Resolved project path from project ID:`, {
          projectId,
          projectName: project.name,
          workspacePath: project.workspacePath,
          resolvedProjectPath,
        })
      } catch (error) {
        console.error('Failed to resolve project path:', error)
      }
    }

    // Get agent configuration dynamically
    let agentConfig = undefined
    try {
      const { ServerAgentConfigService } = await import('../services/ServerAgentConfigService')
      const configService = ServerAgentConfigService.getInstance()

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
      resolvedProjectPath || projectPath,
      role as Role | undefined,
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

    // Handle abort errors gracefully - don't crash the server
    if (
      error instanceof Error &&
      (error.message.includes('aborted') ||
        error.message.includes('Query was aborted') ||
        error.name === 'AbortError')
    ) {
      console.log('Request was aborted by user - returning 409 status')
      return res.status(409).json({
        error: 'Request was aborted',
        code: 'ABORTED',
      })
    }

    // Provide detailed error information for other errors
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
router.post('/mention', async (req: Request, res: Response) => {
  try {
    const {
      message,
      fromAgentId,
      projectId,
      targetProjectId,
      wait,
      timeout,
      format = 'json',
    } = req.body

    if (!message || !fromAgentId || !projectId) {
      return res.status(400).json({ error: 'Message, fromAgentId, and projectId are required' })
    }

    // For now, allow cross-project mentions without validation
    const actualTargetProjectId = targetProjectId || projectId

    // Get response tracker for wait mode
    const responseTracker = wait ? getResponseTracker() : null

    // Simple mention parsing - extract target agent and message content
    const parseMentions = (msg: string): Array<{ targetAgent: string; content: string }> => {
      console.log(`[DEBUG] Parsing message: "${msg}"`)
      const mentions: Array<{ targetAgent: string; content: string }> = []

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
    // Store response promises for wait mode
    const trackedResponses = new Map<string, Promise<unknown>>()

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
        projectId: actualTargetProjectId, // Use target project for cross-project routing
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
        projectId: actualTargetProjectId, // Use target project for cross-project routing
        sourceProjectId: projectId, // Include source project for context
        timestamp: new Date().toISOString(),
      })

      // Track response if in wait mode
      let correlationId: string | undefined

      if (responseTracker && wait) {
        const tracked = await responseTracker.trackResponse(
          targetAgentId,
          actualTargetProjectId, // Use target project for tracking
          timeout
        )
        correlationId = tracked.correlationId
        // Store the promise for later collection
        trackedResponses.set(targetAgentId, tracked.promise)

        // Include correlation ID in the message for response tracking
        io.emit('agent:mention-received', {
          targetAgentId,
          fromAgentId,
          message,
          projectId,
          correlationId,
          timestamp: new Date().toISOString(),
        })
      } else {
        // Non-wait mode - just emit the mention
        io.emit('agent:mention-received', {
          targetAgentId,
          fromAgentId,
          message,
          projectId,
          timestamp: new Date().toISOString(),
        })
      }

      // Actually send the message to the target agent through Claude API
      try {
        console.log(`[Mention] Sending message to target agent ${targetAgentId}: "${message}"`)

        // Use the parsed message content from mention
        const messageContent = mention.content

        // Resolve project path for target project if not provided
        let targetProjectPath = undefined
        try {
          const { StudioProjectService } = await import('../services/StudioProjectService')
          const projectService = new StudioProjectService()
          const targetProject = await projectService.getProjectWithAgents(actualTargetProjectId)
          targetProjectPath = targetProject.workspacePath
          console.log(`Resolved target project path: ${targetProjectPath}`)
        } catch (error) {
          console.error('Failed to resolve target project path:', error)
        }

        // Send the message to the target agent via Claude API
        const result = await claudeService.sendMessage(
          `Message from @${fromAgentId}: ${messageContent}`,
          actualTargetProjectId,
          targetAgentId,
          targetProjectPath, // Use resolved project path
          'dev', // default role
          undefined, // sessionId - will be resolved
          io, // socket for streaming
          false, // don't force new session
          undefined // agent config - will be resolved
        )

        console.log(`[Mention] Successfully delivered to ${targetAgentId}, response started`)

        // In wait mode, store the result for response tracking
        if (correlationId && responseTracker) {
          // The response from Claude is the actual agent response
          responseTracker.resolveResponse(correlationId, {
            from: targetAgentId,
            content: result.response,
            sessionId: result.sessionId,
            timestamp: new Date().toISOString(),
          })
        }
      } catch (error) {
        console.error(`[Mention] Failed to deliver message to ${targetAgentId}:`, error)

        // Reject the tracked response if in wait mode
        if (correlationId && responseTracker) {
          responseTracker.rejectResponse(
            correlationId,
            error instanceof Error ? error : new Error('Failed to deliver message')
          )
        }

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

    // In wait mode, collect all responses
    if (wait && responseTracker) {
      const responses: Record<string, unknown> = {}
      const errors: Record<string, string> = {}

      // Collect all response promises
      const responsePromises: Array<{ agentId: string; promise: Promise<unknown> }> = []

      for (const targetAgentId of routedTargets) {
        // Get the promise from our tracked responses map
        const promise = trackedResponses.get(targetAgentId)
        if (promise) {
          responsePromises.push({ agentId: targetAgentId, promise })
        }
      }

      // Wait for all responses or timeouts
      for (const { agentId, promise } of responsePromises) {
        try {
          const response = await promise
          responses[agentId] = response
        } catch (error) {
          errors[agentId] = error instanceof Error ? error.message : 'Unknown error'
        }
      }

      // Return aggregated responses
      if (format === 'text') {
        // Simple text format for MCP
        const textResponses = Object.entries(responses)
          .map(([agent, resp]) => {
            const content =
              resp && typeof resp === 'object' && 'content' in resp
                ? (resp as { content: string }).content
                : JSON.stringify(resp)
            return `**@${agent}**: ${content}`
          })
          .join('\n\n')

        res.json({
          content: textResponses,
          agents: routedTargets,
          errors: Object.keys(errors).length > 0 ? errors : undefined,
        })
      } else {
        // Full structured format for frontend
        res.json({
          message: 'Mention processed with responses',
          fromAgentId,
          projectId,
          targets: routedTargets,
          wait: true,
          responses,
          errors: Object.keys(errors).length > 0 ? errors : undefined,
        })
      }
    } else {
      // Non-wait mode - return immediately
      res.json({
        message: 'Mention routed successfully',
        fromAgentId,
        projectId,
        targets: routedTargets,
        wait: false,
      })
    }
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
router.post('/system', async (req: Request, res: Response) => {
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
router.post('/abort', async (req: Request, res: Response) => {
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
      projectId,
    })
  } catch (error) {
    console.error('Error aborting message:', error)
    res.status(500).json({ error: 'Failed to abort message' })
  }
})

export default router
