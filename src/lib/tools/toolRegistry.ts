/**
 * Tool Registry - Central configuration for all Claude Code tools
 * Based on official Claude Code documentation
 */

export interface ToolDefinition {
  id: string
  name: string
  description: string
  requiresPermission: boolean
  category: 'file' | 'execution' | 'search' | 'utility' | 'mcp'
  icon?: string
}

export const CLAUDE_CODE_TOOLS: ToolDefinition[] = [
  // File Operations
  {
    id: 'read',
    name: 'Read',
    description: 'Reads the contents of files',
    requiresPermission: false,
    category: 'file',
  },
  {
    id: 'write',
    name: 'Write',
    description: 'Writes content to files',
    requiresPermission: true,
    category: 'file',
  },
  {
    id: 'edit',
    name: 'Edit',
    description: 'Makes targeted edits to specific files',
    requiresPermission: true,
    category: 'file',
  },
  {
    id: 'multiedit',
    name: 'MultiEdit',
    description: 'Performs multiple edits on a single file atomically',
    requiresPermission: true,
    category: 'file',
  },
  {
    id: 'notebookread',
    name: 'NotebookRead',
    description: 'Reads and displays Jupyter notebook contents',
    requiresPermission: false,
    category: 'file',
  },
  {
    id: 'notebookedit',
    name: 'NotebookEdit',
    description: 'Modifies Jupyter notebook cells',
    requiresPermission: true,
    category: 'file',
  },
  
  // Search Operations
  {
    id: 'glob',
    name: 'Glob',
    description: 'Finds files based on pattern matching',
    requiresPermission: false,
    category: 'search',
  },
  {
    id: 'grep',
    name: 'Grep',
    description: 'Searches for patterns in file contents',
    requiresPermission: false,
    category: 'search',
  },
  {
    id: 'ls',
    name: 'LS',
    description: 'Lists files and directories',
    requiresPermission: false,
    category: 'search',
  },
  
  // Execution
  {
    id: 'bash',
    name: 'Bash',
    description: 'Executes shell commands in your environment',
    requiresPermission: true,
    category: 'execution',
  },
  {
    id: 'agent',
    name: 'Agent',
    description: 'Runs a sub-agent to handle complex, multi-step tasks',
    requiresPermission: false,
    category: 'execution',
  },
  {
    id: 'exit_plan_mode',
    name: 'Exit Plan Mode',
    description: 'Exits plan mode and starts implementation',
    requiresPermission: false,
    category: 'execution',
  },
  
  // Utility
  {
    id: 'todoread',
    name: 'TodoRead',
    description: 'Reads the current session\'s task list',
    requiresPermission: false,
    category: 'utility',
  },
  {
    id: 'todowrite',
    name: 'TodoWrite',
    description: 'Updates the session\'s task list',
    requiresPermission: false,
    category: 'utility',
  },
  {
    id: 'webfetch',
    name: 'WebFetch',
    description: 'Fetches and processes web content',
    requiresPermission: true,
    category: 'utility',
  },
  {
    id: 'websearch',
    name: 'WebSearch',
    description: 'Searches the web for information',
    requiresPermission: true,
    category: 'utility',
  },
  
  // MCP Tools (Model Context Protocol)
  {
    id: 'ListMcpResourcesTool',
    name: 'List MCP Resources',
    description: 'Lists available resources from configured MCP servers',
    requiresPermission: false,
    category: 'mcp',
  },
  {
    id: 'ReadMcpResourceTool',
    name: 'Read MCP Resource',
    description: 'Reads a specific resource from an MCP server',
    requiresPermission: false,
    category: 'mcp',
  },
]

// MCP tools can be dynamically added based on connected servers
export interface MCPTool extends ToolDefinition {
  server: string
  toolName: string
}

export class ToolRegistry {
  private static instance: ToolRegistry
  private mcpTools: Map<string, MCPTool> = new Map()
  
  static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry()
    }
    return ToolRegistry.instance
  }
  
  getAllTools(): ToolDefinition[] {
    return [...CLAUDE_CODE_TOOLS, ...this.mcpTools.values()]
  }
  
  getToolsByCategory(category: string): ToolDefinition[] {
    return this.getAllTools().filter(tool => tool.category === category)
  }
  
  getToolById(id: string): ToolDefinition | undefined {
    return this.getAllTools().find(tool => tool.id === id)
  }
  
  // For MCP tools
  registerMCPTool(server: string, toolName: string, description: string): void {
    const id = `mcp__${server}__${toolName}`
    this.mcpTools.set(id, {
      id,
      name: `${server}:${toolName}`,
      description,
      requiresPermission: true,
      category: 'mcp',
      server,
      toolName,
    })
  }
  
  clearMCPTools(): void {
    this.mcpTools.clear()
  }
}

// Helper to get tool display name
export function getToolDisplayName(toolId: string): string {
  const tool = ToolRegistry.getInstance().getToolById(toolId)
  return tool?.name || toolId
}

// Helper to check if tool requires permission
export function toolRequiresPermission(toolId: string): boolean {
  const tool = ToolRegistry.getInstance().getToolById(toolId)
  return tool?.requiresPermission ?? true
}