/**
 * Capability Configuration System
 * 
 * SOLID: Open/Closed - Extend capabilities without modifying code
 * DRY: Single source of truth for capability definitions
 * KISS: Simple JSON-based configuration
 * Library-First: Uses standard configuration patterns
 */

export interface CapabilityConfig {
  id: string
  name: string
  description: string
  icon?: string
  category: 'research' | 'analysis' | 'generation' | 'validation' | 'custom'
  
  // Command configuration - configurable through UI
  command?: {
    enabled: boolean
    trigger: string // e.g., "#search"
    aliases?: string[] // e.g., ["#find", "#lookup"]
    description?: string // Help text for the command
  }
  
  // Model selection
  models: {
    primary: string
    fallback?: string[]
    selection?: 'auto' | 'manual' | 'cost-optimized' | 'performance'
  }
  
  // Prompts - all editable through UI
  prompts: {
    system: string
    user?: string // Optional user prompt template
    examples?: Array<{
      input: string
      output: string
    }>
  }
  
  // Context configuration
  context: {
    includeFiles?: boolean
    includeProject?: boolean
    includeHistory?: boolean
    maxHistoryTurns?: number
    maxTokens?: number
    requiredContext?: string[] // Required context keys
  }
  
  // Interaction configuration
  interaction: {
    allowFollowUp?: boolean
    maxTurns?: number
    delegationEnabled?: boolean
    delegateTo?: string[] // Other capability IDs
  }
  
  // Output configuration
  output: {
    format?: 'text' | 'json' | 'markdown' | 'code'
    schema?: Record<string, any> // JSON schema for structured output
    postProcessing?: string // JavaScript expression for post-processing
  }
  
  // Advanced settings
  advanced: {
    temperature?: number
    maxTokens?: number
    topP?: number
    frequencyPenalty?: number
    presencePenalty?: number
    stopSequences?: string[]
  }
  
  // Metadata
  metadata: {
    author?: string
    version?: string
    created?: string
    modified?: string
    tags?: string[]
  }
}

