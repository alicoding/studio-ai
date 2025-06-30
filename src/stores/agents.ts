import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

// Runtime state - changes frequently during agent operation
export interface Agent {
  id: string
  name: string
  role: string
  status: 'ready' | 'online' | 'busy' | 'offline'
  tokens: number
  maxTokens: number
  lastMessage?: string
  sessionId?: string
  pid?: number
}

// Configuration state - changes rarely, defines agent behavior
export interface AgentConfig {
  id: string
  name: string
  role: string
  systemPrompt: string
  tools: string[]
  model: string
  projectsUsing: string[]
  maxTokens?: number
}

// Utility type for components that need both runtime and config data
export interface AgentWithConfig {
  agent: Agent
  config: AgentConfig | null
}

interface AgentState {
  // Runtime state (changes frequently)
  agents: Agent[]
  selectedAgentId: string | null
  clearingAgentId: string | null // Track which agent is being cleared

  // Configuration state (changes rarely)
  configs: AgentConfig[] // Renamed from availableConfigs for clarity

  // Runtime actions
  setAgents: (agents: Agent[]) => void
  addAgent: (agent: Agent) => void
  removeAgent: (agentId: string) => void
  updateAgentStatus: (agentId: string, status: Agent['status']) => void
  updateAgentTokens: (agentId: string, tokens: number, maxTokens?: number) => void
  updateAgentMessage: (agentId: string, message: string) => void
  updateAgentSessionId: (agentId: string, sessionId: string) => void
  setSelectedAgent: (agentId: string | null) => void

  // Session clearing
  setClearingAgent: (agentId: string | null) => void
  clearAgentSession: (agentId: string) => void

  // Config actions
  addAgentConfig: (config: AgentConfig) => void
  updateAgentConfig: (config: AgentConfig) => void
  removeAgentConfig: (configId: string) => void
  setAgentConfigs: (configs: AgentConfig[]) => void

  // NEW: Comprehensive getters - eliminate prop drilling and data source confusion
  getAgent: (id: string) => Agent | null
  getConfig: (id: string) => AgentConfig | null
  getAgentWithConfig: (id: string) => AgentWithConfig | null
  getSelectedAgent: () => Agent | null
  getSelectedAgentWithConfig: () => AgentWithConfig | null
  getProjectAgents: (projectId: string) => Agent[]
  getAgentsWithRoles: () => Agent[]

  // Utility actions
  sendMessage: (from: string, to: string, content: string) => void
  clearAll: () => void
}

// No mock data - will load from server

export const useAgentStore = create<AgentState>()(
  devtools(
    (set, get) => ({
      // Initial state
      agents: [],
      selectedAgentId: null,
      configs: [], // Renamed from availableConfigs
      clearingAgentId: null,

      // Actions
      setAgents: (agents) => set({ agents }, false, 'setAgents'),

      addAgent: (agent) =>
        set(
          (state) => ({
            agents: [...state.agents, agent],
          }),
          false,
          'addAgent'
        ),

      removeAgent: (agentId) =>
        set(
          (state) => ({
            agents: state.agents.filter((a) => a.id !== agentId),
            selectedAgentId: state.selectedAgentId === agentId ? null : state.selectedAgentId,
          }),
          false,
          'removeAgent'
        ),

      updateAgentStatus: (agentId, status) =>
        set(
          (state) => ({
            agents: state.agents.map((a) => (a.id === agentId ? { ...a, status } : a)),
          }),
          false,
          'updateAgentStatus'
        ),

      updateAgentTokens: (agentId, tokens, maxTokens) =>
        set(
          (state) => ({
            agents: state.agents.map((a) =>
              a.id === agentId
                ? {
                    ...a,
                    tokens,
                    ...(maxTokens !== undefined && { maxTokens }),
                  }
                : a
            ),
          }),
          false,
          'updateAgentTokens'
        ),

      updateAgentMessage: (agentId, lastMessage) =>
        set(
          (state) => ({
            agents: state.agents.map((a) => (a.id === agentId ? { ...a, lastMessage } : a)),
          }),
          false,
          'updateAgentMessage'
        ),

      updateAgentSessionId: (agentId, sessionId) =>
        set(
          (state) => ({
            agents: state.agents.map((a) => (a.id === agentId ? { ...a, sessionId } : a)),
          }),
          false,
          'updateAgentSessionId'
        ),

      setSelectedAgent: (agentId) => set({ selectedAgentId: agentId }, false, 'setSelectedAgent'),

      // Session clearing actions
      setClearingAgent: (agentId) => set({ clearingAgentId: agentId }, false, 'setClearingAgent'),

      clearAgentSession: (agentId) =>
        set(
          (state) => ({
            agents: state.agents.map((a) => (a.id === agentId ? { ...a, sessionId: '' } : a)),
            clearingAgentId: null,
          }),
          false,
          'clearAgentSession'
        ),

      // Config actions
      addAgentConfig: (config) =>
        set(
          (state) => ({
            configs: [...state.configs, config],
          }),
          false,
          'addAgentConfig'
        ),

      updateAgentConfig: (config) =>
        set(
          (state) => ({
            configs: state.configs.map((c) => (c.id === config.id ? config : c)),
          }),
          false,
          'updateAgentConfig'
        ),

      removeAgentConfig: (configId) =>
        set(
          (state) => ({
            configs: state.configs.filter((c) => c.id !== configId),
          }),
          false,
          'removeAgentConfig'
        ),

      setAgentConfigs: (configs) => set({ configs }, false, 'setAgentConfigs'),

      // Utility actions
      sendMessage: (from, to, content) => {
        console.log('Send message (UI-first):', { from, to, content })
        // TODO: Implement WebSocket message sending
      },

      // NEW: Comprehensive getters - eliminate prop drilling and data source confusion
      getAgent: (id: string) => {
        const state = get()
        return state.agents.find((agent) => agent.id === id) || null
      },

      getConfig: (id: string) => {
        const state = get()
        return state.configs.find((config) => config.id === id) || null
      },

      getAgentWithConfig: (id: string) => {
        const state = get()
        const agent = state.agents.find((a) => a.id === id)
        const config = state.configs.find((c) => c.id === id)

        if (!agent) return null

        return {
          agent,
          config: config || null,
        }
      },

      getSelectedAgent: () => {
        const state = get()
        if (!state.selectedAgentId) return null
        return state.agents.find((a) => a.id === state.selectedAgentId) || null
      },

      getSelectedAgentWithConfig: () => {
        const state = get()
        if (!state.selectedAgentId) return null

        const agent = state.agents.find((a) => a.id === state.selectedAgentId)
        const config = state.configs.find((c) => c.id === state.selectedAgentId)

        if (!agent) return null

        return {
          agent,
          config: config || null,
        }
      },

      getProjectAgents: (_projectId: string) => {
        const state = get()
        // Filter agents that belong to this project
        // For now, return all agents - this will be enhanced when we add project filtering
        return state.agents
      },

      getAgentsWithRoles: () => {
        const state = get()
        // Return agents with their role information
        // This maintains compatibility with existing usage
        return state.agents
      },

      clearAll: () =>
        set(
          {
            agents: [],
            selectedAgentId: null,
            configs: [],
          },
          false,
          'clearAll'
        ),
    }),
    {
      name: 'agent-store',
    }
  )
)
