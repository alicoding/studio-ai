/**
 * API Client Types - Foundation for Extensible Provider System
 *
 * SOLID: Interface Segregation - Clean, focused interfaces
 * DRY: Shared types across all providers
 * KISS: Simple, composable type definitions
 * Library-First: Compatible with ky and future providers
 */

// Base configuration for any API provider
export interface ProviderConfig {
  name: string
  baseUrl: string
  apiKey?: string
  headers?: Record<string, string>
  timeout?: number
}

// Generic request/response types
export interface ApiRequest {
  endpoint: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  data?: unknown
  params?: Record<string, string>
  headers?: Record<string, string>
}

export interface ApiResponse<T = unknown> {
  data: T
  status: number
  headers: Record<string, string>
}

export interface ApiError {
  message: string
  status: number
  code?: string
  details?: Record<string, unknown>
}

// Provider interface - SOLID: Open/Closed Principle
export interface ApiProvider {
  readonly name: string
  readonly baseUrl: string

  // HTTP operations
  get<T = unknown>(endpoint: string, params?: Record<string, string>): Promise<T>
  post<T = unknown>(endpoint: string, data?: unknown): Promise<T>
  put<T = unknown>(endpoint: string, data?: unknown): Promise<T>
  delete<T = unknown>(endpoint: string): Promise<T>
  patch<T = unknown>(endpoint: string, data?: unknown): Promise<T>

  // Configuration
  updateConfig(config: Partial<ProviderConfig>): void
  isConfigured(): boolean
}

// LLM-specific types for future providers
export interface LLMProvider extends ApiProvider {
  // Chat completion (OpenAI compatible)
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatCompletion>

  // Model information
  getModels(): Promise<Model[]>

  // Streaming support
  streamChat(messages: ChatMessage[], options?: ChatStreamOptions): AsyncGenerator<ChatStreamChunk>
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
}

export interface ChatStreamOptions extends ChatOptions {
  onChunk?: (chunk: ChatStreamChunk) => void
  onComplete?: (completion: ChatCompletion) => void
  onError?: (error: ApiError) => void
}

export interface ChatCompletion {
  id: string
  choices: Array<{
    message: ChatMessage
    finishReason: string
  }>
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  model: string
}

export interface ChatStreamChunk {
  id: string
  choices: Array<{
    delta: Partial<ChatMessage>
    finishReason?: string
  }>
  model: string
}

export interface Model {
  id: string
  name: string
  description?: string
  provider: string
  contextLength?: number
  pricing?: {
    input: number // per 1K tokens
    output: number // per 1K tokens
  }
}

// Studio-specific type definitions
export interface Agent {
  id: string
  name: string
  systemPrompt: string
  description?: string
  modelId?: string
  tools?: string[]
  maxTokens?: number
  temperature?: number
  role?: string
  configId?: string
  status?: 'online' | 'offline'
  metadata?: Record<string, unknown>
}

// Team agent reference within a team
export interface TeamAgent {
  role: string
  name?: string // Optional name for display purposes
  configId?: string // Reference to agent configuration ID
  customizations?: {
    systemPromptAdditions?: string
    tools?: string[]
  }
}

export interface Team {
  id: string
  name: string
  description: string
  agents: TeamAgent[]
  createdAt?: string
  updatedAt?: string
  isDefault?: boolean
  metadata?: Record<string, unknown>
}

export interface Project {
  id: string
  name: string
  path: string
  lastActive?: Date | string
  favorite?: boolean
  tags?: string[]
  archived?: boolean
  metadata?: Record<string, unknown>
}

export interface AgentInstance {
  id: string
  agentId: string
  projectId: string
  status: 'idle' | 'active' | 'processing'
  sessionId?: string
}

export interface Message {
  id: string
  sessionId: string
  agentId: string
  projectId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date | string
  metadata?: Record<string, unknown>
}

export interface ProcessStats {
  activeAgents: number
  totalAgents: number
  memory: {
    used: number
    total: number
  }
  cpu: number
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  checks: Record<string, boolean>
  timestamp: Date | string
}

export interface HookConfig {
  command: string
  when: string[]
  cwd?: string
  env?: Record<string, string>
}

export interface Hook {
  id: string
  event: string
  command: string
  enabled: boolean
  description?: string
  config?: HookConfig
}

export interface DiagnosticInfo {
  projectPath: string
  errors: Array<{
    type: string
    message: string
    file?: string
    line?: number
  }>
  warnings: Array<{
    type: string
    message: string
    file?: string
  }>
  suggestions: string[]
}

