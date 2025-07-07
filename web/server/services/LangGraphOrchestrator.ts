/**
 * LangGraph Orchestrator - Multi-Agent Conversation Management
 * 
 * SOLID: Single responsibility - agent orchestration with state management
 * DRY: Reuses existing UnifiedStorage patterns 
 * KISS: Simple LangGraph wrapper with cancellation support
 * Library-First: Built on LangGraph for proven orchestration
 */

import { StateGraph, Annotation, MemorySaver, messagesStateReducer } from '@langchain/langgraph'
import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage, BaseMessage } from '@langchain/core/messages'
import { createStorage } from '../../../src/lib/storage/UnifiedStorage'
import { ContextBuilder } from './ContextBuilder'
import path from 'path'
import type { CapabilityConfig } from '../../../src/lib/ai/types'

export interface ConversationState {
  messages: BaseMessage[]
  sessionId: string
  projectId?: string
  currentAgent?: string
  metadata: Record<string, unknown>
  turnCount: number
}

// Define state schema using Annotation for LangGraph
const StateSchema = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => []
  }),
  sessionId: Annotation<string>({
    reducer: (x, y) => y,
    default: () => ''
  }),
  projectId: Annotation<string | undefined>({
    reducer: (x, y) => y,
    default: () => undefined
  }),
  currentAgent: Annotation<string | undefined>({
    reducer: (x, y) => y,
    default: () => undefined
  }),
  metadata: Annotation<Record<string, unknown>>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({})
  }),
  turnCount: Annotation<number>({
    reducer: (x, y) => y,
    default: () => 0
  })
})

export interface AgentExecutionRequest {
  input: string
  sessionId: string
  projectId?: string
  capability?: string
  signal?: AbortSignal
  context?: {
    files?: string[]
    metadata?: Record<string, unknown>
  }
}

export interface AgentExecutionResponse {
  content: string
  state: ConversationState
  metadata: {
    agentUsed: string
    model: string
    tokensUsed?: number
    executionTime: number
  }
}

export class LangGraphOrchestrator {
  private static instance: LangGraphOrchestrator
  private workflow?: ReturnType<typeof this.createWorkflow>
  private memory: MemorySaver
  private conversationStorage = createStorage({ 
    namespace: 'langgraph-conversations', 
    type: 'session' 
  })
  private agentStorage = createStorage({ 
    namespace: 'langgraph-agents', 
    type: 'config' 
  })
  private capabilitiesStorage = createStorage({ 
    namespace: 'AICapabilities', 
    type: 'config' 
  })
  private contextBuilder = new ContextBuilder()

  private constructor() {
    this.memory = new MemorySaver()
    this.initializeWorkflow()
  }

  static getInstance(): LangGraphOrchestrator {
    if (!LangGraphOrchestrator.instance) {
      LangGraphOrchestrator.instance = new LangGraphOrchestrator()
    }
    return LangGraphOrchestrator.instance
  }

  /**
   * Initialize the LangGraph workflow with agents
   */
  private initializeWorkflow(): void {
    this.workflow = this.createWorkflow()
  }

  private createWorkflow() {
    // Create the workflow graph using the StateSchema
    const workflow = new StateGraph(StateSchema)
      .addNode('orchestrator', this.orchestratorAgent.bind(this))
      .addNode('researcher', this.researcherAgent.bind(this))
      .addNode('debugger', this.debuggerAgent.bind(this))
      .addEdge('__start__', 'orchestrator')
      .addConditionalEdges('orchestrator', this.routeToAgent.bind(this))
      .addEdge('researcher', '__end__')
      .addEdge('debugger', '__end__')
      .compile({ 
        checkpointer: this.memory
        // Note: Cancellation handled via AbortSignal in invoke()
      })
    
    return workflow
  }