// Default capability templates that users can extend
export const DEFAULT_CAPABILITIES: Record<string, CapabilityConfig> = {
  'deep-thinking': {
    id: 'deep-thinking',
    name: 'Deep Thinking',
    description: 'Extended reasoning and problem-solving',
    category: 'analysis',
    models: {
      primary: 'o3',
      fallback: ['gemini-pro', 'gpt-4'],
      selection: 'auto'
    },
    prompts: {
      system: `You are an extended thinking & reasoning assistant. Your goal is to provide deep, thorough analysis.

When approaching a problem:
1. Break it down into components
2. Consider multiple perspectives
3. Identify potential issues and edge cases
4. Provide actionable recommendations

Focus areas: {focusAreas}
Problem context: {problemContext}`,
      user: `Please analyze the following deeply: {prompt}

Additional context:
{additionalContext}`
    },
    context: {
      includeFiles: true,
      includeProject: true,
      includeHistory: true,
      maxTokens: 4000
    },
    interaction: {
      allowFollowUp: true,
      maxTurns: 5,
      delegationEnabled: true,
      delegateTo: ['research', 'code-analysis']
    },
    output: {
      format: 'markdown'
    },
    advanced: {
      temperature: 0.7,
      maxTokens: 4000
    },
    metadata: {
      version: '1.0',
      tags: ['analysis', 'reasoning']
    }
  },
  
  'debugging': {
    id: 'debugging',
    name: 'Debugging',
    description: 'Debug code issues',
    category: 'analysis',
    command: {
      enabled: false,
      trigger: '',
      aliases: [],
      description: 'Debug code problems'
    },
    models: {
      primary: 'gpt-4',
      selection: 'auto'
    },
    prompts: {
      system: 'You are a debugging assistant. Help identify and fix code issues.'
    },
    context: {
      includeFiles: true
    },
    interaction: {
      allowFollowUp: true
    },
    output: {
      format: 'markdown'
    },
    advanced: {},
    metadata: {
      modified: new Date().toISOString()
    }
  },
  
  'research': {
    id: 'research',
    name: 'Research',
    description: 'Web search and documentation lookup',
    category: 'research',
    command: {
      enabled: false,
      trigger: '',
      aliases: [],
      description: 'Search the web and documentation'
    },
    models: {
      primary: 'sonar-pro',
      fallback: ['perplexity', 'llama-3.1-sonar-large-128k-online'],
      selection: 'auto'
    },
    prompts: {
      system: `You are a comprehensive research assistant with web access.
      
Your goals:
- Find current, accurate information
- Provide sources and citations
- Synthesize multiple perspectives
- Focus on: {focus}`,
      user: `Research the following: {query}

Specific requirements: {requirements}`
    },
    context: {
      includeProject: true,
      maxTokens: 2000
    },
    interaction: {
      allowFollowUp: true,
      maxTurns: 3
    },
    output: {
      format: 'markdown'
    },
    advanced: {
      temperature: 0.3
    },
    metadata: {
      version: '1.0',
      tags: ['research', 'web-search']
    }
  },
  
  'code-review': {
    id: 'code-review',
    name: 'Code Review',
    description: 'Professional code analysis and review',
    category: 'validation',
    models: {
      primary: 'gpt-4',
      fallback: ['claude-3-opus', 'o3'],
      selection: 'performance'
    },
    prompts: {
      system: `You are a senior software engineer conducting a thorough code review.

Review aspects:
- Code quality and clarity
- Potential bugs and edge cases
- Security vulnerabilities
- Performance implications
- Best practices adherence
- {additionalFocus}

Severity levels: Critical, High, Medium, Low`,
      user: `Review the following code:
{code}

Focus on: {focusAreas}
Standards: {codingStandards}`
    },
    context: {
      includeFiles: true,
      includeProject: true,
      maxTokens: 8000
    },
    interaction: {
      allowFollowUp: true,
      delegationEnabled: true,
      delegateTo: ['security-scan', 'performance-analysis']
    },
    output: {
      format: 'json',
      schema: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          issues: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                severity: { type: 'string' },
                line: { type: 'number' },
                description: { type: 'string' },
                suggestion: { type: 'string' }
              }
            }
          }
        }
      }
    },
    advanced: {
      temperature: 0.2
    },
    metadata: {
      version: '1.0',
      tags: ['validation', 'code-quality']
    }
  },
  
  'general': {
    id: 'general',
    name: 'General Chat',
    description: 'General purpose conversation',
    category: 'custom',
    models: {
      primary: 'gpt-4o',
      selection: 'auto'
    },
    prompts: {
      system: 'You are a helpful AI assistant. Provide clear, concise, and accurate responses.',
      user: '{prompt}'
    },
    context: {
      includeHistory: true,
      maxTokens: 2000
    },
    interaction: {
      allowFollowUp: true,
      maxTurns: 10
    },
    output: {
      format: 'text'
    },
    advanced: {
      temperature: 0.7
    },
    metadata: {
      version: '1.0',
      tags: ['general', 'chat']
    }
  },
  
  'general-chat': {
    id: 'general-chat',
    name: 'General Chat',
    description: 'General purpose conversation',
    category: 'custom',
    models: {
      primary: 'gpt-4o',
      selection: 'auto'
    },
    prompts: {
      system: 'You are a helpful AI assistant. Provide clear, concise, and accurate responses.',
      user: '{prompt}'
    },
    context: {
      includeHistory: true,
      maxTokens: 2000
    },
    interaction: {
      allowFollowUp: true,
      maxTurns: 10
    },
    output: {
      format: 'text'
    },
    advanced: {
      temperature: 0.7
    },
    metadata: {
      version: '1.0',
      tags: ['general', 'chat']
    }
  },
  
  'planning': {
    id: 'planning',
    name: 'Planning',
    description: 'Task planning and strategy',
    category: 'analysis',
    models: {
      primary: 'gpt-4o',
      fallback: ['claude-3-opus-20240229'],
      selection: 'auto'
    },
    prompts: {
      system: `You are a strategic planning assistant. Help break down complex tasks and create actionable plans.
      
Focus on:
- Clear objectives
- Step-by-step approach
- Dependencies and prerequisites
- Risk mitigation
- Success criteria`,
      user: 'Plan the following: {prompt}'
    },
    context: {
      includeProject: true,
      includeHistory: true,
      maxTokens: 3000
    },
    interaction: {
      allowFollowUp: true,
      maxTurns: 5
    },
    output: {
      format: 'markdown'
    },
    advanced: {
      temperature: 0.6
    },
    metadata: {
      version: '1.0',
      tags: ['planning', 'strategy']
    }
  },
  
  'test-generation': {
    id: 'test-generation',
    name: 'Test Generation',
    description: 'Generate comprehensive tests',
    category: 'generation',
    models: {
      primary: 'gpt-4o',
      selection: 'auto'
    },
    prompts: {
      system: `You are a test generation expert. Create comprehensive test suites with:
- Unit tests
- Edge cases
- Error scenarios
- Integration tests where appropriate
- Clear test descriptions`,
      user: 'Generate tests for: {code}'
    },
    context: {
      includeFiles: true,
      maxTokens: 4000
    },
    interaction: {
      allowFollowUp: true
    },
    output: {
      format: 'code'
    },
    advanced: {
      temperature: 0.3
    },
    metadata: {
      version: '1.0',
      tags: ['testing', 'code-generation']
    }
  }
}

// Configuration store interface
export interface CapabilityStore {
  capabilities: Map<string, CapabilityConfig>
  customCapabilities: Map<string, CapabilityConfig>
  
  // CRUD operations
  create(config: CapabilityConfig): void
  read(id: string): CapabilityConfig | undefined
  update(id: string, config: Partial<CapabilityConfig>): void
  delete(id: string): void
  
  // Import/Export
  exportCapability(id: string): string
  importCapability(json: string): CapabilityConfig
  
  // Presets
  loadDefaults(): void
  resetToDefault(id: string): void
}