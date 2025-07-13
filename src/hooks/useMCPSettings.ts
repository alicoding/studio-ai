/**
 * MCP Settings Hook
 * 
 * SOLID: Single responsibility - MCP server configuration management
 * DRY: Reuses storage hooks and API patterns
 * KISS: Simple interface for MCP server CRUD operations
 * Library-First: Follows existing hook patterns
 */

import { useState, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'

export interface MCPServer {
  id?: string
  name: string
  command: string
  args?: string[]
  env?: Record<string, string>
  enabled: boolean
}

interface MCPSettings {
  servers: MCPServer[]
}

export function useMCPSettings() {
  const [servers, setServers] = useState<MCPServer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load MCP settings
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/settings/mcp')
      if (!response.ok) {
        throw new Error('Failed to load MCP settings')
      }
      const data: MCPSettings = await response.json()
      setServers(data.servers || [])
      setError(null)
    } catch (err) {
      console.error('Failed to load MCP settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const addServer = useCallback(async (server: MCPServer) => {
    try {
      const newServer = {
        ...server,
        id: server.id || uuidv4()
      }

      const response = await fetch('/api/settings/mcp/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newServer)
      })

      if (!response.ok) {
        throw new Error('Failed to add MCP server')
      }

      await loadSettings()
      return newServer
    } catch (error) {
      console.error('Failed to add MCP server:', error)
      throw error
    }
  }, [loadSettings])

  const updateServer = useCallback(async (id: string, updates: Partial<MCPServer>) => {
    try {
      const response = await fetch(`/api/settings/mcp/servers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        throw new Error('Failed to update MCP server')
      }

      await loadSettings()
    } catch (error) {
      console.error('Failed to update MCP server:', error)
      throw error
    }
  }, [loadSettings])

  const removeServer = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/settings/mcp/servers/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to remove MCP server')
      }

      await loadSettings()
    } catch (error) {
      console.error('Failed to remove MCP server:', error)
      throw error
    }
  }, [loadSettings])

  return {
    servers,
    loading,
    error,
    addServer,
    updateServer,
    removeServer
  }
}