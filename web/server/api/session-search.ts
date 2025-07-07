import { Router } from 'express'
import { readFile } from 'fs/promises'
import path from 'path'

interface ContentBlock {
  type: string
  text?: string
}

interface ContentObject {
  text: string
  [key: string]: unknown
}

type MessageContent = Array<ContentBlock> | string | ContentObject

interface ClaudeMessage {
  type: string
  timestamp: string
  message?: {
    role: string
    content: MessageContent
  }
  // Additional fields that may be present
  parentUuid?: string
  isSidechain?: boolean
  userType?: string
  cwd?: string
  sessionId?: string
  version?: string
  uuid?: string
  [key: string]: unknown // Allow any other fields
}

interface Message {
  timestamp: string
  text: string
  lineNumber: number
  type: 'user' | 'assistant' | 'system' | 'other'
  role?: string
  metadata?: Record<string, string | number | boolean> // Store all dynamic properties
}

const router = Router()

// GET /api/session/search - Search messages in a session file with filters
router.get('/search', async (req, res) => {
  try {
    const { file, types, startDate, endDate } = req.query

    if (!file || typeof file !== 'string') {
      return res.status(400).json({ error: 'File path is required' })
    }

    // Validate the file path is within the Claude projects directory
    const normalizedPath = path.normalize(file)
    const claudeProjectsDir = path.join(process.env.HOME || '', '.claude/projects')

    if (!normalizedPath.startsWith(claudeProjectsDir)) {
      return res
        .status(403)
        .json({ error: 'Access denied - file must be in Claude projects directory' })
    }

    // Parse filter parameters
    const messageTypes = types ? (typeof types === 'string' ? [types] : (types as string[])) : null
    const startTimestamp = startDate ? new Date(startDate as string).getTime() : 0
    const endTimestamp = endDate ? new Date(endDate as string).getTime() : Date.now()

    // Read the JSONL file
    const content = await readFile(normalizedPath, 'utf-8')
    const lines = content.split('\n').filter((line) => line.trim())

    const messages: Message[] = []

    // Parse each line and extract messages based on filters
    lines.forEach((line, index) => {
      try {
        const claudeMessage = JSON.parse(line) as ClaudeMessage
        const messageTime = new Date(claudeMessage.timestamp).getTime()

        // Check time range
        if (messageTime < startTimestamp || messageTime > endTimestamp) {
          return
        }

        // Determine message type
        let messageType: Message['type'] = 'other'
        if (claudeMessage.type === 'user') {
          messageType = 'user'
        } else if (
          claudeMessage.type === 'assistant' ||
          (claudeMessage.type === 'completion' && claudeMessage.message?.role === 'assistant')
        ) {
          messageType = 'assistant'
        } else if (claudeMessage.message?.role === 'system') {
          messageType = 'system'
        }

        // Check if message type is in filter (if filter is specified)
        if (messageTypes && !messageTypes.includes(messageType)) {
          return
        }

        // Extract text content
        if (claudeMessage.message?.content) {
          let textContent = ''

          // Handle different content formats
          if (Array.isArray(claudeMessage.message.content)) {
            // Content is an array of content blocks
            textContent = claudeMessage.message.content
              .filter((c: ContentBlock) => c.type === 'text' && c.text)
              .map((c: ContentBlock) => c.text || '')
              .join('\n')
          } else if (typeof claudeMessage.message.content === 'string') {
            // Content is a simple string
            textContent = claudeMessage.message.content
          } else if (
            'text' in claudeMessage.message.content &&
            typeof claudeMessage.message.content.text === 'string'
          ) {
            // Content is an object with a text property
            textContent = claudeMessage.message.content.text
          }

          if (textContent) {
            // Extract metadata dynamically
            const metadata: Record<string, string | number | boolean> = {}

            // Add any top-level properties as metadata
            for (const [key, value] of Object.entries(claudeMessage)) {
              if (key !== 'timestamp' && key !== 'message' && key !== 'type') {
                if (
                  typeof value === 'string' ||
                  typeof value === 'number' ||
                  typeof value === 'boolean'
                ) {
                  metadata[key] = value
                }
              }
            }

            // Special handling for identifying human messages
            if (claudeMessage.userType === 'external') {
              metadata.isHuman = true
            }

            // Add content type information
            if (Array.isArray(claudeMessage.message.content)) {
              const contentTypes = new Set(
                claudeMessage.message.content.map((c: ContentBlock) => c.type)
              )
              metadata.contentTypes = Array.from(contentTypes).join(',')
            } else if (typeof claudeMessage.message.content === 'string') {
              metadata.contentTypes = 'text'
            } else {
              metadata.contentTypes = 'object'
            }

            messages.push({
              timestamp: claudeMessage.timestamp,
              text: textContent,
              lineNumber: index + 1,
              type: messageType,
              role: claudeMessage.message.role,
              metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
            })
          }
        }
      } catch (err) {
        console.error(`Error parsing line ${index + 1}:`, err)
      }
    })

    // Sort by timestamp (newest first)
    messages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    res.json({
      messages,
      total: messages.length,
      file: normalizedPath,
      filters: {
        types: messageTypes,
        startDate: (startDate as string) || null,
        endDate: (endDate as string) || null,
      },
    })
  } catch (error) {
    console.error('Error searching session:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: `Failed to search session: ${errorMessage}` })
  }
})

export default router
