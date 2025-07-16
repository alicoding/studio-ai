/**
 * Studio API Provider - Studio AI's Internal API
 *
 * SOLID: Single Responsibility - Studio AI API operations only
 * DRY: Reuses BaseApiClient for HTTP operations
 * KISS: Simple wrapper around existing API endpoints
 * Library-First: Built on ky via BaseApiClient
 */

import { BaseApiClient } from './BaseApiClient'
import { ApiConfigService } from './ConfigService'
import type {
  StudioProvider,
  ProviderConfig,
  Agent,
  AgentInstance,
  Team,
  SpawnTeamResponse,
  Project,
  Message,
  ProcessStats,
  HealthStatus,
  Hook,
  Screenshot,
  AgentRole,
  SearchIndexStats,
  SessionInfo,
  PaginatedResponse,
} from './types'
import type {
  CreateAgentData,
  UpdateAgentData,
  CreateTeamData,
  UpdateTeamData,
  UpdateProjectMetadata,
  SendMessageData,
  MentionData,
  SystemMessageData,
  SettingsData,
  HookConfig,
  SearchIndexData,
  SearchQueryOptions,
  SearchResponse,
  SearchStatsResponse,
  AgentRoleAssignment,
  ScreenshotData,
} from './studio-types'

export class StudioApiProvider extends BaseApiClient implements StudioProvider {
  private static instance: StudioApiProvider | null = null

  constructor(config?: ProviderConfig) {
    // Use provided config or get from config service
    const finalConfig = config ||
      ApiConfigService.getInstance().getProviderConfig('studio') || {
        name: 'studio',
        baseUrl: '/api',
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      }

    super(finalConfig)
  }

  /**
   * Singleton pattern for app-wide usage
   */
  static getInstance(): StudioApiProvider {
    if (!StudioApiProvider.instance) {
      StudioApiProvider.instance = new StudioApiProvider()
    }
    return StudioApiProvider.instance
  }

  /**
   * Agent operations - replaces src/services/api/agents.ts
   */
  readonly agents = {
    getAll: () => this.get<Agent[]>('agents'),

    get: (id: string) => this.get<Agent>(`agents/${id}`),

    create: (data: CreateAgentData) => this.post<Agent>('agents', data),

    update: (id: string, data: UpdateAgentData) => this.put<Agent>(`agents/${id}`, data),

    delete: (id: string) => this.delete<void>(`agents/${id}`),

    spawn: (id: string, projectId: string) =>
      this.post<AgentInstance>(`agents/${id}/spawn`, { projectId }),

    setStatus: (id: string, status: 'online' | 'offline') =>
      this.put<Agent>(`agents/${id}/status`, { status }),

    abort: (id: string, projectId: string) => this.post<void>(`agents/${id}/abort`, { projectId }),

    clearSession: (id: string, projectId: string, oldSessionId?: string) =>
      this.post<void>(`agents/${id}/clear-session`, { projectId, oldSessionId }),

    deleteSession: (projectId: string, agentId: string) =>
      this.delete<void>(`agents/session/${projectId}/${agentId}`),
  }

  /**
   * Team operations - replaces src/services/api/teams.ts
   */
  readonly teams = {
    getAll: () => this.get<Team[]>('teams'),

    create: (data: CreateTeamData) => this.post<Team>('teams', data),

    update: (id: string, data: UpdateTeamData) => this.put<Team>(`teams/${id}`, data),

    delete: (id: string) => this.delete<void>(`teams/${id}`),

    clone: (id: string, name?: string) => this.post<Team>(`teams/${id}/clone`, { name }),

    spawn: (teamId: string, projectId: string) =>
      this.post<SpawnTeamResponse>(`teams/${teamId}/spawn`, { projectId }),

    import: (team: CreateTeamData) => this.post<Team>('teams/import', { team }),
  }

  /**
   * Project operations
   */
  readonly projects = {
    getAll: () => this.get<Project[]>('projects'),

    get: (id: string) => this.get<Project>(`projects/${id}`),

    updateMetadata: (id: string, data: UpdateProjectMetadata) =>
      this.put<Project>(`projects/${id}/metadata`, data),

    toggleFavorite: (id: string) => this.post<Project>(`projects/${id}/favorite`),

    addTag: (id: string, tag: string) => this.post<Project>(`projects/${id}/tags`, { tag }),

    removeTag: (id: string, tag: string) =>
      this.delete<Project>(`projects/${id}/tags/${encodeURIComponent(tag)}`),

    archive: (id: string) => this.post<Project>(`projects/${id}/archive`),

    unarchive: (id: string) => this.post<Project>(`projects/${id}/unarchive`),

    getSessions: (id: string) => this.get<SessionInfo[]>(`projects/${id}/sessions`),

    getAgents: (id: string) => this.get<AgentInstance[]>(`projects/${id}/agents`),

    addAgents: (id: string, agentIds: string[]) =>
      this.post<AgentInstance[]>(`projects/${id}/agents`, { agentIds }),

    removeAgent: (id: string, agentInstanceId: string) =>
      this.delete<void>(`projects/${id}/agents/${agentInstanceId}`),

    deleteSession: (id: string, fileName: string) =>
      this.delete<void>(`projects/${id}/sessions/${fileName}`),

    getSessionMessages: (
      id: string,
      sessionId: string,
      options?: { cursor?: string; limit?: number }
    ) => {
      const queryParams = options
        ? {
            ...(options.cursor && { cursor: options.cursor }),
            ...(options.limit && { limit: options.limit.toString() }),
          }
        : undefined
      return this.get<PaginatedResponse<Message>>(
        `projects/${id}/sessions/${sessionId}/messages`,
        queryParams
      )
    },

    killAgents: (id: string) => this.delete<void>(`projects/${id}/agents`),
  }

