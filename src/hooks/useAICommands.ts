/**
 * useAICommands - AI Command Integration Hook
 * 
 * SOLID: Single Responsibility - Integrates AI commands into agent messaging
 * DRY: Uses server-side AI capabilities API
 * KISS: Simple interface for AI command execution
 * Library-First: Uses server API with ky
 */

import { useCallback } from 'react'
import ky from 'ky'

interface AICommandResult {
  success: boolean
  response?: string
  sessionId?: string
  modelUsed?: string
  toolsUsed?: string[]
  error?: string
}

interface CapabilityConfig {
  id: string
  name: string
  description: string
  command?: {
    enabled: boolean
    trigger: string
    aliases?: string[]
    description: string
  }
  models: {
    primary: string
    fallback?: string[]
  }
}

export function useAICommands() {
  /**
   * Get capabilities from server
   */
  const getCapabilities = useCallback(async (): Promise<Record<string, CapabilityConfig>> => {
    try {
      const response = await ky.get('/api/ai/capabilities', {
        timeout: 15000 // 15 seconds for capabilities
      }).json<Record<string, CapabilityConfig>>()
      return response
    } catch (error) {
      console.error('Failed to get capabilities:', error)
      return {}
    }
  }, [])

  /**
   * Check if a command matches any capability trigger
   */
  const isAICommand = useCallback(async (message: string): Promise<boolean> => {
    const capabilities = await getCapabilities()
    const commandPart = message.split(' ')[0].toLowerCase()
    
    return Object.values(capabilities).some(cap => 
      cap.command?.enabled && (
        cap.command.trigger.toLowerCase() === commandPart ||
        cap.command.aliases?.some((alias: string) => alias.toLowerCase() === commandPart)
      )
    )
  }, [getCapabilities])

  /**
   * Execute an AI command using server-side capabilities
   */
  const executeAICommand = useCallback(
    async (
      message: string,
      agentId: string,
      sessionId?: string
    ): Promise<AICommandResult> => {
      const commandParts = message.split(' ')
      const commandName = commandParts[0] || 'unknown'
      const commandArgs = commandParts.slice(1).join(' ')
      
      try {
        // Find matching capability
        const capabilities = await getCapabilities()
        const capability = Object.values(capabilities).find(cap => 
          cap.command?.enabled && (
            cap.command.trigger.toLowerCase() === commandName.toLowerCase() ||
            cap.command.aliases?.some((alias: string) => alias.toLowerCase() === commandName.toLowerCase())
          )
        )

        if (!capability) {
          throw new Error(`Unknown command: ${commandName}`)
        }
        
        // Execute capability via server API
        const response = await ky.post('/api/ai/execute', {
          json: {
            capabilityId: capability.id,
            input: commandArgs || message,
            context: {
              sessionId: sessionId || `ai-session-${agentId}`
            }
          },
          timeout: 120000 // 2 minutes for AI execution
        }).json<{
          content: string
          sessionId: string
          metadata: {
            capabilityId: string
            model: string
            usage: {
              promptTokens: number
              completionTokens: number
              totalTokens: number
            }
          }
        }>()

        return {
          success: true,
          response: response.content,
          sessionId: response.sessionId,
          modelUsed: response.metadata.model,
          toolsUsed: [capability.id]
        }
      } catch (error) {
        console.error('AI command execution failed:', error)
        const errorMessage = error instanceof Error ? error.message : 'AI command failed'
        
        return {
          success: false,
          error: errorMessage
        }
      }
    },
    [getCapabilities]
  )

  /**
   * Get available AI commands for display in UI
   */
  const getAvailableCommands = useCallback(async () => {
    const capabilities = await getCapabilities()
    return Object.values(capabilities)
      .filter(cap => cap.command?.enabled)
      .map(cap => ({
        command: cap.command!.trigger,
        aliases: cap.command!.aliases,
        capabilityId: cap.id,
        description: cap.description,
        model: cap.models.primary,
        helpText: cap.command!.description
      }))
  }, [getCapabilities])

  return {
    isAICommand,
    executeAICommand,
    getAvailableCommands
  }
}