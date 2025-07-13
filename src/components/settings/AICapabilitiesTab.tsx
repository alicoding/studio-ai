/**
 * AI Capabilities Configuration UI
 * 
 * SOLID: Orchestrates sub-components, delegates responsibilities
 * DRY: Reuses modular components
 * KISS: Simple container component
 * Library-First: Composes smaller components
 */

import { useState, useEffect } from 'react'
import { useCapabilityStore } from '../../lib/ai/orchestration/CapabilityManager'
import { CapabilityConfig } from '../../lib/ai/orchestration/capability-config'
import { Card } from '../ui/card'
import { CapabilityList } from './ai-capabilities/CapabilityList'
import { CapabilityEditor } from './ai-capabilities/CapabilityEditor'

export function AICapabilitiesTab() {
  const {
    capabilities,
    loadCapabilities,
    loadCapability,
    saveCapability,
    deleteCapability,
    resetToDefault,
    exportCapability,
    importCapability
  } = useCapabilityStore()
  
  const [selectedCapability, setSelectedCapability] = useState<string | null>(null)
  const [editingCapability, setEditingCapability] = useState<CapabilityConfig | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  // KISS: Load capabilities from server on mount (Single Source of Truth)
  useEffect(() => {
    loadCapabilities()
  }, [loadCapabilities])
  
  const allCapabilities = Object.values(capabilities)
  
  const handleEdit = (id: string) => {
    const cap = loadCapability(id)
    if (cap) {
      setEditingCapability({ ...cap })
      setSelectedCapability(id)
      setIsCreating(false)
    }
  }
  
  const handleSave = async () => {
    if (editingCapability) {
      try {
        await saveCapability(editingCapability)
        setEditingCapability(null)
        setIsCreating(false)
        setSelectedCapability(null)
      } catch (error) {
        console.error('Failed to save capability:', error)
        // TODO: Show error toast
      }
    }
  }
  
  const handleCreate = () => {
    const newCapability: CapabilityConfig = {
      id: `custom-${Date.now()}`,
      name: 'New Capability',
      description: 'Custom AI capability',
      category: 'custom',
      command: {
        enabled: false,
        trigger: '',
        aliases: [],
        description: ''
      },
      models: {
        primary: 'gpt-4o',
        selection: 'manual'
      },
      prompts: {
        system: 'You are a helpful AI assistant.',
        user: '{prompt}'
      },
      context: {
        includeFiles: false,
        includeProject: false,
        includeHistory: false
      },
      interaction: {
        allowFollowUp: true,
        maxTurns: 1
      },
      output: {
        format: 'text'
      },
      advanced: {
        temperature: 0.7
      },
      metadata: {
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      }
    }
    
    setEditingCapability(newCapability)
    setIsCreating(true)
  }
  
  const handleExport = (id: string) => {
    const json = exportCapability(id)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `capability-${id}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const text = await file.text()
      try {
        importCapability(text)
      } catch (error) {
        console.error('Failed to import capability:', error)
        // TODO: Show error toast
      }
    }
  }
  
  const handleChange = (updates: Partial<CapabilityConfig>) => {
    if (editingCapability) {
      setEditingCapability({ ...editingCapability, ...updates })
    }
  }
  
  const handleDelete = (id: string) => {
    deleteCapability(id)
    setEditingCapability(null)
    setIsCreating(false)
  }
  
  const handleCancel = () => {
    setEditingCapability(null)
    setIsCreating(false)
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">AI Capabilities</h3>
        <p className="text-sm text-muted-foreground">
          Configure and customize AI capabilities for your Studio agents
        </p>
      </div>
      
      <div className="grid grid-cols-12 gap-6">
        {/* Capability List */}
        <div className="col-span-4">
          <CapabilityList
            capabilities={allCapabilities}
            selectedId={selectedCapability}
            onSelect={handleEdit}
            onCreate={handleCreate}
            onImport={handleImport}
          />
        </div>
        
        {/* Capability Editor */}
        <div className="col-span-8">
          <CapabilityEditor
            capability={editingCapability}
            isCreating={isCreating}
            onSave={handleSave}
            onCancel={handleCancel}
            onExport={handleExport}
            onDelete={handleDelete}
            onReset={resetToDefault}
            onChange={handleChange}
          />
        </div>
      </div>
      
      {/* Test Capabilities */}
      <div className="mt-6">
        <Card className="p-4">
          <div className="text-center">
            <h4 className="text-sm font-medium mb-2">Test AI Capabilities</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Use the AI Playground (chat icon in bottom-right) to test your configured capabilities
            </p>
            <p className="text-xs text-muted-foreground">
              Capabilities with enabled commands can be triggered using their configured triggers
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}