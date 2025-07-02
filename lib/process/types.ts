/**
 * Process Management Types
 * 
 * Core interfaces for the ProcessManager/ProcessRegistry/ProcessCleaner trinity.
 * Supports multi-project agent lifecycle management with proper cleanup.
 */

export interface AgentProcess {
  /** Unique agent identifier */
  agentId: string
  
  /** Project this agent belongs to */
  projectId: string
  
  /** System process ID (null if not spawned yet) */
  pid: number | null
  
  /** Current agent status */
  status: AgentStatus
  
  /** Claude session ID for resuming conversations */
  sessionId: string | null
  
  /** Last activity timestamp for health checks */
  lastActivity: Date
  
  /** Agent role (dev, ux, tester, etc.) */
  role: string
  
  /** Agent configuration */
  config?: AgentConfig
}

export type AgentStatus = 'ready' | 'online' | 'busy' | 'offline'

export interface AgentConfig {
  name: string
  role: string
  systemPrompt?: string
  model?: string
  maxTokens?: number
  tools?: string[]
}

export interface ProcessRegistryData {
  /** Map of agentId -> AgentProcess */
  processes: Record<string, AgentProcess>
  
  /** Registry metadata */
  lastCleanup: Date
  version: string
}

export interface SpawnOptions {
  /** Project path for cwd */
  projectPath?: string
  
  /** Resume existing session */
  sessionId?: string
  
  /** Agent configuration override */
  config?: Partial<AgentConfig>
  
  /** Environment variables */
  env?: Record<string, string>
}

export interface ProcessEvent {
  type: 'spawn' | 'status-change' | 'cleanup' | 'error'
  agentId: string
  projectId: string
  data?: any
  timestamp: Date
}

export type ProcessEventHandler = (event: ProcessEvent) => void

/**
 * Health check result for process validation
 */
export interface HealthCheck {
  agentId: string
  isAlive: boolean
  responseTime?: number
  error?: string
  lastSeen: Date
}

/**
 * Cleanup operation result
 */
export interface CleanupResult {
  killedProcesses: string[]
  errors: Array<{ agentId: string; error: string }>
  registryUpdated: boolean
}