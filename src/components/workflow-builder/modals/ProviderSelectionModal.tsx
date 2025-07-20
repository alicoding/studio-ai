/**
 * ProviderSelectionModal - Modal for selecting which AI provider to add as a canvas node
 *
 * SOLID: Single responsibility - provider type selection only
 * DRY: Reuses shadcn/ui Dialog components
 * KISS: Simple grid layout with provider cards
 * Library-First: Uses shadcn/ui Dialog, existing icons from Lucide
 */

import { Bot, Brain, Sparkles } from 'lucide-react'

// Provider options for canvas node creation
const PROVIDER_OPTIONS = [
  {
    id: 'openai' as const,
    name: 'OpenAI',
    description: 'GPT models - Fast and cost-effective',
    icon: Bot,
    colorClass: 'bg-green-500',
  },
  {
    id: 'anthropic' as const,
    name: 'Anthropic',
    description: 'Claude models - Advanced reasoning',
    icon: Brain,
    colorClass: 'bg-orange-500',
  },
  {
    id: 'azure' as const,
    name: 'Azure OpenAI',
    description: 'Enterprise OpenAI via Azure',
    icon: Bot,
    colorClass: 'bg-blue-500',
  },
  {
    id: 'google' as const,
    name: 'Google AI',
    description: 'Gemini models - Multimodal capabilities',
    icon: Sparkles,
    colorClass: 'bg-purple-500',
  },
] as const

interface ProviderSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onProviderSelect: (providerType: string) => void
}

export default function ProviderSelectionModal({
  isOpen,
  onClose,
  onProviderSelect,
}: ProviderSelectionModalProps) {
  console.log('🎭 ProviderSelectionModal render - isOpen:', isOpen)

  const handleProviderSelect = (providerId: string) => {
    console.log('✅ Provider selected in modal:', providerId)
    console.log('🔄 Calling onProviderSelect callback...')
    onProviderSelect(providerId)
    console.log('🚪 Closing modal...')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-lg border shadow-lg p-6 max-w-md w-full mx-4">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Add AI Provider</h2>
          <p className="text-sm text-gray-600 mt-1">
            Choose an AI provider to add to your workflow. The provider node will be connected to
            your AI task.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 py-4">
          {PROVIDER_OPTIONS.map((provider) => {
            const IconComponent = provider.icon

            return (
              <button
                key={provider.id}
                onClick={() => handleProviderSelect(provider.id)}
                className="flex flex-col items-center gap-3 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors group"
              >
                <div
                  className={`${provider.colorClass} p-3 rounded-lg text-white group-hover:scale-105 transition-transform`}
                >
                  <IconComponent className="w-6 h-6" />
                </div>

                <div className="text-center">
                  <div className="font-medium text-sm">{provider.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{provider.description}</div>
                </div>
              </button>
            )
          })}
        </div>

        <div className="pt-4 border-t">
          <div className="text-xs text-gray-500 text-center">
            💡 Click a provider to add it as a connected node
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
