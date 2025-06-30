import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

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

interface AgentState {
  // State
  agents: Agent[]
  selectedAgentId: string | null
  availableConfigs: AgentConfig[]
  clearingAgentId: string | null // Track which agent is being cleared

  // Actions
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

  // Computed getters
  getSelectedAgent: () => Agent | null
  getAgentsWithRoles: () => Agent[]

  // Utility actions
  sendMessage: (from: string, to: string, content: string) => void
  clearAll: () => void
}

// No mock data - will load from server

export const useAgentStore = create<AgentState>()(
  devtools(
    (set) => ({
      // Initial state
      agents: [],
      selectedAgentId: null,
      availableConfigs: [],
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
            agents: state.agents.map((a) => 
              a.id === agentId ? { ...a, sessionId: '' } : a
            ),
            clearingAgentId: null,
          }),
          false,
          'clearAgentSession'
        ),

      // Config actions
      addAgentConfig: (config) =>
        set(
          (state) => ({
            availableConfigs: [...state.availableConfigs, config],
          }),
          false,
          'addAgentConfig'
        ),

      updateAgentConfig: (config) =>
        set(
          (state) => ({
            availableConfigs: state.availableConfigs.map((c) => (c.id === config.id ? config : c)),
          }),
          false,
          'updateAgentConfig'
        ),

      removeAgentConfig: (configId) =>
        set(
          (state) => ({
            availableConfigs: state.availableConfigs.filter((c) => c.id !== configId),
          }),
          false,
          'removeAgentConfig'
        ),

      setAgentConfigs: (configs) =>
        set(
          { availableConfigs: configs },
          false,
          'setAgentConfigs'
        ),

      // Utility actions
      sendMessage: (from, to, content) => {
        console.log('Send message (UI-first):', { from, to, content })
        // TODO: Implement WebSocket message sending
      },

      // Computed getters
      getSelectedAgent: () => {
        const state = get()
        return state.agents.find(a => a.id === state.selectedAgentId) || null
      },

      getAgentsWithRoles: () => {
        const state = get()
        // This would merge with role assignments - for now just return agents
        // TODO: integrate with role assignments when needed
        return state.agents
      },

      clearAll: () =>
        set(
          {
            agents: [],
            selectedAgentId: null,
            availableConfigs: [],
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