export interface Screenshot {
  id: string
  projectId: string
  agentId: string
  path: string
  description?: string
  timestamp: Date | string
}

export interface AgentRole {
  id: string
  name: string
  description: string
  tools: string[]
  systemPromptAdditions?: string
}

export interface AgentRoleAssignment {
  agentId: string
  roleId: string
  customTools?: string[]
}

export interface SearchIndexStats {
  total_documents: number
  total_chunks: number
  last_indexed?: string
  index_size_mb?: number
}

export interface SearchResult {
  file_path: string
  content: string
  score: number
  line_number?: number
  metadata?: Record<string, unknown>
}


export interface SessionInfo {
  id: string
  projectId: string
  agentId: string
  messages: Message[]
  metadata?: Record<string, unknown>
}

export interface PaginatedResponse<T> {
  data: T[]
  cursor?: string
  hasMore: boolean
  total?: number
}

// Request types for API operations
export interface CreateAgentData {
  name: string
  role?: string
  systemPrompt?: string
  config?: Record<string, unknown>
}

export interface UpdateAgentData {
  name?: string
  role?: string
  systemPrompt?: string
  config?: Record<string, unknown>
}

export interface CreateTeamData {
  name: string
  description: string
  agents: TeamAgent[]
}

export interface UpdateTeamData {
  name?: string
  description?: string
  agents?: TeamAgent[]
}

export interface UpdateProjectMetadata {
  name?: string
  description?: string
  tags?: string[]
  favorite?: boolean
}

export interface SendMessageData {
  content: string
  projectId: string
  agentId: string
  sessionId?: string
  projectPath?: string
  role?: string
  forceNewSession?: boolean
}

export interface MentionData {
  message: string
  fromAgentId: string
  projectId: string
  sessionId: string
  mentionedAgentId: string
}

export interface SystemMessageData {
  sessionId: string
  content: string
  type?: string
}

export interface SettingsData {
  hooks?: Record<string, HookConfig>
  theme?: string
  preferences?: Record<string, unknown>
}


export interface SearchIndexData {
  projectPath: string
  force?: boolean
}

export interface SearchQueryOptions {
  limit?: number
  project?: string
}

export interface SearchResponse {
  success: boolean
  query: string
  results: SearchResult[]
  total: number
}

export interface SearchStatsResponse {
  success: boolean
  stats: SearchIndexStats
}

export interface DiagnosticData {
  projectPath: string
}

export interface ScreenshotData {
  projectId: string
  agentId: string
  description?: string
}

export interface SpawnTeamResponse {
  message: string
  teamId: string
  projectId: string
  agents: Array<{
    role: string
    instanceId: string
    status: string
  }>
}

// Claude Studio API specific types (current system)
export interface StudioProvider extends ApiProvider {
  // Agent operations
  agents: {
    getAll(): Promise<Agent[]>
    get(id: string): Promise<Agent>
    create(data: CreateAgentData): Promise<Agent>
    update(id: string, data: UpdateAgentData): Promise<Agent>
    delete(id: string): Promise<void>
    spawn(id: string, projectId: string): Promise<AgentInstance>
    setStatus(id: string, status: 'online' | 'offline'): Promise<Agent>
    abort(id: string, projectId: string): Promise<void>
    clearSession(id: string, projectId: string, oldSessionId?: string): Promise<void>
    deleteSession(projectId: string, agentId: string): Promise<void>
  }

  // Team operations
  teams: {
    getAll(): Promise<Team[]>
    create(data: CreateTeamData): Promise<Team>
    update(id: string, data: UpdateTeamData): Promise<Team>
    delete(id: string): Promise<void>
    clone(id: string, name?: string): Promise<Team>
    spawn(teamId: string, projectId: string): Promise<SpawnTeamResponse>
    import(team: CreateTeamData): Promise<Team>
  }

  // Project operations
  projects: {
    getAll(): Promise<Project[]>
    get(id: string): Promise<Project>
    updateMetadata(id: string, data: Partial<Project>): Promise<Project>
    toggleFavorite(id: string): Promise<Project>
    addTag(id: string, tag: string): Promise<Project>
    removeTag(id: string, tag: string): Promise<Project>
    archive(id: string): Promise<Project>
    unarchive(id: string): Promise<Project>
    getSessions(id: string): Promise<SessionInfo[]>
    getAgents(id: string): Promise<AgentInstance[]>
    addAgents(id: string, agentIds: string[]): Promise<AgentInstance[]>
    removeAgent(id: string, agentInstanceId: string): Promise<void>
    deleteSession(id: string, fileName: string): Promise<void>
    getSessionMessages(
      id: string,
      sessionId: string,
      options?: { cursor?: string; limit?: number }
    ): Promise<PaginatedResponse<Message>>
    killAgents(id: string): Promise<void>
  }

