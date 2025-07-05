/**
 * Models Settings Tab
 * 
 * SOLID: Single responsibility - model configuration
 * DRY: Shared model selection components
 * KISS: Simple model configuration
 * Library-First: Uses shadcn/ui components
 */

import { useState, useEffect } from 'react'
import { Label } from '../../ui/label'
import { Input } from '../../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { ModelSelector } from '../../ui/model-selector'
import { CapabilityConfig } from '../../../lib/ai/orchestration/capability-config'

interface AIModel {
  id: string
  object: string
  created?: number
  owned_by?: string
}

interface ModelsSettingsTabProps {
  capability: CapabilityConfig
  onChange: (updates: Partial<CapabilityConfig>) => void
}

export function ModelsSettingsTab({ capability, onChange }: ModelsSettingsTabProps) {
  const [allModelIds, setAllModelIds] = useState<string[]>([])
  const [loadingModels, setLoadingModels] = useState(false)

  // Fetch available models from server API
  useEffect(() => {
    const fetchModels = async () => {
      setLoadingModels(true)
      try {
        const response = await fetch('/api/ai/models')
        
        if (!response.ok) {
          throw new Error('Failed to fetch models')
        }
        
        const data = await response.json()
        // Handle the ElectronHub response format
        const models: AIModel[] = data.body?.data || data.data || []
        
        // Extract all model IDs for the fuzzy search selector
        const allIds = models.map((model: AIModel) => model.id)
        
        setAllModelIds(allIds)
      } catch (error) {
        console.error('Failed to fetch models:', error)
      } finally {
        setLoadingModels(false)
      }
    }
    
    fetchModels()
  }, [])

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="primary-model">Primary Model</Label>
        <ModelSelector
          models={allModelIds}
          value={capability.models.primary}
          onChange={(value) => onChange({
            models: {
              ...capability.models,
              primary: value
            }
          })}
          loading={loadingModels}
          disabled={loadingModels}
          placeholder="Select a model"
        />
      </div>
      
      <div>
        <Label htmlFor="fallback-models">Fallback Models</Label>
        <div className="space-y-2">
          <ModelSelector
            models={allModelIds}
            values={capability.models.fallback || []}
            onMultiChange={(values) => onChange({
              models: {
                ...capability.models,
                fallback: values
              }
            })}
            loading={loadingModels}
            disabled={loadingModels}
            multiSelect={true}
            placeholder="Select fallback models..."
          />
          <p className="text-xs text-muted-foreground">
            Select models to use as fallbacks if the primary model fails
          </p>
        </div>
      </div>
      
      <div>
        <Label htmlFor="model-selection">Model Selection Strategy</Label>
        <Select
          value={capability.models.selection || 'auto'}
          onValueChange={(value) => onChange({
            models: {
              ...capability.models,
              selection: value as 'auto' | 'manual' | 'cost-optimized' | 'performance'
            }
          })}
        >
          <SelectTrigger id="model-selection">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Auto (AI chooses)</SelectItem>
            <SelectItem value="manual">Manual (user chooses)</SelectItem>
            <SelectItem value="cost-optimized">Cost Optimized</SelectItem>
            <SelectItem value="performance">Performance First</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label>Context Options</Label>
        <div className="space-y-2 mt-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={capability.context?.includeFiles}
              onChange={(e) => onChange({
                context: {
                  ...capability.context,
                  includeFiles: e.target.checked
                }
              })}
            />
            <span className="text-sm">Include files in context</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={capability.context?.includeProject}
              onChange={(e) => onChange({
                context: {
                  ...capability.context,
                  includeProject: e.target.checked
                }
              })}
            />
            <span className="text-sm">Include project info</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={capability.context?.includeHistory}
              onChange={(e) => onChange({
                context: {
                  ...capability.context,
                  includeHistory: e.target.checked
                }
              })}
            />
            <span className="text-sm">Include conversation history</span>
          </label>
        </div>
        
        {capability.context?.includeHistory && (
          <div className="ml-6 mt-2">
            <Label htmlFor="max-history-turns">Max History Turns</Label>
            <Input
              id="max-history-turns"
              type="number"
              min="1"
              max="50"
              value={capability.context?.maxHistoryTurns || 10}
              onChange={(e) => onChange({
                context: {
                  ...capability.context,
                  maxHistoryTurns: parseInt(e.target.value)
                }
              })}
            />
          </div>
        )}
      </div>
    </div>
  )
}