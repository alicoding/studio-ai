/**
 * MemoryNode - LangChain Memory configuration node (Buffer, Vector, Summary, Entity)
 *
 * SOLID: Single responsibility - Memory configuration only
 * DRY: Reuses ProviderNode patterns and UI components
 * KISS: Simple memory type selection and configuration interface
 * Library-First: Uses LangChain memory types, React Flow, Lucide icons, shadcn/ui components
 */

import { Handle, Position, NodeProps } from 'reactflow'
import { Database, FileText, Users, Hash, ChevronDown, ChevronRight } from 'lucide-react'
import { useState, useCallback, useEffect, memo, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useWorkflowBuilderStore } from '@/stores/workflowBuilder'
import type { WorkflowStepDefinition } from '../../../../web/server/schemas/workflow-builder'

// Extended step definition that includes memory config
interface ExtendedStepDefinition {
  memoryType?: string
  config?: MemoryConfig | Record<string, unknown>
  [key: string]: unknown
}

// LangChain memory configuration interface
interface MemoryConfig {
  type: 'buffer' | 'vector' | 'summary' | 'entity'
  bufferSize?: number
  summaryPrompt?: string
  vectorStore?: string
  entityTypes?: string[]
  maxTokens?: number
  returnMessages?: boolean
}

// Memory node data interface
interface MemoryNodeData {
  label: string
  memoryType?: MemoryConfig['type']
  config?: MemoryConfig
}

// LangChain memory types (following existing patterns)
const MEMORY_TYPES = {
  buffer: {
    label: 'Buffer Memory',
    description: 'Store recent conversation history',
    icon: Database,
    colorClass: 'bg-blue-500',
    defaultConfig: {
      type: 'buffer' as const,
      bufferSize: 10,
      returnMessages: true,
    },
  },
  vector: {
    label: 'Vector Memory',
    description: 'Semantic similarity search',
    icon: Hash,
    colorClass: 'bg-purple-500',
    defaultConfig: {
      type: 'vector' as const,
      vectorStore: 'chroma',
      maxTokens: 1000,
    },
  },
  summary: {
    label: 'Summary Memory',
    description: 'Compressed conversation summaries',
    icon: FileText,
    colorClass: 'bg-green-500',
    defaultConfig: {
      type: 'summary' as const,
      summaryPrompt: 'Summarize the conversation',
      maxTokens: 500,
    },
  },
  entity: {
    label: 'Entity Memory',
    description: 'Track specific entities and facts',
    icon: Users,
    colorClass: 'bg-orange-500',
    defaultConfig: {
      type: 'entity' as const,
      entityTypes: ['person', 'organization', 'location'],
    },
  },
} as const

