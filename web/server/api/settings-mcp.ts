/**
 * MCP Settings API Endpoints
 * 
 * SOLID: Single responsibility - MCP configuration management
 * DRY: Reuses ServerConfigService patterns
 * KISS: Simple REST API for MCP servers
 * Library-First: Uses Express and existing services
 */

import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { ServerConfigService } from '../services/ServerConfigService'
import type { MCPServer } from '../../../src/services/ConfigService'

const router = Router()
const configService = ServerConfigService.getInstance()

// GET /api/settings/mcp - Get MCP settings
router.get('/', async (req, res) => {
  try {
    const systemConfig = await configService.getSystemConfig()
    
    // Initialize MCP servers if not present
    if (!systemConfig?.mcpServers) {
      await configService.updateSystemConfig({
        mcpServers: []
      })
    }
    
    res.json({
      servers: systemConfig?.mcpServers || []
    })
  } catch (error) {
    console.error('Failed to get MCP settings:', error)
    res.status(500).json({ error: 'Failed to get MCP settings' })
  }
})

// POST /api/settings/mcp/servers - Add MCP server
router.post('/servers', async (req, res) => {
  try {
    const { name, command, args, env, enabled } = req.body
    
    if (!name || !command) {
      return res.status(400).json({ error: 'Name and command are required' })
    }
    
    const systemConfig = await configService.getSystemConfig()
    const servers = systemConfig?.mcpServers || []
    
    // Check for duplicate names
    if (servers.some((s: MCPServer) => s.name === name)) {
      return res.status(409).json({ error: 'Server with this name already exists' })
    }
    
    const newServer = {
      id: uuidv4(),
      name,
      command,
      args: args || [],
      env: env || {},
      enabled: enabled !== false
    }
    
    await configService.updateSystemConfig({
      mcpServers: [...servers, newServer]
    })
    
    res.status(201).json(newServer)
  } catch (error) {
    console.error('Failed to add MCP server:', error)
    res.status(500).json({ error: 'Failed to add MCP server' })
  }
})

// PUT /api/settings/mcp/servers/:id - Update MCP server
router.put('/servers/:id', async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body
    
    const systemConfig = await configService.getSystemConfig()
    const servers = systemConfig?.mcpServers || []
    
    const index = servers.findIndex((s: MCPServer) => s.id === id)
    if (index === -1) {
      return res.status(404).json({ error: 'Server not found' })
    }
    
    // Check for duplicate names if name is being updated
    if (updates.name && updates.name !== servers[index].name) {
      if (servers.some((s: MCPServer, i: number) => i !== index && s.name === updates.name)) {
        return res.status(409).json({ error: 'Server with this name already exists' })
      }
    }
    
    servers[index] = {
      ...servers[index],
      ...updates
    }
    
    await configService.updateSystemConfig({
      mcpServers: servers
    })
    
    res.json(servers[index])
  } catch (error) {
    console.error('Failed to update MCP server:', error)
    res.status(500).json({ error: 'Failed to update MCP server' })
  }
})

// DELETE /api/settings/mcp/servers/:id - Delete MCP server
router.delete('/servers/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    const systemConfig = await configService.getSystemConfig()
    const servers = systemConfig?.mcpServers || []
    
    const filtered = servers.filter((s: MCPServer) => s.id !== id)
    
    if (filtered.length === servers.length) {
      return res.status(404).json({ error: 'Server not found' })
    }
    
    await configService.updateSystemConfig({
      mcpServers: filtered
    })
    
    res.status(204).send()
  } catch (error) {
    console.error('Failed to delete MCP server:', error)
    res.status(500).json({ error: 'Failed to delete MCP server' })
  }
})

// POST /api/settings/mcp/import - Import MCP configuration from JSON
router.post('/import', async (req, res) => {
  try {
    const { mcpServers } = req.body
    
    if (!mcpServers || typeof mcpServers !== 'object') {
      return res.status(400).json({ error: 'Invalid configuration format' })
    }
    
    const systemConfig = await configService.getSystemConfig()
    const existingServers = systemConfig?.mcpServers || []
    const importedServers: MCPServer[] = []
    
    // Convert Claude Code format to our internal format
    for (const [name, config] of Object.entries(mcpServers)) {
      if (typeof config !== 'object' || !config) continue
      
      const serverConfig = config as {
        command: string
        args?: string[]
        env?: Record<string, string>
      }
      
      // Check if server with this name already exists
      if (existingServers.some((s: MCPServer) => s.name === name)) {
        console.log(`Server ${name} already exists, skipping`)
        continue
      }
      
      const newServer: MCPServer = {
        id: uuidv4(),
        name,
        command: serverConfig.command,
        args: serverConfig.args || [],
        env: serverConfig.env || {},
        enabled: true
      }
      
      importedServers.push(newServer)
    }
    
    // Save all imported servers
    await configService.updateSystemConfig({
      mcpServers: [...existingServers, ...importedServers]
    })
    
    res.json({
      message: 'MCP configuration imported successfully',
      imported: importedServers.length,
      skipped: Object.keys(mcpServers).length - importedServers.length,
      servers: importedServers
    })
  } catch (error) {
    console.error('Failed to import MCP config:', error)
    res.status(500).json({ error: 'Failed to import MCP config' })
  }
})

// GET /api/settings/mcp/export - Export MCP configuration
router.get('/export', async (req, res) => {
  try {
    const systemConfig = await configService.getSystemConfig()
    const servers = systemConfig?.mcpServers || []
    
    // Convert to Claude Code format
    const mcpConfig = {
      mcpServers: servers
        .filter((s: MCPServer) => s.enabled)
        .reduce((acc: Record<string, {
          command: string
          args: string[]
          env?: Record<string, string>
        }>, server: MCPServer) => {
          acc[server.name] = {
            command: server.command,
            args: server.args || [],
            ...(server.env && Object.keys(server.env).length > 0 && { env: server.env })
          }
          return acc
        }, {})
    }
    
    res.json(mcpConfig)
  } catch (error) {
    console.error('Failed to export MCP config:', error)
    res.status(500).json({ error: 'Failed to export MCP config' })
  }
})

// GET /api/settings/mcp/config - Get MCP config in Claude Code format
router.get('/config', async (req, res) => {
  try {
    const systemConfig = await configService.getSystemConfig()
    const servers = systemConfig?.mcpServers || []
    
    // Convert to Claude Code MCP format
    const mcpConfig = {
      mcpServers: servers
        .filter((s: MCPServer) => s.enabled)
        .reduce((acc: Record<string, {
          command: string
          args: string[]
          env?: Record<string, string>
        }>, server: MCPServer) => {
          acc[server.name] = {
            command: server.command,
            args: server.args || [],
            ...(server.env && Object.keys(server.env).length > 0 && { env: server.env })
          }
          return acc
        }, {})
    }
    
    res.json(mcpConfig)
  } catch (error) {
    console.error('Failed to get MCP config:', error)
    res.status(500).json({ error: 'Failed to get MCP config' })
  }
})

export default router