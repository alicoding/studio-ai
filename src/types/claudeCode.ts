// Types for Claude Code session data
export interface ClaudeCodeSession {
  fileName: string
  sessionId: string
  agentName?: string // Extracted from messages or session metadata
  createdAt: Date
  lastMessageAt: Date
  messageCount: number
  size: number
  cwd?: string
}

export interface ClaudeCodeMessage {
  parentUuid: string | null
  isSidechain: boolean
  userType: string
  cwd?: string
  sessionId: string
  version: string
  type: string
  message: {
    role: string
    content: string
  }
  uuid: string
  timestamp: string
}