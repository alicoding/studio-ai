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
}

interface AgentState {
  // State
  agents: Agent[]
  selectedAgentId: string | null
  availableConfigs: AgentConfig[]

  // Actions
  setAgents: (agents: Agent[]) => void
  addAgent: (agent: Agent) => void
  removeAgent: (agentId: string) => void
  updateAgentStatus: (agentId: string, status: Agent['status']) => void
  updateAgentTokens: (agentId: string, tokens: number, maxTokens?: number) => void
  updateAgentMessage: (agentId: string, message: string) => void
  setSelectedAgent: (agentId: string | null) => void

  // Config actions
  addAgentConfig: (config: AgentConfig) => void
  updateAgentConfig: (config: AgentConfig) => void
  removeAgentConfig: (configId: string) => void

  // Utility actions
  sendMessage: (from: string, to: string, content: string) => void
  clearAll: () => void
}

const MOCK_AGENTS: Agent[] = [
  {
    id: 'dev-1',
    name: 'Frontend Dev',
    role: 'dev',
    status: 'online',
    tokens: 15000,
    maxTokens: 200000,
    lastMessage: 'Component styling complete',
    sessionId: 'session-1',
  },
  {
    id: 'ux-1',
    name: 'UX Designer',
    role: 'ux',
    status: 'busy',
    tokens: 8500,
    maxTokens: 200000,
    lastMessage: 'Working on wireframes...',
    sessionId: 'session-2',
  },
  {
    id: 'backend-1',
    name: 'Backend Dev',
    role: 'dev',
    status: 'offline',
    tokens: 0,
    maxTokens: 200000,
    lastMessage: undefined,
    sessionId: 'session-3',
  },
]

const MOCK_AGENT_CONFIGS: AgentConfig[] = [
  {
    id: 'config-1',
    name: 'Senior Developer',
    role: 'dev',
    systemPrompt: 'You are a senior full-stack developer...',
    tools: ['File System', 'Terminal', 'Web Search'],
    model: 'Claude 3 Opus',
    projectsUsing: [],
  },
  {
    id: 'config-2',
    name: 'UI/UX Specialist',
    role: 'ux',
    systemPrompt: 'You are a UI/UX design expert...',
    tools: ['File System', 'Web Search'],
    model: 'Claude 3 Sonnet',
    projectsUsing: [],
  },
  {
    id: 'config-3',
    name: 'QA Engineer',
    role: 'tester',
    systemPrompt: 'You are a quality assurance specialist...',
    tools: ['File System', 'Terminal'],
    model: 'Claude 3 Haiku',
    projectsUsing: [],
  },
]

export const useAgentStore = create<AgentState>()(
  devtools(
    (set) => ({
      // Initial state
      agents: MOCK_AGENTS,
      selectedAgentId: null,
      availableConfigs: MOCK_AGENT_CONFIGS,

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

      setSelectedAgent: (agentId) => set({ selectedAgentId: agentId }, false, 'setSelectedAgent'),

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

      // Utility actions
      sendMessage: (from, to, content) => {
        console.log('Send message (UI-first):', { from, to, content })
        // TODO: Implement WebSocket message sending
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
