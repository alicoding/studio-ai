/**
 * ToolsNode - LangChain Tools configuration node (Function, API, Code, MCP)
 *
 * SOLID: Single responsibility - Tools configuration only
 * DRY: Reuses ProviderNode patterns and UI components
 * KISS: Simple tool type selection and configuration interface
 * Library-First: Uses LangChain tools, React Flow, Lucide icons, shadcn/ui components
 */

import { Handle, Position, NodeProps } from 'reactflow'
import { Settings, Globe, Code, Zap, ChevronDown, ChevronRight } from 'lucide-react'
import { useState, useCallback, useEffect, memo, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useWorkflowBuilderStore } from '@/stores/workflowBuilder'
import type { WorkflowStepDefinition } from '../../../../web/server/schemas/workflow-builder'

// Extended step definition that includes tools config
interface ExtendedStepDefinition {
  toolsType?: string
  config?: ToolsConfig | Record<string, unknown>
  [key: string]: unknown
}

// LangChain tools configuration interface
interface ToolsConfig {
  type: 'function' | 'api' | 'code' | 'mcp'
  name?: string
  description?: string
  functionCode?: string
  apiEndpoint?: string
  apiMethod?: string
  apiHeaders?: Record<string, string>
  codeLanguage?: string
  mcpServer?: string
  parameters?: Record<string, unknown>
}

// Tools node data interface
interface ToolsNodeData {
  label: string
  toolsType?: ToolsConfig['type']
  config?: ToolsConfig
}

// LangChain tool types (following existing patterns)
const TOOLS_TYPES = {
  function: {
    label: 'Function Call',
    description: 'Custom function with parameters',
    icon: Settings,
    colorClass: 'bg-blue-500',
    defaultConfig: {
      type: 'function' as const,
      name: 'custom_function',
      description: 'A custom function',
      functionCode: '',
      parameters: {},
    },
  },
  api: {
    label: 'API Integration',
    description: 'REST/GraphQL API calls',
    icon: Globe,
    colorClass: 'bg-green-500',
    defaultConfig: {
      type: 'api' as const,
      name: 'api_call',
      description: 'API integration',
      apiEndpoint: '',
      apiMethod: 'GET',
      apiHeaders: {},
    },
  },
  code: {
    label: 'Code Execution',
    description: 'Python/JavaScript execution',
    icon: Code,
    colorClass: 'bg-orange-500',
    defaultConfig: {
      type: 'code' as const,
      name: 'code_execution',
      description: 'Execute code',
      codeLanguage: 'python',
      functionCode: '',
    },
  },
  mcp: {
    label: 'MCP Tools',
    description: 'Model Context Protocol integration',
    icon: Zap,
    colorClass: 'bg-purple-500',
    defaultConfig: {
      type: 'mcp' as const,
      name: 'mcp_tool',
      description: 'MCP server integration',
      mcpServer: '',
      parameters: {},
    },
  },
} as const