  /**
   * Execute agent workflow with session management
   */
  async executeWithSession(request: AgentExecutionRequest): Promise<AgentExecutionResponse> {
    const startTime = Date.now()
    
    if (!this.workflow) {
      throw new Error('Workflow not initialized')
    }

    try {
      // Build context if files are provided
      let enrichedInput = request.input
      if (request.context?.files && request.context.files.length > 0 && request.projectId) {
        // Resolve file paths relative to project directory
        const resolvedFilePaths = request.context.files.map(file => {
          // If already absolute, use as-is. Otherwise, resolve relative to projectId (which is the project path)
          return path.isAbsolute(file) ? file : path.join(request.projectId, file)
        })
        
        const projectContext = await this.contextBuilder.buildContext({
          projectPath: request.projectId,
          filePaths: resolvedFilePaths,
          projectId: request.projectId
        })
        
        // Enrich input with file context if files were successfully read
        if (projectContext.files.length > 0) {
          enrichedInput = `${request.input}\n\n**Context:**\n${projectContext.files.map(fc => 
            `File: ${fc.path}\n\`\`\`\n${fc.content}\n\`\`\``
          ).join('\n\n')}`
        }
      }
      
      // Let LangGraph handle state - only pass the new message
      const inputState = {
        messages: [new HumanMessage(enrichedInput)],
        sessionId: request.sessionId,
        projectId: request.projectId,
        metadata: {
          ...request.context?.metadata,
          files: request.context?.files || [],
          capability: request.capability
        }
      }

      // Execute workflow with cancellation support
      // LangGraph will automatically load existing state using thread_id
      console.log('[LangGraph] Invoking with thread_id:', request.sessionId)
      console.log('[LangGraph] Input state:', JSON.stringify(inputState, null, 2))
      
      // Check if we have existing state
      const checkpoint = await this.memory.getTuple({ 
        configurable: { thread_id: request.sessionId }
      })
      console.log('[LangGraph] Existing checkpoint found?', !!checkpoint)
      if (checkpoint) {
        console.log('[LangGraph] Checkpoint state messages:', checkpoint.checkpoint?.channel_values?.messages?.length)
      }
      
      const result = await this.workflow.invoke(inputState, {
        configurable: { thread_id: request.sessionId },
        signal: request.signal
      })
      
      console.log('[LangGraph] Result messages count:', result.messages?.length)
      console.log('[LangGraph] Last message:', result.messages?.[result.messages.length - 1])

      // LangGraph's MemorySaver automatically saves state - no need to manually save

      const executionTime = Date.now() - startTime

      return {
        content: this.extractResponseContent(result),
        state: result,
        metadata: {
          agentUsed: result.currentAgent || 'orchestrator',
          model: result.metadata?.model || 'gpt-4',
          executionTime,
          turnCount: result.turnCount || result.messages?.filter(m => m.role === 'user').length || 1
        }
      }
    } catch (error) {
      // Handle cancellation gracefully
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Agent execution cancelled for session: ${request.sessionId}`)
      }
      throw error
    }
  }

  /**
   * Orchestrator agent - routes to appropriate specialist agent
   */
  private async orchestratorAgent(state: typeof StateSchema.State): Promise<Partial<typeof StateSchema.State>> {
    const lastMessage = state.messages[state.messages.length - 1]
    const input = typeof lastMessage?.content === 'string' ? lastMessage.content : ''

    // Route based on capability or input keywords
    let targetAgent = 'researcher' // default
    
    // Check capability first
    const capability = state.metadata?.capability as string
    if (capability === 'debugging') {
      targetAgent = 'debugger'
    } else if (input.toLowerCase().includes('debug') || 
               input.toLowerCase().includes('error') || 
               input.toLowerCase().includes('fix')) {
      targetAgent = 'debugger'
    }

    return {
      currentAgent: targetAgent,
      metadata: {
        ...state.metadata,
        routingDecision: `Routed to ${targetAgent} based on input analysis`
      }
    }
  }

  /**
   * Researcher agent - handles research and information gathering
   */
  private async researcherAgent(state: typeof StateSchema.State): Promise<Partial<typeof StateSchema.State>> {
    const apiKey = process.env.ELECTRONHUB_API_KEY || process.env.VITE_ELECTRONHUB_API_KEY
    const baseURL = process.env.ELECTRONHUB_API_URL || 'https://api.electronhub.ai/v1'

    if (!apiKey) {
      throw new Error('ElectronHub API key not configured for researcher agent')
    }

    // Get capability configuration from settings
    const capability = await this.capabilitiesStorage.get<CapabilityConfig>('research')
    
    const model = new ChatOpenAI({
      modelName: capability?.models?.primary || 'sonar-pro',
      temperature: 0.3,
      maxTokens: 2000,
      openAIApiKey: apiKey,
      configuration: { baseURL }
    })

    const systemPrompt = capability?.prompts?.system || `You are a research assistant with web access. Provide comprehensive, accurate information with sources.`

    // Pass full conversation history to the LLM
    const messages = [
      new SystemMessage(systemPrompt),
      ...state.messages
    ]

    const response = await model.invoke(messages)

    return {
      messages: [response],  // Return only the new message
      metadata: {
        ...state.metadata,
        agentExecuted: 'researcher',
        model: capability?.models?.primary || 'sonar-pro'
      }
    }
  }

  /**
   * Debugger agent - handles debugging and code analysis
   */
  private async debuggerAgent(state: typeof StateSchema.State): Promise<Partial<typeof StateSchema.State>> {
    const apiKey = process.env.ELECTRONHUB_API_KEY || process.env.VITE_ELECTRONHUB_API_KEY
    const baseURL = process.env.ELECTRONHUB_API_URL || 'https://api.electronhub.ai/v1'

    if (!apiKey) {
      throw new Error('ElectronHub API key not configured for debugger agent')
    }

    // Get capability configuration from settings
    const capability = await this.capabilitiesStorage.get<CapabilityConfig>('debugging')
    
    const model = new ChatOpenAI({
      modelName: capability?.models?.primary || 'gpt-4',
      temperature: 0.2,
      maxTokens: 2000,
      openAIApiKey: apiKey,
      configuration: { baseURL }
    })

    const systemPrompt = capability?.prompts?.system || `You are a debugging expert. Analyze code issues, identify problems, and provide clear solutions.`

    // Pass full conversation history to the LLM
    const messages = [
      new SystemMessage(systemPrompt),
      ...state.messages
    ]

    const response = await model.invoke(messages)

    return {
      messages: [response],  // Return only the new message
      metadata: {
        ...state.metadata,
        agentExecuted: 'debugger',
        model: capability?.models?.primary || 'gpt-4'
      }
    }
  }

  /**
   * Route to appropriate agent based on orchestrator decision
   */
  private routeToAgent(state: typeof StateSchema.State): string {
    return state.currentAgent || 'researcher'
  }

  /**
   * Load conversation state from storage
   */
  private async loadConversationState(sessionId: string): Promise<ConversationState> {
    try {
      const stored = await this.conversationStorage.get<ConversationState>(`session:${sessionId}`)
      if (stored) {
        return stored
      }
    } catch (error) {
      console.warn(`Failed to load conversation state for ${sessionId}:`, error)
    }

    // Return default state
    return {
      messages: [],
      sessionId,
      metadata: {},
      turnCount: 0
    }
  }

  /**
   * Save conversation state to storage
   */
  private async saveConversationState(sessionId: string, state: ConversationState): Promise<void> {
    try {
      await this.conversationStorage.set(`session:${sessionId}`, {
        ...state,
        // Don't store too much message history to avoid token bloat
        messages: state.messages.slice(-20) // Keep last 20 messages
      })
    } catch (error) {
      console.error(`Failed to save conversation state for ${sessionId}:`, error)
    }
  }

  /**
   * Extract response content from state
   */
  private extractResponseContent(state: ConversationState): string {
    const lastMessage = state.messages[state.messages.length - 1]
    if (!lastMessage) return 'No response generated'
    
    // BaseMessage content can be string or complex content
    if (typeof lastMessage.content === 'string') {
      return lastMessage.content
    }
    
    // Handle complex content types
    return JSON.stringify(lastMessage.content)
  }

  /**
   * Get conversation history for a session
   */
  async getConversationHistory(sessionId: string): Promise<ConversationState> {
    try {
      // Get from LangGraph checkpoint
      const checkpoint = await this.memory.getTuple({ 
        configurable: { thread_id: sessionId }
      })
      
      if (checkpoint?.checkpoint?.channel_values) {
        const state = checkpoint.checkpoint.channel_values
        return {
          messages: state.messages || [],
          sessionId: state.sessionId || sessionId,
          projectId: state.projectId,
          currentAgent: state.currentAgent,
          metadata: state.metadata || {},
          turnCount: state.turnCount || 0
        }
      }
    } catch (error) {
      console.warn(`Failed to load conversation from checkpoint for ${sessionId}:`, error)
    }

    // Return default state if no checkpoint
    return {
      messages: [],
      sessionId,
      metadata: {},
      turnCount: 0
    }
  }

  /**
   * Clear conversation history for a session
   */
  async clearConversationHistory(sessionId: string): Promise<boolean> {
    try {
      await this.conversationStorage.delete(`session:${sessionId}`)
      return true
    } catch (error) {
      console.error(`Failed to clear conversation history for ${sessionId}:`, error)
      return false
    }
  }

  /**
   * Get active sessions (for debugging)
   */
  async getActiveSessions(): Promise<string[]> {
    try {
      const keys = await this.conversationStorage.keys()
      return keys.filter(key => key.startsWith('session:')).map(key => key.replace('session:', ''))
    } catch (error) {
      console.error('Failed to get active sessions:', error)
      return []
    }
  }
}