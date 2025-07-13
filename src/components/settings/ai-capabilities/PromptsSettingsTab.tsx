/**
 * Prompts Settings Tab
 * 
 * SOLID: Single responsibility - prompt configuration
 * DRY: Reusable prompt editor
 * KISS: Simple prompt templates
 */

import { Label } from '../../ui/label'
import { Textarea } from '../../ui/textarea'
import { CapabilityConfig } from '../../../lib/ai/orchestration/capability-config'

interface PromptsSettingsTabProps {
  capability: CapabilityConfig
  onChange: (updates: Partial<CapabilityConfig>) => void
}

export function PromptsSettingsTab({ capability, onChange }: PromptsSettingsTabProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="system-prompt">System Prompt</Label>
        <Textarea
          id="system-prompt"
          value={capability.prompts.system}
          onChange={(e) => onChange({
            prompts: {
              ...capability.prompts,
              system: e.target.value
            }
          })}
          rows={8}
          className="font-mono text-sm"
          placeholder="You are a helpful AI assistant..."
        />
        <p className="text-xs text-muted-foreground mt-1">
          Available variables: {'{prompt}'}, {'{context}'}, {'{files}'}
        </p>
      </div>
      
      <div>
        <Label htmlFor="user-prompt">User Prompt Template</Label>
        <Textarea
          id="user-prompt"
          value={capability.prompts.user || ''}
          onChange={(e) => onChange({
            prompts: {
              ...capability.prompts,
              user: e.target.value
            }
          })}
          rows={4}
          className="font-mono text-sm"
          placeholder="Optional user prompt template..."
        />
      </div>
    </div>
  )
}