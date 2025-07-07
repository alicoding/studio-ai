/**
 * Operator Settings Component
 * 
 * SOLID: Single responsibility - operator configuration UI
 * DRY: Reuses common UI components
 * KISS: Simple form for operator settings
 * Library-First: Uses React Hook Form and existing UI components
 */

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Save, RotateCcw, Play } from 'lucide-react'
import { useOperatorConfig } from '@/hooks/useOperatorConfig'
import { toast } from 'sonner'
import { ModelSelector } from '@/components/ui/model-selector'

interface OperatorConfig {
  model: string
  systemPrompt: string
  temperature: number
  maxTokens: number
  apiKey?: string
  baseURL?: string
}

export function OperatorSettings() {
  const { config, isLoading, updateConfig, resetConfig, testOperator } = useOperatorConfig()
  const [isSaving, setIsSaving] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [allModelIds, setAllModelIds] = useState<string[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty }
  } = useForm<OperatorConfig>()

  // Load config into form
  useEffect(() => {
    if (config) {
      reset(config)
    }
  }, [config, reset])

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
        const models = data.body?.data || data.data || []
        
        // Extract all model IDs for the fuzzy search selector
        const allIds = models.map((model: { id: string }) => model.id)
        
        setAllModelIds(allIds)
      } catch (error) {
        console.error('Failed to fetch models:', error)
      } finally {
        setLoadingModels(false)
      }
    }
    
    fetchModels()
  }, [])

  const onSubmit = async (data: OperatorConfig) => {
    setIsSaving(true)
    try {
      await updateConfig(data)
      toast.success('Operator configuration saved')
    } catch (error) {
      toast.error('Failed to save configuration')
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = async () => {
    setIsResetting(true)
    try {
      const defaultConfig = await resetConfig()
      reset(defaultConfig)
      toast.success('Reset to default configuration')
    } catch (error) {
      toast.error('Failed to reset configuration')
      console.error(error)
    } finally {
      setIsResetting(false)
    }
  }

  const handleTest = async () => {
    setIsTesting(true)
    setTestResult(null)
    try {
      const result = await testOperator('Task completed successfully. The function has been implemented.')
      setTestResult(`Status: ${result.status}${result.reason ? ` - ${result.reason}` : ''}`)
    } catch (error) {
      setTestResult('Error: Failed to test operator')
      console.error(error)
    } finally {
      setIsTesting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Operator Configuration</CardTitle>
        <CardDescription>
          Configure the AI operator that determines workflow step status (success/blocked/failed)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <ModelSelector
              models={allModelIds}
              value={watch('model')}
              onChange={(value) => setValue('model', value, { shouldDirty: true })}
              loading={loadingModels}
              disabled={loadingModels}
              placeholder="Select a model"
            />
            {errors.model && (
              <p className="text-sm text-destructive">{errors.model.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="systemPrompt">System Prompt</Label>
            <Textarea
              id="systemPrompt"
              {...register('systemPrompt', { required: 'System prompt is required' })}
              rows={10}
              className="font-mono text-sm"
              placeholder="Enter the system prompt for status detection..."
            />
            {errors.systemPrompt && (
              <p className="text-sm text-destructive">{errors.systemPrompt.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="temperature">Temperature</Label>
            <Input
              id="temperature"
              type="number"
              {...register('temperature', { 
                required: 'Temperature is required',
                min: { value: 0, message: 'Temperature must be at least 0' },
                max: { value: 2, message: 'Temperature must be at most 2' }
              })}
              step="0.1"
              placeholder="0.0 - 2.0"
            />
            {errors.temperature && (
              <p className="text-sm text-destructive">{errors.temperature.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxTokens">Max Tokens</Label>
            <Input
              id="maxTokens"
              type="number"
              {...register('maxTokens', { 
                required: 'Max tokens is required',
                min: { value: 1, message: 'Max tokens must be at least 1' },
                max: { value: 1000, message: 'Max tokens must be at most 1000' }
              })}
              placeholder="1 - 1000"
            />
            {errors.maxTokens && (
              <p className="text-sm text-destructive">{errors.maxTokens.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key (Optional)</Label>
            <Input
              id="apiKey"
              type="password"
              {...register('apiKey')}
              placeholder="Leave empty to use environment variable"
            />
            <p className="text-sm text-muted-foreground">
              Defaults to ELECTRONHUB_API_KEY if not specified
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="baseURL">Base URL (Optional)</Label>
            <Input
              id="baseURL"
              {...register('baseURL')}
              placeholder="https://api.electronhub.ai/v1"
            />
          </div>

          {testResult && (
            <Alert>
              <AlertDescription>{testResult}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={!isDirty || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={isResetting}
            >
              {isResetting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset to Default
                </>
              )}
            </Button>
            
            <Button
              type="button"
              variant="secondary"
              onClick={handleTest}
              disabled={isTesting}
            >
              {isTesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Test Operator
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}