  /**
   * Message operations
   */
  readonly messages = {
    send: (data: SendMessageData) => this.post<Message>('messages', data),

    abort: (data: { projectId: string; agentId: string }) =>
      this.post<void>('messages/abort', data),

    mention: (data: MentionData) => this.post<Message>('messages/mention', data),

    sendSystem: (data: SystemMessageData) => this.post<Message>('messages/system', data),

    removeSession: (projectId: string, agentId: string) =>
      this.delete<void>(`messages/sessions/${projectId}/${agentId}`),
  }

  /**
   * System operations
   */
  readonly system = {
    getProcessStats: () => this.get<ProcessStats>('system/process-stats'),

    health: () => this.get<HealthStatus>('system/health'),

    detectCommand: (command: string) =>
      this.post<{ isCommand: boolean; command?: string; args?: string[] }>(
        'system/detect-command',
        { command }
      ),

    checkPath: (path: string) =>
      this.post<{ exists: boolean; type?: 'file' | 'directory' }>('system/check-path', { path }),
  }

  /**
   * Settings operations
   */
  readonly settings = {
    get: () => this.get<Record<string, unknown>>('settings'),

    update: (data: SettingsData) => this.put<Record<string, unknown>>('settings', data),

    getHooks: () => this.get<Hook[]>('settings/hooks'),

    updateHooks: (hooks: Record<string, HookConfig>) =>
      this.put<Hook[]>('settings/hooks', { hooks }),

    testHook: (hook: HookConfig) =>
      this.post<{ success: boolean; output?: string; error?: string }>('settings/hooks/test', {
        hook,
      }),
  }

  /**
   * Screenshot operations
   */
  readonly screenshots = {
    capture: (data: ScreenshotData) => this.post<Screenshot>('screenshot', data),
  }

  /**
   * Agent roles operations
   */
  readonly agentRoles = {
    getAll: () => this.get<AgentRole[]>('agent-roles'),

    assign: (data: AgentRoleAssignment) =>
      this.post<AgentRoleAssignment>('agent-roles/assign', data),

    unassign: (agentId: string) => this.delete<void>(`agent-roles/${agentId}`),

    getAssignments: (agentIds: string[]) =>
      this.post<AgentRoleAssignment[]>('agent-roles/assignments', { agentIds }),
  }

  /**
   * Search operations - semantic code search
   */
  readonly search = {
    index: (data: SearchIndexData) => this.post<SearchIndexStats>('search/index', data),

    query: (query: string, options?: SearchQueryOptions): Promise<SearchResponse> => {
      const params: Record<string, string> = { q: query }
      if (options?.limit) params.limit = options.limit.toString()
      if (options?.project) params.project = options.project
      return this.get<SearchResponse>('search/query', params)
    },

    getStats: (projectPath?: string): Promise<SearchStatsResponse> => {
      const params = projectPath ? { project: projectPath } : undefined
      return this.get<SearchStatsResponse>('search/stats', params)
    },
  }

  /**
   * Studio Projects operations - new project management endpoints
   */
  readonly studioProjects = {
    getAll: () => this.get<{ projects: Project[] }>('studio-projects'),

    get: (id: string) => this.get<Project>(`studio-projects/${id}`),

    create: (data: Partial<Project>) => this.post<Project>('studio-projects', data),

    update: (id: string, data: Partial<Project>) =>
      this.put<Project>(`studio-projects/${id}`, data),

    delete: (id: string, deleteWorkspace = false) =>
      this.delete<void>(`studio-projects/${id}${deleteWorkspace ? '?deleteWorkspace=true' : ''}`),

    getAgents: (id: string) => this.get<AgentInstance[]>(`studio-projects/${id}/agents`),

    getAgentsWithShortIds: (id: string) =>
      this.get<{ agents: AgentInstance[] }>(`studio-projects/${id}/agents/short-ids`),

    addAgent: (id: string, data: { role: string; agentConfigId: string; customTools?: string[] }) =>
      this.post<Project>(`studio-projects/${id}/agents`, data),

    removeAgent: (id: string, role: string) =>
      this.delete<Project>(`studio-projects/${id}/agents/${role}`),

    createTeamTemplate: (id: string, name: string, description?: string) =>
      this.post<{ templateId: string }>(`studio-projects/${id}/team-template`, {
        name,
        description,
      }),

    getSessions: (id: string) =>
      this.get<{ sessions: SessionInfo[] }>(`studio-projects/${id}/sessions`),

    getSessionMessages: (
      id: string,
      sessionId: string,
      options?: { cursor?: string; limit?: number }
    ) => {
      const queryParams = options
        ? {
            ...(options.cursor && { cursor: options.cursor }),
            ...(options.limit && { limit: options.limit.toString() }),
          }
        : undefined
      return this.get<PaginatedResponse<Message>>(
        `studio-projects/${id}/sessions/${sessionId}/messages`,
        queryParams
      )
    },

    deleteSession: (id: string, sessionId: string) =>
      this.delete<void>(`studio-projects/${id}/sessions/${sessionId}`),

    exportSession: (id: string, sessionId: string) =>
      this.get<string>(`studio-projects/${id}/sessions/${sessionId}/export`),
  }
}
