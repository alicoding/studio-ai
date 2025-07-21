/**
 * MemorySelectionModal - Modal for selecting which memory type to add as a canvas node
 *
 * SOLID: Single responsibility - memory type selection only
 * DRY: Reuses ProviderSelectionModal pattern
 * KISS: Simple grid layout with memory cards
 * Library-First: Uses same pattern as ProviderSelectionModal
 */

import { Database, HardDrive, Brain, Users } from 'lucide-react'

// Memory options for canvas node creation (follows ProviderSelectionModal pattern)
const MEMORY_OPTIONS = [
  {
    id: 'buffer' as const,
    name: 'Buffer Memory',
    description: 'Store recent conversation messages',
    icon: HardDrive,
    colorClass: 'bg-blue-500',
  },
  {
    id: 'vector' as const,
    name: 'Vector Memory',
    description: 'Semantic search and retrieval',
    icon: Database,
    colorClass: 'bg-purple-500',
  },
  {
    id: 'summary' as const,
    name: 'Summary Memory',
    description: 'Condensed conversation summaries',
    icon: Brain,
    colorClass: 'bg-green-500',
  },
  {
    id: 'entity' as const,
    name: 'Entity Memory',
    description: 'Track entities and relationships',
    icon: Users,
    colorClass: 'bg-orange-500',
  },
] as const

interface MemorySelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onMemorySelect: (memoryType: string) => void
}

export default function MemorySelectionModal({
  isOpen,
  onClose,
  onMemorySelect,
}: MemorySelectionModalProps) {
  console.log('🧠 MemorySelectionModal render - isOpen:', isOpen)

  const handleMemorySelect = (memoryId: string) => {
    console.log('✅ Memory selected in modal:', memoryId)
    console.log('🔄 Calling onMemorySelect callback...')
    onMemorySelect(memoryId)
    console.log('🚪 Closing modal...')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-lg border shadow-lg p-6 max-w-md w-full mx-4">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Add Memory System</h2>
          <p className="text-sm text-gray-600 mt-1">
            Choose a memory type to add to your workflow. The memory node will be connected to your
            AI task for context management.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 py-4">
          {MEMORY_OPTIONS.map((memory) => {
            const IconComponent = memory.icon

            return (
              <button
                key={memory.id}
                onClick={() => handleMemorySelect(memory.id)}
                className="flex flex-col items-center gap-3 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors group"
              >
                <div
                  className={`${memory.colorClass} p-3 rounded-lg text-white group-hover:scale-105 transition-transform`}
                >
                  <IconComponent className="w-6 h-6" />
                </div>

                <div className="text-center">
                  <div className="font-medium text-sm">{memory.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{memory.description}</div>
                </div>
              </button>
            )
          })}
        </div>

        <div className="pt-4 border-t">
          <div className="text-xs text-gray-500 text-center">
            💡 Click a memory type to add it as a connected node
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
