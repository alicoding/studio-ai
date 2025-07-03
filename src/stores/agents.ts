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
  order: number // Position in agent list for persistent ordering
  consolidatedSession?: any // Full consolidated session info for checkpoint UI
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
  updateAgentRole: (agentId: string, role: string) => void
  updateAgentFromConfig: (agentId: string, config: Partial<AgentConfig>) => void
  setSelectedAgent: (agentId: string | null) => void

  // Agent ordering
  reorderAgent: (agentId: string, newOrder: number) => void
  swapAgentOrder: (agentId1: string, agentId2: string) => void
  moveAgentToPosition: (agentId: string, targetIndex: number) => void
  normalizeAgentOrder: () => void
  saveAgentOrder: () => void
  loadAgentOrder: () => void

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

// Helper to restore selectedAgentId from localStorage
const getInitialSelectedAgentId = (): string | null => {
  try {
    return localStorage.getItem('claudeStudio:selectedAgentId') || null
  } catch (error) {
    console.warn('Failed to restore selectedAgentId from localStorage:', error)
    return null
  }
}

export const useAgentStore = create<AgentState>()(
  devtools(
    (set, get) => ({
      // Initial state
      agents: [],
      selectedAgentId: getInitialSelectedAgentId(), // Restore immediately on store creation
      configs: [], // Renamed from availableConfigs
      clearingAgentId: null,

      // Actions
      setAgents: (agents) => {
        console.log('[AgentStore] setAgents called with:', agents.length, 'agents', agents.map(a => a.id))
        set(
          (state) => {
            console.log('[AgentStore] Current state selectedAgentId:', state.selectedAgentId)
            
            // Ensure all agents have order fields, assigning them if missing
            const agentsWithOrder = agents.map((agent, index) => ({
              ...agent,
              order: agent.order !== undefined ? agent.order : index,
            }))

            // Validate the current selectedAgentId - if it's not in the new agents list, clear it
            const currentSelectedId = state.selectedAgentId
            const isSelectedAgentValid = currentSelectedId && agents.some(agent => agent.id === currentSelectedId)
            
            // Try to restore from localStorage if we don't have a selected agent
            let finalSelectedId = currentSelectedId
            if (!currentSelectedId && agents.length > 0) {
              try {
                const savedSelectedAgentId = localStorage.getItem('claudeStudio:selectedAgentId')
                console.log('[AgentStore] No current selection, checking localStorage:', savedSelectedAgentId)
                if (savedSelectedAgentId && agents.some(agent => agent.id === savedSelectedAgentId)) {
                  console.log('[AgentStore] Restoring selected agent from localStorage:', savedSelectedAgentId)
                  finalSelectedId = savedSelectedAgentId
                }
              } catch (error) {
                console.warn('Failed to restore selected agent from localStorage:', error)
              }
            }
            
            return { 
              agents: agentsWithOrder,
              // Only clear selectedAgentId if it's invalid and we have agents
              selectedAgentId: agents.length > 0 && !isSelectedAgentValid && !finalSelectedId ? null : finalSelectedId
            }
          },
          false,
          'setAgents'
        )
        // Load saved order after setting agents
        get().loadAgentOrder()
      },

      addAgent: (agent) => {
        set(
          (state) => {
            // Assign order as the next available position
            const maxOrder =
              state.agents.length > 0 ? Math.max(...state.agents.map((a) => a.order)) : -1
            const agentWithOrder = { ...agent, order: maxOrder + 1 }

            return {
              agents: [...state.agents, agentWithOrder],
            }
          },
          false,
          'addAgent'
        )
        // Save to localStorage after adding agent
        get().saveAgentOrder()
      },

      removeAgent: (agentId) => {
        set(
          (state) => {
            const newState = {
              agents: state.agents.filter((a) => a.id !== agentId),
              selectedAgentId: state.selectedAgentId === agentId ? null : state.selectedAgentId,
            }
            
            // If we cleared the selectedAgentId, update localStorage
            if (state.selectedAgentId === agentId) {
              try {
                localStorage.removeItem('claudeStudio:selectedAgentId')
              } catch (error) {
                console.warn('Failed to clear selectedAgentId from localStorage:', error)
              }
            }
            
            return newState
          },
          false,
          'removeAgent'
        )
        // Save to localStorage after removing agent
        get().saveAgentOrder()
      },

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

      updateAgentRole: (agentId, role) =>
        set(
          (state) => ({
            agents: state.agents.map((a) => (a.id === agentId ? { ...a, role } : a)),
          }),
          false,
          'updateAgentRole'
        ),

      updateAgentFromConfig: (agentId, config) =>
        set(
          (state) => ({
            agents: state.agents.map((a) =>
              a.id === agentId
                ? {
                    ...a,
                    role: config.role || a.role,
                    name: config.name || a.name,
                    maxTokens: config.maxTokens || a.maxTokens,
                  }
                : a
            ),
          }),
          false,
          'updateAgentFromConfig'
        ),

      setSelectedAgent: (agentId) => {
        set({ selectedAgentId: agentId }, false, 'setSelectedAgent')
        // Save selected agent to localStorage
        try {
          if (agentId) {
            localStorage.setItem('claudeStudio:selectedAgentId', agentId)
          } else {
            localStorage.removeItem('claudeStudio:selectedAgentId')
          }
        } catch (error) {
          console.warn('Failed to save selected agent to localStorage:', error)
        }
      },

      // Agent ordering actions
      reorderAgent: (agentId, newOrder) => {
        set(
          (state) => ({
            agents: state.agents.map((a) => (a.id === agentId ? { ...a, order: newOrder } : a)),
          }),
          false,
          'reorderAgent'
        )
        // Save to localStorage after reordering
        get().saveAgentOrder()
      },

      swapAgentOrder: (agentId1, agentId2) => {
        set(
          (state) => {
            const agent1 = state.agents.find((a) => a.id === agentId1)
            const agent2 = state.agents.find((a) => a.id === agentId2)

            if (!agent1 || !agent2) return state

            return {
              agents: state.agents.map((a) => {
                if (a.id === agentId1) return { ...a, order: agent2.order }
                if (a.id === agentId2) return { ...a, order: agent1.order }
                return a
              }),
            }
          },
          false,
          'swapAgentOrder'
        )
        // Save to localStorage after reordering
        get().saveAgentOrder()
      },

      moveAgentToPosition: (agentId, targetIndex) => {
        set(
          (state) => {
            const sortedAgents = [...state.agents].sort((a, b) => a.order - b.order)
            const currentIndex = sortedAgents.findIndex((a) => a.id === agentId)

            if (currentIndex === -1 || targetIndex < 0 || targetIndex >= sortedAgents.length) {
              return state
            }

            // Remove agent from current position
            const [movedAgent] = sortedAgents.splice(currentIndex, 1)
            // Insert at new position
            sortedAgents.splice(targetIndex, 0, movedAgent)

            // Update order for all agents based on new positions
            const updatedAgents = sortedAgents.map((agent, index) => ({
              ...agent,
              order: index,
            }))

            return {
              agents: state.agents.map((a) => {
                const updated = updatedAgents.find((ua) => ua.id === a.id)
                return updated || a
              }),
            }
          },
          false,
          'moveAgentToPosition'
        )
        // Save to localStorage after reordering
        get().saveAgentOrder()
      },

      normalizeAgentOrder: () =>
        set(
          (state) => {
            const sortedAgents = [...state.agents].sort((a, b) => a.order - b.order)
            return {
              agents: state.agents.map((a) => {
                const newOrder = sortedAgents.findIndex((sa) => sa.id === a.id)
                return { ...a, order: newOrder }
              }),
            }
          },
          false,
          'normalizeAgentOrder'
        ),

      saveAgentOrder: () => {
        const state = get()
        try {
          const agentOrder = state.agents.map((agent) => ({
            id: agent.id,
            order: agent.order,
          }))
          localStorage.setItem('claudeStudio:agentOrder', JSON.stringify(agentOrder))
        } catch (error) {
          console.warn('Failed to save agent order to localStorage:', error)
        }
      },

      loadAgentOrder: () => {
        try {
          const savedOrder = localStorage.getItem('claudeStudio:agentOrder')
          if (savedOrder) {
            const agentOrder: { id: string; order: number }[] = JSON.parse(savedOrder)
            set(
              (state) => {
                // Create a map of saved orders
                const orderMap = new Map(agentOrder.map((item) => [item.id, item.order]))

                return {
                  agents: state.agents.map((agent) => ({
                    ...agent,
                    order: orderMap.get(agent.id) ?? agent.order,
                  })),
                }
              },
              false,
              'loadAgentOrder'
            )
          }
        } catch (error) {
          console.warn('Failed to load agent order from localStorage:', error)
        }
      },

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
        // For now, return all agents sorted by order - this will be enhanced when we add project filtering
        return [...state.agents].sort((a, b) => a.order - b.order)
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
