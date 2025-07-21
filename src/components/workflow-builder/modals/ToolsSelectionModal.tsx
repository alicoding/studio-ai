/**
 * ToolsSelectionModal - Modal for selecting which tools type to add as a canvas node
 *
 * SOLID: Single responsibility - tools type selection only
 * DRY: Reuses ProviderSelectionModal pattern
 * KISS: Simple grid layout with tools cards
 * Library-First: Uses same pattern as ProviderSelectionModal
 */

import { Code, Globe, Wrench, Plug } from 'lucide-react'

// Tools options for canvas node creation (follows ProviderSelectionModal pattern)
const TOOLS_OPTIONS = [
  {
    id: 'function' as const,
    name: 'Function Calls',
    description: 'Custom function execution',
    icon: Code,
    colorClass: 'bg-blue-500',
  },
  {
    id: 'api' as const,
    name: 'API Tools',
    description: 'REST API integrations',
    icon: Globe,
    colorClass: 'bg-green-500',
  },
  {
    id: 'code' as const,
    name: 'Code Execution',
    description: 'Sandboxed code runtime',
    icon: Wrench,
    colorClass: 'bg-orange-500',
  },
  {
    id: 'mcp' as const,
    name: 'MCP Tools',
    description: 'Model Context Protocol tools',
    icon: Plug,
    colorClass: 'bg-purple-500',
  },
] as const

interface ToolsSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onToolsSelect: (toolsType: string) => void
}

export default function ToolsSelectionModal({
  isOpen,
  onClose,
  onToolsSelect,
}: ToolsSelectionModalProps) {
  console.log('🔧 ToolsSelectionModal render - isOpen:', isOpen)

  const handleToolsSelect = (toolsId: string) => {
    console.log('✅ Tools selected in modal:', toolsId)
    console.log('🔄 Calling onToolsSelect callback...')
    onToolsSelect(toolsId)
    console.log('🚪 Closing modal...')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-lg border shadow-lg p-6 max-w-md w-full mx-4">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Add Tools Integration</h2>
          <p className="text-sm text-gray-600 mt-1">
            Choose a tools type to add to your workflow. The tools node will be connected to your AI
            task for function calling and integrations.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 py-4">
          {TOOLS_OPTIONS.map((tools) => {
            const IconComponent = tools.icon

            return (
              <button
                key={tools.id}
                onClick={() => handleToolsSelect(tools.id)}
                className="flex flex-col items-center gap-3 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors group"
              >
                <div
                  className={`${tools.colorClass} p-3 rounded-lg text-white group-hover:scale-105 transition-transform`}
                >
                  <IconComponent className="w-6 h-6" />
                </div>

                <div className="text-center">
                  <div className="font-medium text-sm">{tools.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{tools.description}</div>
                </div>
              </button>
            )
          })}
        </div>

        <div className="pt-4 border-t">
          <div className="text-xs text-gray-500 text-center">
            💡 Click a tools type to add it as a connected node
          </div>
          <button
            onClick={onClose}
            className="mt-2 w-full text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