const ToolsNode = memo(function ToolsNode({ id, data, selected }: NodeProps<ToolsNodeData>) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { updateStep } = useWorkflowBuilderStore()

  // Local state for form inputs to prevent re-renders (following ProviderNode pattern)
  const [localName, setLocalName] = useState('')
  const [localDescription, setLocalDescription] = useState('')
  const [localApiEndpoint, setLocalApiEndpoint] = useState('')
  const [localFunctionCode, setLocalFunctionCode] = useState('')

  // Merge with data prop (memoized to prevent unnecessary re-renders)
  const nodeData = useMemo(() => {
    const defaultNodeData: ToolsNodeData = {
      label: 'Tools',
      toolsType: 'function',
      config: {
        type: 'function',
        name: 'custom_function',
        description: 'A custom function',
        functionCode: '',
        parameters: {},
      },
    }

    return {
      ...defaultNodeData,
      ...(data || {}),
    }
  }, [data])

  const currentToolsType = nodeData.toolsType || 'function'
  const toolsConfig = TOOLS_TYPES[currentToolsType]

  // Memoize config to prevent dependency changes in useCallback
  const config = useMemo(() => {
    return (
      nodeData.config || {
        type: 'function' as const,
        name: 'custom_function',
        description: 'A custom function',
        functionCode: '',
        parameters: {},
        apiEndpoint: undefined,
        apiMethod: undefined,
        apiHeaders: undefined,
        codeLanguage: undefined,
        mcpServer: undefined,
      }
    )
  }, [nodeData.config])

  // Initialize local state from config
  useEffect(() => {
    setLocalName(config.name || '')
    setLocalDescription(config.description || '')
    setLocalApiEndpoint(config.apiEndpoint || '')
    setLocalFunctionCode(config.functionCode || '')
  }, [config.name, config.description, config.apiEndpoint, config.functionCode])

  // Debounced update to prevent re-renders during typing (following ProviderNode pattern)
  const debouncedUpdateStep = useCallback(
    (updates: Partial<ToolsConfig>) => {
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
    (updates: Partial<ToolsConfig>) => {
      // Update local state immediately for responsive UI
      if ('name' in updates) setLocalName(updates.name || '')
      if ('description' in updates) setLocalDescription(updates.description || '')
      if ('apiEndpoint' in updates) setLocalApiEndpoint(updates.apiEndpoint || '')
      if ('functionCode' in updates) setLocalFunctionCode(updates.functionCode || '')

      // Debounce the actual store update
      debouncedUpdateStep(updates)
    },
    [debouncedUpdateStep]
  )

  const handleToolsTypeChange = (toolsType: ToolsConfig['type']) => {
    const newConfig = TOOLS_TYPES[toolsType].defaultConfig as ToolsConfig

    const nodeUpdate: ExtendedStepDefinition = {
      ...nodeData,
      toolsType,
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
        style={{ background: toolsConfig.colorClass.replace('bg-', '#') }}
      />

      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-t-lg border-b">
        <div className="flex items-center gap-2">
          <div className={`${toolsConfig.colorClass} p-1.5 rounded-md text-white`}>
            <toolsConfig.icon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-medium">{toolsConfig.label}</div>
            <div className="text-xs text-muted-foreground">Tools</div>
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
          {/* Tool Type Selection */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Tool Type</Label>
            <select
              id={`${id}-tool-type`}
              name="toolType"
              value={currentToolsType}
              onChange={(e) =>
                handleToolsTypeChange(e.target.value as 'function' | 'api' | 'code' | 'mcp')
              }
              className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ pointerEvents: 'auto', userSelect: 'text' }}
            >
              {Object.entries(TOOLS_TYPES).map(([key, toolType]) => (
                <option key={key} value={key}>
                  {toolType.label}
                </option>
              ))}
            </select>
          </div>

          {/* Common fields */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Tool Name</Label>
            <input
              id={`${id}-tool-name`}
              name="toolName"
              type="text"
              placeholder="Enter tool name"
              value={localName}
              onChange={(e) => handleConfigUpdate({ name: e.target.value })}
              className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ pointerEvents: 'auto', userSelect: 'text' }}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-medium">Description</Label>
            <input
              id={`${id}-tool-description`}
              name="toolDescription"
              type="text"
              placeholder="Describe what this tool does"
              value={localDescription}
              onChange={(e) => handleConfigUpdate({ description: e.target.value })}
              className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ pointerEvents: 'auto', userSelect: 'text' }}
            />
          </div>

          {/* Type-specific configuration */}
          {currentToolsType === 'api' && (
            <>
              <div className="space-y-1">
                <Label className="text-xs font-medium">API Endpoint</Label>
                <input
                  id={`${id}-api-endpoint`}
                  name="apiEndpoint"
                  type="url"
                  placeholder="https://api.example.com/endpoint"
                  value={localApiEndpoint}
                  onChange={(e) => handleConfigUpdate({ apiEndpoint: e.target.value })}
                  className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ pointerEvents: 'auto', userSelect: 'text' }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">HTTP Method</Label>
                <select
                  id={`${id}-api-method`}
                  name="apiMethod"
                  value={config.apiMethod || 'GET'}
                  onChange={(e) => handleConfigUpdate({ apiMethod: e.target.value })}
                  className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ pointerEvents: 'auto', userSelect: 'text' }}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                </select>
              </div>
            </>
          )}

          {(currentToolsType === 'function' || currentToolsType === 'code') && (
            <div className="space-y-1">
              <Label className="text-xs font-medium">
                {currentToolsType === 'code' ? 'Code' : 'Function Code'}
              </Label>
              <textarea
                id={`${id}-function-code`}
                name="functionCode"
                placeholder={
                  currentToolsType === 'code'
                    ? 'Enter your code here'
                    : 'def my_function(param1, param2):\n    return param1 + param2'
                }
                value={localFunctionCode}
                onChange={(e) => handleConfigUpdate({ functionCode: e.target.value })}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                style={{ pointerEvents: 'auto', userSelect: 'text' }}
              />
            </div>
          )}

          {currentToolsType === 'code' && (
            <div className="space-y-1">
              <Label className="text-xs font-medium">Language</Label>
              <select
                id={`${id}-code-language`}
                name="codeLanguage"
                value={config.codeLanguage || 'python'}
                onChange={(e) => handleConfigUpdate({ codeLanguage: e.target.value })}
                className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ pointerEvents: 'auto', userSelect: 'text' }}
              >
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="bash">Bash</option>
              </select>
            </div>
          )}

          {currentToolsType === 'mcp' && (
            <div className="space-y-1">
              <Label className="text-xs font-medium">MCP Server</Label>
              <input
                id={`${id}-mcp-server`}
                name="mcpServer"
                type="text"
                placeholder="mcp-server-name"
                value={config.mcpServer || ''}
                onChange={(e) => handleConfigUpdate({ mcpServer: e.target.value })}
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
            {config.name || 'Configure tool settings'}
          </div>
        </div>
      )}

      {/* Output Handle - Right side to connect to other nodes */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="w-3 h-3 border-2 border-background"
        style={{ background: toolsConfig.colorClass.replace('bg-', '#') }}
      />
    </div>
  )
})

export default ToolsNode
