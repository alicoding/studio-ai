import { Router } from 'express'
import { readdir, stat, readFile } from 'fs/promises'
import path from 'path'

interface Project {
  name: string
  path: string
  conversations: Conversation[]
}

interface Conversation {
  id: string
  filename: string
  path: string
  lastModified: string
  size: number
  messageCount: number
  messageTypes: {
    user: number
    assistant: number
    system: number
    other: number
  }
}

const router = Router()

// GET /api/claude-projects - List all Claude projects and their conversations
router.get('/', async (req, res) => {
  try {
    const claudeProjectsDir = path.join(process.env.HOME || '', '.claude/projects')

    // Read all directories in the Claude projects folder
    const entries = await readdir(claudeProjectsDir, { withFileTypes: true })
    const projects: Project[] = []

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const projectPath = path.join(claudeProjectsDir, entry.name)
        const projectName = decodeURIComponent(entry.name.replace(/-/g, '/'))

        // Read all JSONL files in the project directory
        const files = await readdir(projectPath)
        const jsonlFiles = files.filter((f) => f.endsWith('.jsonl'))

        const conversations: Conversation[] = []

        for (const file of jsonlFiles) {
          const filePath = path.join(projectPath, file)
          const fileStat = await stat(filePath)

          // Count messages in the file
          let messageCount = 0
          const messageTypes = {
            user: 0,
            assistant: 0,
            system: 0,
            other: 0,
          }

          try {
            const content = await readFile(filePath, 'utf-8')
            const lines = content.split('\n').filter((line) => line.trim())

            for (const line of lines) {
              try {
                const message = JSON.parse(line)
                messageCount++

                // Determine message type
                if (message.type === 'user') {
                  messageTypes.user++
                } else if (
                  message.type === 'assistant' ||
                  (message.type === 'completion' && message.message?.role === 'assistant')
                ) {
                  messageTypes.assistant++
                } else if (message.message?.role === 'system') {
                  messageTypes.system++
                } else {
                  messageTypes.other++
                }
              } catch (_err) {
                // Skip invalid JSON lines
              }
            }
          } catch (err) {
            console.error(`Error reading file ${filePath}:`, err)
          }

          conversations.push({
            id: file.replace('.jsonl', ''),
            filename: file,
            path: filePath,
            lastModified: fileStat.mtime.toISOString(),
            size: fileStat.size,
            messageCount,
            messageTypes,
          })
        }

        // Sort conversations by last modified date (newest first)
        conversations.sort(
          (a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
        )

        projects.push({
          name: projectName,
          path: projectPath,
          conversations,
        })
      }
    }

    // Sort projects by name
    projects.sort((a, b) => a.name.localeCompare(b.name))

    res.json({ projects })
  } catch (error) {
    console.error('Error listing Claude projects:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: `Failed to list projects: ${errorMessage}` })
  }
})

export default router