  // Message operations
  messages: {
    send(data: SendMessageData): Promise<Message>
    abort(data: { projectId: string; agentId: string }): Promise<void>
    mention(data: MentionData): Promise<Message>
    sendSystem(data: SystemMessageData): Promise<Message>
    removeSession(projectId: string, agentId: string): Promise<void>
  }

  // System operations
  system: {
    getProcessStats(): Promise<ProcessStats>
    health(): Promise<HealthStatus>
    detectCommand(
      command: string
    ): Promise<{ isCommand: boolean; command?: string; args?: string[] }>
    checkPath(path: string): Promise<{ exists: boolean; type?: 'file' | 'directory' }>
  }

  // Settings operations
  settings: {
    get(): Promise<Record<string, unknown>>
    update(data: SettingsData): Promise<Record<string, unknown>>
    getHooks(): Promise<Hook[]>
    updateHooks(hooks: Record<string, HookConfig>): Promise<Hook[]>
    testHook(hook: HookConfig): Promise<{ success: boolean; output?: string; error?: string }>
  }


  // Diagnostics operations
  diagnostics: {
    get(): Promise<DiagnosticInfo>
    check(data: { projectPath: string }): Promise<DiagnosticInfo>
  }

  // Screenshot operations
  screenshots: {
    capture(data: { projectId: string; agentId: string; description?: string }): Promise<Screenshot>
  }

  // Studio Projects operations - new project management endpoints
  studioProjects: {
    getAll(): Promise<{ projects: Project[] }>
    get(id: string): Promise<Project>
    create(data: Partial<Project>): Promise<Project>
    update(id: string, data: Partial<Project>): Promise<Project>
    delete(id: string, deleteWorkspace?: boolean): Promise<void>
    getAgents(id: string): Promise<AgentInstance[]>
    getAgentsWithShortIds(id: string): Promise<{ agents: AgentInstance[] }>
    addAgent(
      id: string,
      data: { role: string; agentConfigId: string; customTools?: string[] }
    ): Promise<Project>
    removeAgent(id: string, role: string): Promise<Project>
    createTeamTemplate(
      id: string,
      name: string,
      description?: string
    ): Promise<{ templateId: string }>
    getSessions(id: string): Promise<{ sessions: SessionInfo[] }>
    getSessionMessages(
      id: string,
      sessionId: string,
      options?: { cursor?: string; limit?: number }
    ): Promise<PaginatedResponse<Message>>
    deleteSession(id: string, sessionId: string): Promise<void>
    exportSession(id: string, sessionId: string): Promise<string>
  }

  // Agent roles operations
  agentRoles: {
    getAll(): Promise<AgentRole[]>
    assign(data: AgentRoleAssignment): Promise<AgentRoleAssignment>
    unassign(agentId: string): Promise<void>
    getAssignments(agentIds: string[]): Promise<AgentRoleAssignment[]>
  }

  // Search operations - semantic code search
  search: {
    index(data: SearchIndexData): Promise<SearchIndexStats>
    query(query: string, options?: SearchQueryOptions): Promise<SearchResponse>
    getStats(projectPath?: string): Promise<SearchStatsResponse>
  }
}

// Provider registry for managing multiple providers
export interface ProviderRegistry {
  register(provider: ApiProvider): void
  get(name: string): ApiProvider | undefined
  getAll(): ApiProvider[]
  remove(name: string): void
  isRegistered(name: string): boolean
}

// Configuration store interface
export interface ApiConfigStore {
  getProviderConfig(name: string): ProviderConfig | undefined
  setProviderConfig(name: string, config: ProviderConfig): Promise<void>
  removeProviderConfig(name: string): Promise<void>
  getAllConfigs(): Record<string, ProviderConfig>

  // Security: API keys should be encrypted/secure
  getApiKey(provider: string): string | undefined
  setApiKey(provider: string, key: string): Promise<void>
  removeApiKey(provider: string): Promise<void>
}

// Client factory interface
export interface ClientFactory {
  createStudioClient(): StudioProvider
  createLLMClient(provider: string): LLMProvider
  createGenericClient(config: ProviderConfig): ApiProvider
}
