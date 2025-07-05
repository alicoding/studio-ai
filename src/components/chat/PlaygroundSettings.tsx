/**
 * Playground Settings Panel - AI model and prompt configuration
 * 
 * SOLID: Single responsibility - settings UI
 * KISS: Simple form controls
 */

import { useState, useEffect } from 'react'
import { Settings } from 'lucide-react'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { ModelSelector } from '../ui/model-selector'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog'
import { PlaygroundService } from '../../lib/ai/PlaygroundService'
import { usePlaygroundSettingsStore } from '../../stores/playgroundSettings'
import { toast } from 'sonner'

export function PlaygroundSettings() {
  const [isOpen, setIsOpen] = useState(false)
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  
  const { settings, updateSettings, resetToDefaults } = usePlaygroundSettingsStore()
  const { model, systemPrompt, temperature, maxTokens } = settings
  
  const playgroundService = PlaygroundService.getInstance()
  
  // Load available models when opened
  useEffect(() => {
    if (isOpen && availableModels.length === 0) {
      setLoadingModels(true)
      playgroundService.getModels()
        .then(models => {
          setAvailableModels(models)
          // Set default model if not set
          if (!model && models.length > 0) {
            // Use first available model as fallback only - don't hardcode specific models
            updateSettings({ model: models[0] }).catch(error => {
              console.error('Failed to set default model:', error)
              toast.error('Failed to set default model')
            })
          }
        })
        .catch(error => {
          console.error('Failed to load models:', error)
          toast.error('Failed to load models')
        })
        .finally(() => {
          setLoadingModels(false)
        })
    }
  }, [isOpen, availableModels.length, model, updateSettings, playgroundService])
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AI Playground Settings</DialogTitle>
          <DialogDescription>
            Configure model, prompt, and parameters for testing
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-6">
          {/* Model Selection */}
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <ModelSelector
              models={availableModels}
              value={model}
              onChange={(value) => updateSettings({ model: value })}
              disabled={loadingModels}
              loading={loadingModels}
              placeholder="Select model..."
            />
          </div>
          
          {/* System Prompt */}
          <div className="space-y-2">
            <Label htmlFor="systemPrompt">System Prompt</Label>
            <Textarea
              id="systemPrompt"
              value={systemPrompt}
              onChange={(e) => updateSettings({ systemPrompt: e.target.value })}
              placeholder="You are a helpful AI assistant..."
              className="min-h-[120px] resize-none"
            />
          </div>
          
          {/* Temperature */}
          <div className="space-y-2">
            <Label htmlFor="temperature">Temperature: {temperature}</Label>
            <Input
              id="temperature"
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={temperature}
              onChange={(e) => updateSettings({ temperature: parseFloat(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Focused</span>
              <span>Balanced</span>
              <span>Creative</span>
            </div>
          </div>
          
          {/* Max Tokens */}
          <div className="space-y-2">
            <Label htmlFor="maxTokens">Max Tokens</Label>
            <Input
              id="maxTokens"
              type="number"
              min="1"
              max="8000"
              value={maxTokens}
              onChange={(e) => updateSettings({ maxTokens: parseInt(e.target.value) || 2000 })}
            />
          </div>
          
          {/* Reset to Defaults */}
          <Button
            variant="outline"
            onClick={resetToDefaults}
            className="w-full"
          >
            Reset to Defaults
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}