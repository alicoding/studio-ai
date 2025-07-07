/**
 * AI Orchestration Types
 * 
 * SOLID: Interface segregation for clean contracts
 * DRY: Shared types across orchestration system
 */

export type ModelCapability = 
  | 'research'      // Web search, documentation lookup
  | 'reasoning'     // Deep thinking, analysis
  | 'coding'        // Code generation, refactoring
  | 'review'        // Code review, security analysis
  | 'testing'       // Test generation
  | 'planning'      // Task planning, architecture
  | 'consensus'     // Multi-model agreement
  | 'general'       // General purpose chat

export interface ModelProfile {
  id: string
  provider: 'electronhub' | 'openai' | 'anthropic'
  capabilities: ModelCapability[]
  contextWindow: number
  strengths: string[]
  costTier: 'low' | 'medium' | 'high'
}

export interface ConversationTurn {
  id: string
  timestamp: Date
  model: string
  capability: ModelCapability
  request: string
  response: string
  context?: Record<string, unknown>
  metadata?: {
    tokensUsed?: number
    latency?: number
    error?: string
  }
}

export interface Conversation {
  id: string
  turns: ConversationTurn[]
  context: ConversationContext
  memory: ConversationMemory
}

export interface ConversationContext {
  files?: string[]
  projectInfo?: Record<string, unknown>
  previousResults?: Record<string, unknown>
  constraints?: string[]
}

export interface ConversationMemory {
  summary?: string
  keyInsights: string[]
  decisions: Array<{
    turn: string
    decision: string
    rationale: string
  }>
}

export interface OrchestrationRequest {
  capability: ModelCapability
  prompt: string
  context?: ConversationContext
  preferredModel?: string
  allowDelegation?: boolean
  maxTurns?: number
  conversationId?: string
}

export interface OrchestrationResponse {
  result: string
  conversation: Conversation
  modelsUsed: Array<{
    model: string
    turns: number
    capability: ModelCapability
  }>
  canContinue: boolean
}