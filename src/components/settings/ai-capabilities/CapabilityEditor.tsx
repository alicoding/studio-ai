/**
 * Capability Editor Component
 * 
 * SOLID: Orchestrates editing tabs but delegates to specific components
 * DRY: Centralizes editor logic
 * KISS: Simple tab-based interface
 * Library-First: Uses shadcn/ui components
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs'
import { Button } from '../../ui/button'
import { Save, Download, RefreshCw, Trash, Settings } from 'lucide-react'
import { CapabilityConfig } from '../../../lib/ai/orchestration/capability-config'
import { BasicSettingsTab } from './BasicSettingsTab'
import { CommandSettingsTab } from './CommandSettingsTab'
import { PromptsSettingsTab } from './PromptsSettingsTab'
import { ModelsSettingsTab } from './ModelsSettingsTab'
import { AdvancedSettingsTab } from './AdvancedSettingsTab'

interface CapabilityEditorProps {
  capability: CapabilityConfig | null
  isCreating: boolean
  onSave: () => void
  onCancel: () => void
  onExport: (id: string) => void
  onDelete: (id: string) => void
  onReset: (id: string) => void
  onChange: (updates: Partial<CapabilityConfig>) => void
}

export function CapabilityEditor({
  capability,
  isCreating,
  onSave,
  onCancel,
  onExport,
  onDelete,
  onReset,
  onChange
}: CapabilityEditorProps) {
  if (!capability) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-[600px] text-muted-foreground">
          <Settings className="h-12 w-12 mb-4" />
          <p>Select a capability to configure</p>
          <p className="text-sm mt-2">or create a new one</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>
              {isCreating ? 'Create Capability' : 'Edit Capability'}
            </CardTitle>
            <CardDescription>
              Configure prompts, models, and behavior
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {!isCreating && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onReset(capability.id)}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onExport(capability.id)}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDelete(capability.id)}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button size="sm" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button size="sm" onClick={onSave}>
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="basic">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="command">Command</TabsTrigger>
            <TabsTrigger value="prompts">Prompts</TabsTrigger>
            <TabsTrigger value="models">Models</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic" className="mt-4">
            <BasicSettingsTab
              capability={capability}
              isCreating={isCreating}
              onChange={onChange}
            />
          </TabsContent>
          
          <TabsContent value="command" className="mt-4">
            <CommandSettingsTab
              capability={capability}
              onChange={onChange}
            />
          </TabsContent>
          
          <TabsContent value="prompts" className="mt-4">
            <PromptsSettingsTab
              capability={capability}
              onChange={onChange}
            />
          </TabsContent>
          
          <TabsContent value="models" className="mt-4">
            <ModelsSettingsTab
              capability={capability}
              onChange={onChange}
            />
          </TabsContent>
          
          <TabsContent value="advanced" className="mt-4">
            <AdvancedSettingsTab
              capability={capability}
              onChange={onChange}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}