/**
 * Studio AI Tool Definition
 * 
 * KISS: Single tool with dynamic description showing available capabilities
 * Configurable: All behavior driven by capability configuration
 * DRY: Single source of truth for capabilities
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js'

// Get API base URL from environment or default
const API_BASE = process.env.CLAUDE_STUDIO_API || 'http://localhost:3456/api'

/**
 * Fetch current capabilities and build description
 */
async function getCapabilitiesDescription(): Promise<string> {
  try {
    const response = await fetch(`${API_BASE}/ai/capabilities`)
    if (!response.ok) {
      return 'Execute AI capabilities - No capabilities configured yet'
    }
    
    const capabilities = await response.json() as Record<string, unknown>
    const capList = Object.entries(capabilities).map(([id, cap]) => {
      const capObj = cap as { models?: { primary?: string } }
      const model = capObj?.models?.primary || 'unknown'
      return `${id}(${model})`
    }).join(', ')
    
    if (capList) {
      return `Execute AI capabilities. Available: ${capList}`
    } else {
      return 'Execute AI capabilities - No capabilities configured yet'
    }
  } catch (_error) {
    return 'Execute AI capabilities - Error loading capabilities'
  }
}

/**
 * Create tool with dynamic description
 */
export async function createStudioAITool(): Promise<Tool> {
  const description = await getCapabilitiesDescription()
  
  // Get capability IDs for dynamic parameter description
  let capabilityIds: string[] = []
  try {
    const response = await fetch(`${API_BASE}/ai/capabilities`)
    if (response.ok) {
      const capabilities = await response.json() as Record<string, unknown>
      capabilityIds = Object.keys(capabilities)
    }
  } catch (_error) {
    // Use empty array if fetch fails
  }
  
  const capabilityDescription = capabilityIds.length > 0
    ? `Capability ID (e.g., ${capabilityIds.map(id => `"${id}"`).join(', ')})`
    : 'Capability ID'
  
  return {
    name: 'studio-ai',
    description,
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['chat', 'command', 'mention', 'batch'],
          description: 'Type of AI operation to perform'
        },
        capability: {
          type: 'string',
          description: capabilityDescription
        },
        input: {
          type: 'string',
          description: 'User input or message'
        },
        context: {
          type: 'object',
          description: 'Additional context for the AI operation',
          properties: {
            projectId: { 
              type: 'string',
              description: 'Current project ID'
            },
            sessionId: { 
              type: 'string',
              description: 'Session ID for multi-turn conversations'
            },
            files: { 
              type: 'array',
              items: { type: 'string' },
              description: 'File paths for context'
            },
            metadata: {
              type: 'object',
              description: 'Additional metadata',
              additionalProperties: true
            },
            targetProjectId: {
              type: 'string',
              description: 'Target project ID for cross-project routing'
            }
          },
          additionalProperties: false
        },
        wait: {
          type: 'boolean',
          description: 'Wait for response in mention operations'
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds for wait operations'
        },
        waitStrategy: {
          type: 'string',
          enum: ['all', 'any', 'none'],
          description: 'Wait strategy for batch operations'
        },
        messages: {
          type: 'array',
          description: 'Messages array for batch operations',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              targetAgentId: { type: 'string' },
              content: { type: 'string' },
              projectId: { type: 'string' },
              dependencies: {
                type: 'array',
                items: { type: 'string' }
              }
            },
            required: ['id', 'targetAgentId', 'content']
          }
        }
      },
      required: ['type', 'input'],
      additionalProperties: false
    }
  }
}

// Keep the old export for backward compatibility
export const studioAITool: Tool = {
  name: 'studio-ai',
  description: 'Execute AI capabilities with configurable models and prompts',
  inputSchema: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: ['chat', 'command', 'mention'],
        description: 'Type of AI operation to perform'
      },
      capability: {
        type: 'string',
        description: 'Capability ID (e.g., "research", "debugging", "reasoning")'
      },
      input: {
        type: 'string',
        description: 'User input or message'
      },
      context: {
        type: 'object',
        description: 'Additional context for the AI operation',
        properties: {
          projectId: { 
            type: 'string',
            description: 'Current project ID'
          },
          sessionId: { 
            type: 'string',
            description: 'Session ID for multi-turn conversations'
          },
          files: { 
            type: 'array',
            items: { type: 'string' },
            description: 'File paths for context'
          },
          metadata: {
            type: 'object',
            description: 'Additional metadata',
            additionalProperties: true
          }
        },
        additionalProperties: false
      }
    },
    required: ['type', 'input'],
    additionalProperties: false
  }
}