const MemoryNode = memo(function MemoryNode({ id, data, selected }: NodeProps<MemoryNodeData>) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { updateStep } = useWorkflowBuilderStore()

  // Local state for form inputs to prevent re-renders (following ProviderNode pattern)
  const [localBufferSize, setLocalBufferSize] = useState(10)
  const [localSummaryPrompt, setLocalSummaryPrompt] = useState('')
  const [localMaxTokens, setLocalMaxTokens] = useState(1000)
  const [localVectorStore, setLocalVectorStore] = useState('chroma')

  // Merge with data prop (memoized to prevent unnecessary re-renders)
  const nodeData = useMemo(() => {
    const defaultNodeData: MemoryNodeData = {
      label: 'Memory Store',
      memoryType: 'buffer',
      config: {
        type: 'buffer',
        bufferSize: 10,
        returnMessages: true,
      },
    }

    return {
      ...defaultNodeData,
      ...(data || {}),
    }
  }, [data])

  const currentMemoryType = nodeData.memoryType || 'buffer'
  const memoryConfig = MEMORY_TYPES[currentMemoryType]

  // Memoize config to prevent dependency changes in useCallback
  const config = useMemo(() => {
    return (
      nodeData.config || {
        type: 'buffer' as const,
        bufferSize: 10,
        returnMessages: true,
        summaryPrompt: undefined,
        vectorStore: undefined,
        entityTypes: undefined,
        maxTokens: undefined,
      }
    )
  }, [nodeData.config])

  // Initialize local state from config
  useEffect(() => {
    setLocalBufferSize(config.bufferSize || 10)
    setLocalSummaryPrompt(config.summaryPrompt || '')
    setLocalMaxTokens(config.maxTokens || 1000)
    setLocalVectorStore(config.vectorStore || 'chroma')
  }, [config.bufferSize, config.summaryPrompt, config.maxTokens, config.vectorStore])

  // Debounced update to prevent re-renders during typing (following ProviderNode pattern)
  const debouncedUpdateStep = useCallback(
    (updates: Partial<MemoryConfig>) => {
      const timeoutId = setTimeout(() => {
        const newConfig = { ...config, ...updates }
        const nodeUpdate: ExtendedStepDefinition = {
          ...nodeData,
          config: newConfig,
        }
        updateStep(id, nodeUpdate as unknown as Partial<WorkflowStepDefinition>)
      }, 300) // 300ms debounce

      return () => clearTimeout(timeoutId)
    },
    [config, nodeData, id, updateStep]
  )

  // Handle configuration updates with local state
  const handleConfigUpdate = useCallback(
    (updates: Partial<MemoryConfig>) => {
      // Update local state immediately for responsive UI
      if ('bufferSize' in updates) setLocalBufferSize(updates.bufferSize || 10)
      if ('summaryPrompt' in updates) setLocalSummaryPrompt(updates.summaryPrompt || '')
      if ('maxTokens' in updates) setLocalMaxTokens(updates.maxTokens || 1000)
      if ('vectorStore' in updates) setLocalVectorStore(updates.vectorStore || 'chroma')

      // Debounce the actual store update
      debouncedUpdateStep(updates)
    },
    [debouncedUpdateStep]
  )

  const handleMemoryTypeChange = (memoryType: MemoryConfig['type']) => {
    const newConfig = MEMORY_TYPES[memoryType].defaultConfig as MemoryConfig

    const nodeUpdate: ExtendedStepDefinition = {
      ...nodeData,
      memoryType,
      config: newConfig,
    }

    updateStep(id, nodeUpdate as unknown as Partial<WorkflowStepDefinition>)
  }

  return (
    <div
      className={`
        relative bg-card border-2 rounded-lg shadow-sm min-w-[240px] max-w-[320px]
        ${selected ? 'border-primary shadow-md' : 'border-border'}
        transition-all duration-200
      `}
    >
      {/* Input handle - connects from other nodes */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="w-3 h-3 border-2 border-background"
        style={{ background: memoryConfig.colorClass.replace('bg-', '#') }}
      />

      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-t-lg border-b">
        <div className="flex items-center gap-2">
          <div className={`${memoryConfig.colorClass} p-1.5 rounded-md text-white`}>
            <memoryConfig.icon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-medium">{memoryConfig.label}</div>
            <div className="text-xs text-muted-foreground">Memory</div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-6 w-6 p-0"
        >
          {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </Button>
      </div>

      {/* Configuration panel */}
      {isExpanded && (
        <div
          className="p-3 space-y-3"
          data-no-drag="true"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{ pointerEvents: 'auto', userSelect: 'text' }}
        >
          {/* Memory Type Selection */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Memory Type</Label>
            <select
              id={`${id}-memory-type`}
              name="memoryType"
              value={currentMemoryType}
              onChange={(e) =>
                handleMemoryTypeChange(e.target.value as 'buffer' | 'vector' | 'summary' | 'entity')
              }
              className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ pointerEvents: 'auto', userSelect: 'text' }}
            >
              {Object.entries(MEMORY_TYPES).map(([key, memType]) => (
                <option key={key} value={key}>
                  {memType.label}
                </option>
              ))}
            </select>
          </div>

          {/* Type-specific configuration */}
          {currentMemoryType === 'buffer' && (
            <div className="space-y-1">
              <Label className="text-xs font-medium">Buffer Size</Label>
              <input
                id={`${id}-buffer-size`}
                name="bufferSize"
                type="number"
                min="1"
                max="100"
                value={localBufferSize}
                onChange={(e) => handleConfigUpdate({ bufferSize: parseInt(e.target.value) || 10 })}
                className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ pointerEvents: 'auto', userSelect: 'text' }}
              />
            </div>
          )}

          {currentMemoryType === 'summary' && (
            <div className="space-y-1">
              <Label className="text-xs font-medium">Summary Prompt</Label>
              <textarea
                id={`${id}-summary-prompt`}
                name="summaryPrompt"
                placeholder="Summarize the conversation"
                value={localSummaryPrompt}
                onChange={(e) => handleConfigUpdate({ summaryPrompt: e.target.value })}
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ pointerEvents: 'auto', userSelect: 'text' }}
              />
            </div>
          )}

          {currentMemoryType === 'vector' && (
            <div className="space-y-1">
              <Label className="text-xs font-medium">Vector Store</Label>
              <select
                id={`${id}-vector-store`}
                name="vectorStore"
                value={localVectorStore}
                onChange={(e) => handleConfigUpdate({ vectorStore: e.target.value })}
                className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ pointerEvents: 'auto', userSelect: 'text' }}
              >
                <option value="chroma">Chroma</option>
                <option value="pinecone">Pinecone</option>
                <option value="weaviate">Weaviate</option>
                <option value="faiss">FAISS</option>
              </select>
            </div>
          )}

          {/* Max Tokens (for summary and vector) */}
          {(currentMemoryType === 'summary' || currentMemoryType === 'vector') && (
            <div className="space-y-1">
              <Label className="text-xs font-medium">Max Tokens</Label>
              <input
                id={`${id}-max-tokens`}
                name="maxTokens"
                type="number"
                min="100"
                max="4000"
                value={localMaxTokens}
                onChange={(e) =>
                  handleConfigUpdate({ maxTokens: parseInt(e.target.value) || 1000 })
                }
                className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ pointerEvents: 'auto', userSelect: 'text' }}
              />
            </div>
          )}
        </div>
      )}

      {/* Summary when collapsed */}
      {!isExpanded && (
        <div className="p-3">
          <div className="text-xs text-muted-foreground">
            {currentMemoryType === 'buffer' && `Buffer: ${config.bufferSize || 10} messages`}
            {currentMemoryType === 'summary' && 'Conversation summaries'}
            {currentMemoryType === 'vector' && `Vector: ${config.vectorStore || 'chroma'}`}
            {currentMemoryType === 'entity' && 'Entity tracking'}
          </div>
        </div>
      )}

      {/* Output Handle - Right side to connect to other nodes */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="w-3 h-3 border-2 border-background"
        style={{ background: memoryConfig.colorClass.replace('bg-', '#') }}
      />
    </div>
  )
})

export default MemoryNode
