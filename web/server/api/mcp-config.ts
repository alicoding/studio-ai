/**
 * MCP Config Generation API
 * 
 * SOLID: Single responsibility - Generate MCP config for Claude Code
 * DRY: Reuses MCP server configuration from settings
 * KISS: Simple endpoint to generate config file
 * Library-First: Uses Express and existing services
 */

import { Router } from 'express'
import { ServerConfigService } from '../services/ServerConfigService'
import type { MCPServer } from '../../../src/services/ConfigService'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

const router = Router()
const configService = ServerConfigService.getInstance()

// GET /api/mcp-config/generate - Generate MCP config file for Claude Code
router.get('/generate', async (req, res) => {
  try {
    const systemConfig = await configService.getSystemConfig()
    const servers = systemConfig?.mcpServers || []
    
    // Filter enabled servers and convert to Claude Code format
    const enabledServers = servers.filter((s: MCPServer) => s.enabled)
    
    if (enabledServers.length === 0) {
      return res.json({
        message: 'No MCP servers configured',
        config: null,
        path: null
      })
    }
    
    // Generate Claude Code MCP config format
    const mcpConfig = {
      mcpServers: enabledServers.reduce((acc: Record<string, {
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
    
    // Write to temporary file
    const tempDir = path.join(os.tmpdir(), 'studio-ai-mcp')
    await fs.mkdir(tempDir, { recursive: true })
    
    const configPath = path.join(tempDir, 'mcp-config.json')
    await fs.writeFile(configPath, JSON.stringify(mcpConfig, null, 2))
    
    res.json({
      message: 'MCP config generated successfully',
      config: mcpConfig,
      path: configPath,
      command: `claude --mcp-config "${configPath}"`,
      tools: enabledServers.map((s: MCPServer) => ({
        server: s.name,
        toolPrefix: `mcp__${s.name}`,
        example: `mcp__${s.name}__toolName`
      }))
    })
  } catch (error) {
    console.error('Failed to generate MCP config:', error)
    res.status(500).json({ error: 'Failed to generate MCP config' })
  }
})

// GET /api/mcp-config/tools - Get available MCP tools for agent configuration
router.get('/tools', async (req, res) => {
  try {
    const systemConfig = await configService.getSystemConfig()
    const servers = systemConfig?.mcpServers || []
    
    const enabledServers = servers.filter((s: MCPServer) => s.enabled)
    
    // Generate tool patterns for each server
    const tools = enabledServers.map((server: MCPServer) => ({
      server: server.name,
      pattern: `mcp__${server.name}`,
      description: `All tools from ${server.name} MCP server`,
      example: `mcp__${server.name}__toolName`
    }))
    
    res.json({ tools })
  } catch (error) {
    console.error('Failed to get MCP tools:', error)
    res.status(500).json({ error: 'Failed to get MCP tools' })
  }
})

export default router