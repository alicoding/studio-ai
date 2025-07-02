import { describe, it, expect, beforeEach } from 'vitest'
import { useAgentStore } from '../agents'
import type { Agent, AgentConfig } from '../agents'

describe('Agent Store - New Architecture', () => {
  beforeEach(() => {
    // Clear store before each test
    useAgentStore.getState().clearAll()
  })

  describe('Agent/AgentConfig Separation', () => {
    it('should cleanly separate agents and configs', () => {
      const store = useAgentStore.getState()

      // Ensure clean state
      store.clearAll()

      // Add agent runtime state
      const agent: Agent = {
        id: 'agent-1',
        name: 'Test Agent',
        role: 'dev',
        status: 'offline',
        tokens: 1000,
        maxTokens: 200000,
        sessionId: 'session-123',
        order: 0,
      }
      store.addAgent(agent)

      // Add agent configuration
      const config: AgentConfig = {
        id: 'agent-1',
        name: 'Test Agent Config',
        role: 'dev',
        systemPrompt: 'You are a test agent.',
        tools: ['file_system', 'terminal'],
        model: 'claude-3-opus',
        projectsUsing: ['project-1'],
        maxTokens: 200000,
      }
      store.addAgentConfig(config)

      // Get fresh state after modifications
      const freshState = useAgentStore.getState()

      // Verify separation
      expect(freshState.agents).toHaveLength(1)
      expect(freshState.configs).toHaveLength(1)
      expect(freshState.agents[0]).toEqual(agent)
      expect(freshState.configs[0]).toEqual(config)
    })
  })

  describe('New Getters', () => {
    beforeEach(() => {
      const store = useAgentStore.getState()

      // Setup test data
      const agent: Agent = {
        id: 'agent-1',
        name: 'Test Agent',
        role: 'dev',
        status: 'online',
        tokens: 1500,
        maxTokens: 200000,
        sessionId: 'session-456',
        order: 0,
      }

      const config: AgentConfig = {
        id: 'agent-1',
        name: 'Test Agent Config',
        role: 'dev',
        systemPrompt: 'You are a helpful agent.',
        tools: ['file_system'],
        model: 'claude-3-opus',
        projectsUsing: ['project-1'],
        maxTokens: 200000,
      }

      store.addAgent(agent)
      store.addAgentConfig(config)
      store.setSelectedAgent('agent-1')
    })

    it('should get agent by id', () => {
      const store = useAgentStore.getState()
      const agent = store.getAgent('agent-1')

      expect(agent).toBeTruthy()
      expect(agent?.id).toBe('agent-1')
      expect(agent?.status).toBe('online')
      expect(agent?.tokens).toBe(1500)
    })

    it('should get config by id', () => {
      const store = useAgentStore.getState()
      const config = store.getConfig('agent-1')

      expect(config).toBeTruthy()
      expect(config?.id).toBe('agent-1')
      expect(config?.systemPrompt).toBe('You are a helpful agent.')
      expect(config?.tools).toEqual(['file_system'])
    })

    it('should get agent with config', () => {
      const store = useAgentStore.getState()
      const agentWithConfig = store.getAgentWithConfig('agent-1')

      expect(agentWithConfig).toBeTruthy()
      expect(agentWithConfig?.agent.id).toBe('agent-1')
      expect(agentWithConfig?.agent.status).toBe('online')
      expect(agentWithConfig?.config?.systemPrompt).toBe('You are a helpful agent.')
    })

    it('should get selected agent', () => {
      const store = useAgentStore.getState()
      const selectedAgent = store.getSelectedAgent()

      expect(selectedAgent).toBeTruthy()
      expect(selectedAgent?.id).toBe('agent-1')
      expect(selectedAgent?.status).toBe('online')
    })

    it('should get selected agent with config', () => {
      const store = useAgentStore.getState()
      const selectedAgentWithConfig = store.getSelectedAgentWithConfig()

      expect(selectedAgentWithConfig).toBeTruthy()
      expect(selectedAgentWithConfig?.agent.id).toBe('agent-1')
      expect(selectedAgentWithConfig?.config?.systemPrompt).toBe('You are a helpful agent.')
    })

    it('should return null for non-existent agents', () => {
      const store = useAgentStore.getState()

      expect(store.getAgent('non-existent')).toBeNull()
      expect(store.getConfig('non-existent')).toBeNull()
      expect(store.getAgentWithConfig('non-existent')).toBeNull()
    })

    it('should handle agent without config', () => {
      const store = useAgentStore.getState()

      // Add agent without config
      const agentWithoutConfig: Agent = {
        id: 'agent-2',
        name: 'No Config Agent',
        role: 'test',
        status: 'offline',
        tokens: 0,
        maxTokens: 100000,
        order: 1,
      }
      store.addAgent(agentWithoutConfig)

      const agentWithConfig = store.getAgentWithConfig('agent-2')

      expect(agentWithConfig).toBeTruthy()
      expect(agentWithConfig?.agent.id).toBe('agent-2')
      expect(agentWithConfig?.config).toBeNull()
    })
  })

  describe('Project Agents Getter', () => {
    it('should return all agents for now (project filtering to be added later)', () => {
      const store = useAgentStore.getState()

      const agent1: Agent = {
        id: 'agent-1',
        name: 'Agent 1',
        role: 'dev',
        status: 'online',
        tokens: 1000,
        maxTokens: 200000,
        order: 0,
      }

      const agent2: Agent = {
        id: 'agent-2',
        name: 'Agent 2',
        role: 'ux',
        status: 'offline',
        tokens: 500,
        maxTokens: 150000,
        order: 1,
      }

      store.addAgent(agent1)
      store.addAgent(agent2)

      const projectAgents = store.getProjectAgents('any-project-id')

      expect(projectAgents).toHaveLength(2)
      expect(projectAgents[0].id).toBe('agent-1')
      expect(projectAgents[1].id).toBe('agent-2')
    })
  })
})
