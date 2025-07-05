/**
 * Orchestration Settings Tab
 * 
 * SOLID: Single responsibility - orchestration configuration UI
 * DRY: Reuses existing form components
 * KISS: Simple form with validation
 * Library First: Uses existing UI components and Zod validation
 * Configuration: All orchestration features configurable here
 */

import { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select } from '../ui/select'
import { Switch } from '../ui/switch'
import { Card } from '../ui/card'
import { Alert, AlertDescription } from '../ui/alert'
import { useOrchestrationSettings } from '../../hooks/useOrchestrationSettings'
import { OrchestrationConfigSchema, type OrchestrationConfig } from '../../../web/server/schemas/orchestration'
import { z } from 'zod'

interface OrchestrationTabProps {
  className?: string
}

export function OrchestrationTab({ className = '' }: OrchestrationTabProps) {
  const { settings, updateSettings, isLoading } = useOrchestrationSettings()
  const [config, setConfig] = useState<OrchestrationConfig>(() => ({
    defaults: {
      mentionTimeout: 30000,
      batchTimeout: 60000,
      maxBatchSize: 10,
      waitStrategy: 'all',
      maxConcurrentBatches: 5,
      responseCleanupInterval: 60000,
      maxPendingResponses: 100
    },
    projects: {},
    permissions: {
      crossProjectMentions: 'all',
      batchOperations: true,
      maxGlobalConcurrency: 20,
      requireExplicitWait: false,
      allowTimeoutOverride: true
    },
    rateLimit: {
      enabled: false,
      messagesPerMinute: 60,
      messagesPerHour: 600,
      burstSize: 10
    },
    enabled: true
  }))
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successMessage, setSuccessMessage] = useState<string>('')

  // Load existing configuration
  useEffect(() => {
    if (settings) {
      setConfig(settings)
    }
  }, [settings])

  // Validate configuration
  const validateConfig = (): boolean => {
    try {
      OrchestrationConfigSchema.parse(config)
      setErrors({})
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {}
        error.errors.forEach(err => {
          const path = err.path.join('.')
          newErrors[path] = err.message
        })
        setErrors(newErrors)
      }
      return false
    }
  }

  // Save configuration
  const handleSave = async () => {
    if (!validateConfig()) {
      return
    }

    try {
      await updateSettings(config)
      setSuccessMessage('Orchestration settings saved successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (_error) {
      setErrors({ save: 'Failed to save settings' })
    }
  }

  // Update nested config values
  const updateDefaults = (key: keyof OrchestrationConfig['defaults'], value: unknown) => {
    setConfig(prev => ({
      ...prev,
      defaults: {
        ...prev.defaults,
        [key]: value
      }
    }))
  }

  const updatePermissions = (key: keyof OrchestrationConfig['permissions'], value: unknown) => {
    setConfig(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: value
      }
    }))
  }

  const updateRateLimit = (key: keyof OrchestrationConfig['rateLimit'], value: unknown) => {
    setConfig(prev => ({
      ...prev,
      rateLimit: {
        ...prev.rateLimit,
        [key]: value
      }
    }))
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <h2 className="text-2xl font-bold">Orchestration Settings</h2>
        <p className="text-muted-foreground mt-1">
          Configure AI agent orchestration, batch operations, and cross-project routing
        </p>
      </div>

      {successMessage && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* Global Enable/Disable */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="enabled">Enable Orchestration Features</Label>
            <p className="text-sm text-muted-foreground mt-1">
              Master switch for all orchestration capabilities
            </p>
          </div>
          <Switch
            id="enabled"
            checked={config.enabled}
            onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enabled: checked }))}
          />
        </div>
      </Card>

      {/* Default Timeouts */}
      <Card className="p-6 space-y-4">
        <h3 className="text-lg font-semibold">Default Timeouts</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="mentionTimeout">Mention Timeout (ms)</Label>
            <Input
              id="mentionTimeout"
              type="number"
              value={config.defaults.mentionTimeout}
              onChange={(e) => updateDefaults('mentionTimeout', parseInt(e.target.value) || 30000)}
              min={1000}
              max={300000}
              disabled={!config.enabled}
            />
            {errors['defaults.mentionTimeout'] && (
              <p className="text-sm text-red-500 mt-1">{errors['defaults.mentionTimeout']}</p>
            )}
          </div>

          <div>
            <Label htmlFor="batchTimeout">Batch Timeout (ms)</Label>
            <Input
              id="batchTimeout"
              type="number"
              value={config.defaults.batchTimeout}
              onChange={(e) => updateDefaults('batchTimeout', parseInt(e.target.value) || 60000)}
              min={1000}
              max={600000}
              disabled={!config.enabled}
            />
            {errors['defaults.batchTimeout'] && (
              <p className="text-sm text-red-500 mt-1">{errors['defaults.batchTimeout']}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Batch Configuration */}
      <Card className="p-6 space-y-4">
        <h3 className="text-lg font-semibold">Batch Operations</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="batchOperations">Enable Batch Operations</Label>
              <p className="text-sm text-muted-foreground">
                Allow executing multiple agent messages in batches
              </p>
            </div>
            <Switch
              id="batchOperations"
              checked={config.permissions.batchOperations}
              onCheckedChange={(checked) => updatePermissions('batchOperations', checked)}
              disabled={!config.enabled}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="maxBatchSize">Max Batch Size</Label>
              <Input
                id="maxBatchSize"
                type="number"
                value={config.defaults.maxBatchSize}
                onChange={(e) => updateDefaults('maxBatchSize', parseInt(e.target.value) || 10)}
                min={1}
                max={100}
                disabled={!config.enabled || !config.permissions.batchOperations}
              />
            </div>

            <div>
              <Label htmlFor="waitStrategy">Default Wait Strategy</Label>
              <Select
                value={config.defaults.waitStrategy}
                onValueChange={(value: string) => updateDefaults('waitStrategy', value as 'all' | 'any' | 'none')}
                disabled={!config.enabled || !config.permissions.batchOperations}
              >
                <option value="all">Wait for All</option>
                <option value="any">Wait for Any</option>
                <option value="none">Fire and Forget</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="maxConcurrentBatches">Max Concurrent Batches</Label>
              <Input
                id="maxConcurrentBatches"
                type="number"
                value={config.defaults.maxConcurrentBatches}
                onChange={(e) => updateDefaults('maxConcurrentBatches', parseInt(e.target.value) || 5)}
                min={1}
                max={50}
                disabled={!config.enabled || !config.permissions.batchOperations}
              />
            </div>

            <div>
              <Label htmlFor="maxGlobalConcurrency">Max Global Concurrency</Label>
              <Input
                id="maxGlobalConcurrency"
                type="number"
                value={config.permissions.maxGlobalConcurrency}
                onChange={(e) => updatePermissions('maxGlobalConcurrency', parseInt(e.target.value) || 20)}
                min={1}
                max={100}
                disabled={!config.enabled}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Cross-Project Permissions */}
      <Card className="p-6 space-y-4">
        <h3 className="text-lg font-semibold">Cross-Project Routing</h3>
        
        <div>
          <Label htmlFor="crossProjectMentions">Cross-Project Mentions</Label>
          <Select
            value={config.permissions.crossProjectMentions}
            onValueChange={(value: string) => updatePermissions('crossProjectMentions', value as 'none' | 'all' | 'explicit')}
            disabled={!config.enabled}
          >
            <option value="none">Disabled - No cross-project access</option>
            <option value="explicit">Whitelist - Only configured projects</option>
            <option value="all">Auto - Allow all projects</option>
          </Select>
          <p className="text-sm text-muted-foreground mt-1">
            Controls how agents can mention agents in other projects
          </p>
        </div>
      </Card>

      {/* Response Tracking */}
      <Card className="p-6 space-y-4">
        <h3 className="text-lg font-semibold">Response Tracking</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="maxPendingResponses">Max Pending Responses</Label>
            <Input
              id="maxPendingResponses"
              type="number"
              value={config.defaults.maxPendingResponses}
              onChange={(e) => updateDefaults('maxPendingResponses', parseInt(e.target.value) || 100)}
              min={10}
              max={1000}
              disabled={!config.enabled}
            />
          </div>

          <div>
            <Label htmlFor="responseCleanupInterval">Cleanup Interval (ms)</Label>
            <Input
              id="responseCleanupInterval"
              type="number"
              value={config.defaults.responseCleanupInterval}
              onChange={(e) => updateDefaults('responseCleanupInterval', parseInt(e.target.value) || 60000)}
              min={10000}
              max={3600000}
              disabled={!config.enabled}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="requireExplicitWait">Require Explicit Wait</Label>
            <p className="text-sm text-muted-foreground">
              Mentions must explicitly set wait=true to wait for responses
            </p>
          </div>
          <Switch
            id="requireExplicitWait"
            checked={config.permissions.requireExplicitWait}
            onCheckedChange={(checked) => updatePermissions('requireExplicitWait', checked)}
            disabled={!config.enabled}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="allowTimeoutOverride">Allow Timeout Override</Label>
            <p className="text-sm text-muted-foreground">
              Allow per-request timeout overrides
            </p>
          </div>
          <Switch
            id="allowTimeoutOverride"
            checked={config.permissions.allowTimeoutOverride}
            onCheckedChange={(checked) => updatePermissions('allowTimeoutOverride', checked)}
            disabled={!config.enabled}
          />
        </div>
      </Card>

      {/* Rate Limiting */}
      <Card className="p-6 space-y-4">
        <h3 className="text-lg font-semibold">Rate Limiting</h3>
        
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="rateLimitEnabled">Enable Rate Limiting</Label>
            <p className="text-sm text-muted-foreground">
              Limit the number of orchestration operations
            </p>
          </div>
          <Switch
            id="rateLimitEnabled"
            checked={config.rateLimit.enabled}
            onCheckedChange={(checked) => updateRateLimit('enabled', checked)}
            disabled={!config.enabled}
          />
        </div>

        {config.rateLimit.enabled && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="messagesPerMinute">Messages Per Minute</Label>
              <Input
                id="messagesPerMinute"
                type="number"
                value={config.rateLimit.messagesPerMinute}
                onChange={(e) => updateRateLimit('messagesPerMinute', parseInt(e.target.value) || 60)}
                min={1}
                max={1000}
                disabled={!config.enabled}
              />
            </div>

            <div>
              <Label htmlFor="messagesPerHour">Messages Per Hour</Label>
              <Input
                id="messagesPerHour"
                type="number"
                value={config.rateLimit.messagesPerHour}
                onChange={(e) => updateRateLimit('messagesPerHour', parseInt(e.target.value) || 600)}
                min={1}
                max={10000}
                disabled={!config.enabled}
              />
            </div>

            <div>
              <Label htmlFor="burstSize">Burst Size</Label>
              <Input
                id="burstSize"
                type="number"
                value={config.rateLimit.burstSize}
                onChange={(e) => updateRateLimit('burstSize', parseInt(e.target.value) || 10)}
                min={1}
                max={100}
                disabled={!config.enabled}
              />
            </div>
          </div>
        )}
      </Card>

      {/* Save Button */}
      <div className="flex justify-end space-x-4">
        <Button
          variant="outline"
          onClick={() => {
            if (settings) {
              setConfig(settings)
              setErrors({})
            }
          }}
          disabled={isLoading}
        >
          Reset
        </Button>
        <Button
          onClick={handleSave}
          disabled={isLoading || !config.enabled}
        >
          {isLoading ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {errors.save && (
        <Alert variant="destructive">
          <AlertDescription>{errors.save}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}