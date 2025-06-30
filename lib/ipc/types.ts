/**
 * IPC Communication Types
 * 
 * Following plan.md: Reuse working pattern from existing codebase
 * Socket pattern: `claude-agents.{agentId}`
 * Message format: `{from, content, timestamp}`
 */

export interface IPCMessage {
  /** Sender agent ID */
  from: string
  
  /** Target agent ID */
  to: string
  
  /** Message content */
  content: string
  
  /** Message timestamp */
  timestamp: number
  
  /** Message type */
  type: 'mention' | 'broadcast' | 'command' | 'response'
  
  /** Optional metadata */
  metadata?: {
    projectId?: string
    sessionId?: string
    originalMessage?: string
  }
}

export interface IPCServerOptions {
  /** Agent ID for socket naming */
  agentId: string
  
  /** Connection timeout in ms */
  timeout?: number
  
  /** Max retry attempts */
  maxRetries?: number
}

export interface IPCClientOptions {
  /** Connection timeout in ms */
  timeout?: number
  
  /** Retry delay in ms */
  retryDelay?: number
  
  /** Max retry attempts */
  maxRetries?: number
}

export interface MentionMessage {
  /** Target agent ID */
  targetAgent: string
  
  /** Message content */
  content: string
  
  /** Source project ID */
  projectId: string
  
  /** Sender info */
  from: {
    agentId: string
    role: string
  }
}