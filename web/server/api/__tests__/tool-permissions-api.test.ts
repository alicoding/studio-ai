import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { app } from '../../app'
import { ToolDiscoveryService } from '../../services/ToolDiscoveryService'
import {
  applyPreset,
  detectPreset,
  PERMISSION_PRESETS,
} from '../../../../src/types/tool-permissions'
import type { ToolPermission } from '../../../../src/types/tool-permissions'

describe('Tool Permissions API', () => {
  let toolDiscoveryService: ToolDiscoveryService

  beforeEach(async () => {
    toolDiscoveryService = ToolDiscoveryService.getInstance()

    // Ensure tool discovery is complete
    await toolDiscoveryService.discoverTools()
  })

  afterEach(async () => {
    // Clean up any test data
    toolDiscoveryService.reset()
  })

  describe('GET /api/tools', () => {
    it('should return discovered tools from Claude SDK', async () => {
      const response = await request(app).get('/api/tools').expect(200)

      expect(response.body).toHaveProperty('tools')
      expect(response.body).toHaveProperty('permissions')
      expect(Array.isArray(response.body.tools)).toBe(true)
      expect(response.body.tools.length).toBeGreaterThan(0)

      // Should contain expected tools from Claude SDK
      expect(response.body.tools).toContain('Read')
      expect(response.body.tools).toContain('Write')
      expect(response.body.tools).toContain('Bash')
      expect(response.body.tools).toContain('Grep')
    })

    it('should return proper permissions structure', async () => {
      const response = await request(app).get('/api/tools').expect(200)

      const { permissions } = response.body
      expect(permissions).toHaveProperty('presets')
      expect(permissions.presets).toHaveProperty('developer')
      expect(permissions.presets).toHaveProperty('read_only')
      expect(permissions.presets).toHaveProperty('architect')
    })
  })

  describe('Agent Tool Permissions', () => {
    let testAgentId: string

    beforeEach(async () => {
      // Create a test agent
      const testAgent = {
        name: 'Test Agent',
        role: 'developer',
        systemPrompt: 'You are a test agent',
        model: 'claude-3-sonnet',
        tools: [],
      }

      const result = await request(app).post('/api/agents').send(testAgent).expect(201)

      testAgentId = result.body.id
    })

    afterEach(async () => {
      // Clean up test agent
      if (testAgentId) {
        await request(app).delete(`/api/agents/${testAgentId}`).expect(204)
      }
    })

    it('should create agent with default Read Only preset', async () => {
      const response = await request(app).get(`/api/agents/${testAgentId}`).expect(200)

      const agent = response.body
      expect(agent.tools).toBeDefined()
      expect(Array.isArray(agent.tools)).toBe(true)

      // Should have Read Only preset applied
      const availableTools = toolDiscoveryService.getTools()
      const detectedPreset = detectPreset(agent.tools, availableTools)
      expect(detectedPreset).toBe('read_only')
    })

    it('should update agent tool permissions', async () => {
      const availableTools = toolDiscoveryService.getTools()
      const developerTools = applyPreset(PERMISSION_PRESETS.developer, availableTools)

      const response = await request(app)
        .put(`/api/agents/${testAgentId}`)
        .send({
          tools: developerTools,
        })
        .expect(200)

      const updatedAgent = response.body
      expect(updatedAgent.tools).toEqual(developerTools)

      // Should detect as developer preset
      const detectedPreset = detectPreset(updatedAgent.tools, availableTools)
      expect(detectedPreset).toBe('developer')
    })

    it('should handle custom tool permissions', async () => {
      const customTools: ToolPermission[] = [
        { name: 'Read', enabled: true },
        { name: 'Write', enabled: true },
        { name: 'Bash', enabled: false },
        { name: 'Grep', enabled: true },
      ]

      const response = await request(app)
        .put(`/api/agents/${testAgentId}`)
        .send({
          tools: customTools,
        })
        .expect(200)

      const updatedAgent = response.body
      expect(updatedAgent.tools).toEqual(customTools)

      // Should not detect any preset for custom configuration
      const availableTools = toolDiscoveryService.getTools()
      const detectedPreset = detectPreset(updatedAgent.tools, availableTools)
      expect(detectedPreset).toBe(null)
    })

    it('should handle legacy string[] format', async () => {
      const legacyTools = ['Read', 'Write', 'Grep']

      const response = await request(app)
        .put(`/api/agents/${testAgentId}`)
        .send({
          tools: legacyTools,
        })
        .expect(200)

      const updatedAgent = response.body
      expect(Array.isArray(updatedAgent.tools)).toBe(true)

      // Should convert to ToolPermission[] format
      if (updatedAgent.tools.length > 0) {
        expect(updatedAgent.tools[0]).toHaveProperty('name')
        expect(updatedAgent.tools[0]).toHaveProperty('enabled')
      }
    })
  })

  describe('Project Agent Tool Permissions', () => {
    let testProjectId: string
    let testAgentId: string

    beforeEach(async () => {
      // Create test project
      const testProject = {
        name: 'Test Project',
        description: 'Test project for tool permissions',
        workspacePath: '/tmp/test-workspace',
      }

      const projectResult = await request(app)
        .post('/api/studio-projects')
        .send(testProject)
        .expect(201)

      testProjectId = projectResult.body.id

      // Create test agent
      const testAgent = {
        name: 'Test Agent',
        role: 'developer',
        systemPrompt: 'You are a test agent',
        model: 'claude-3-sonnet',
      }

      const agentResult = await request(app).post('/api/agents').send(testAgent).expect(201)

      testAgentId = agentResult.body.id
    })

    afterEach(async () => {
      // Clean up
      if (testProjectId) {
        await request(app).delete(`/api/studio-projects/${testProjectId}`).expect(204)
      }
      if (testAgentId) {
        await request(app).delete(`/api/agents/${testAgentId}`).expect(204)
      }
    })

    it('should add agent to project with custom tools', async () => {
      const customTools: ToolPermission[] = [
        { name: 'Read', enabled: true },
        { name: 'Write', enabled: true },
        { name: 'Bash', enabled: false },
      ]

      const response = await request(app)
        .post(`/api/studio-projects/${testProjectId}/agents`)
        .send({
          role: 'developer',
          agentConfigId: testAgentId,
          customTools,
        })
        .expect(201)

      expect(response.body).toHaveProperty('shortId')
      expect(response.body.customTools).toEqual(customTools)
    })

    it('should update project agent custom tools', async () => {
      // First add agent to project
      await request(app)
        .post(`/api/studio-projects/${testProjectId}/agents`)
        .send({
          role: 'developer',
          agentConfigId: testAgentId,
        })
        .expect(201)

      // Update custom tools
      const newCustomTools: ToolPermission[] = [
        { name: 'Read', enabled: true },
        { name: 'Grep', enabled: true },
        { name: 'WebFetch', enabled: true },
      ]

      const response = await request(app)
        .put(`/api/studio-projects/${testProjectId}/agents/developer`)
        .send({
          customTools: newCustomTools,
        })
        .expect(200)

      expect(response.body.customTools).toEqual(newCustomTools)
    })

    it('should not affect base agent configuration when updating project tools', async () => {
      // Add agent to project
      await request(app)
        .post(`/api/studio-projects/${testProjectId}/agents`)
        .send({
          role: 'developer',
          agentConfigId: testAgentId,
        })
        .expect(201)

      // Update project-specific tools
      const projectTools: ToolPermission[] = [
        { name: 'Read', enabled: true },
        { name: 'Write', enabled: false },
      ]

      await request(app)
        .put(`/api/studio-projects/${testProjectId}/agents/developer`)
        .send({
          customTools: projectTools,
        })
        .expect(200)

      // Verify base agent configuration is unchanged
      const baseAgentResponse = await request(app).get(`/api/agents/${testAgentId}`).expect(200)

      const baseAgent = baseAgentResponse.body
      expect(baseAgent.tools).not.toEqual(projectTools)
    })
  })

  describe('Tool Discovery and Validation', () => {
    it('should discover tools from Claude SDK on startup', async () => {
      const discoveredTools = toolDiscoveryService.getTools()
      expect(discoveredTools).toBeDefined()
      expect(Array.isArray(discoveredTools)).toBe(true)
      expect(discoveredTools.length).toBeGreaterThan(0)
    })

    it('should handle preset application with dynamic tools', async () => {
      const availableTools = toolDiscoveryService.getTools()

      // Test all presets
      const presets = ['developer', 'read_only', 'architect']

      for (const preset of presets) {
        const presetTools = applyPreset(PERMISSION_PRESETS[preset], availableTools)
        expect(presetTools).toBeDefined()
        expect(Array.isArray(presetTools)).toBe(true)
        expect(presetTools.length).toBeGreaterThan(0)

        // All tools should be from available tools
        const toolNames = presetTools.map((tool: ToolPermission) => tool.name)
        for (const toolName of toolNames) {
          expect(availableTools).toContain(toolName)
        }
      }
    })

    it('should detect preset correctly from tool permissions', async () => {
      const availableTools = toolDiscoveryService.getTools()

      // Test preset detection
      const readOnlyTools = applyPreset(PERMISSION_PRESETS.read_only, availableTools)
      const detectedPreset = detectPreset(readOnlyTools, availableTools)
      expect(detectedPreset).toBe('read_only')

      const developerTools = applyPreset(PERMISSION_PRESETS.developer, availableTools)
      const detectedDeveloperPreset = detectPreset(developerTools, availableTools)
      expect(detectedDeveloperPreset).toBe('developer')
    })

    it('should validate tool names against available tools', async () => {
      // Valid tool should be available
      expect(toolDiscoveryService.isToolAvailable('Read')).toBe(true)
      expect(toolDiscoveryService.isToolAvailable('Write')).toBe(true)

      // Invalid tool should not be available
      expect(toolDiscoveryService.isToolAvailable('NonExistentTool')).toBe(false)
    })
  })
})
