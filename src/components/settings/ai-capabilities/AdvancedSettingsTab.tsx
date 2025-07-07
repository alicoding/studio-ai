/**
 * Advanced Settings Tab
 * 
 * SOLID: Single responsibility - advanced configuration
 * DRY: Consistent numeric inputs and toggles
 * KISS: Grouped related settings
 */

import { Label } from '../../ui/label'
import { Input } from '../../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { CapabilityConfig } from '../../../lib/ai/orchestration/capability-config'

interface AdvancedSettingsTabProps {
  capability: CapabilityConfig
  onChange: (updates: Partial<CapabilityConfig>) => void
}

export function AdvancedSettingsTab({ capability, onChange }: AdvancedSettingsTabProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="temperature">Temperature</Label>
          <Input
            id="temperature"
            type="number"
            min="0"
            max="2"
            step="0.1"
            value={capability.advanced?.temperature || 0.7}
            onChange={(e) => onChange({
              advanced: {
                ...capability.advanced,
                temperature: parseFloat(e.target.value)
              }
            })}
          />
        </div>
        <div>
          <Label htmlFor="max-tokens">Max Tokens</Label>
          <Input
            id="max-tokens"
            type="number"
            value={capability.advanced?.maxTokens || 2000}
            onChange={(e) => onChange({
              advanced: {
                ...capability.advanced,
                maxTokens: parseInt(e.target.value)
              }
            })}
          />
        </div>
      </div>
      
      <div>
        <Label>Interaction Settings</Label>
        <div className="space-y-2 mt-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={capability.interaction?.allowFollowUp}
              onChange={(e) => onChange({
                interaction: {
                  ...capability.interaction,
                  allowFollowUp: e.target.checked
                }
              })}
            />
            <span className="text-sm">Allow follow-up questions</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={capability.interaction?.delegationEnabled}
              onChange={(e) => onChange({
                interaction: {
                  ...capability.interaction,
                  delegationEnabled: e.target.checked
                }
              })}
            />
            <span className="text-sm">Enable delegation to other capabilities</span>
          </label>
          
          {capability.interaction?.allowFollowUp && (
            <div className="ml-6 mt-2">
              <Label htmlFor="max-turns">Max Turns</Label>
              <Input
                id="max-turns"
                type="number"
                min="1"
                max="50"
                value={capability.interaction?.maxTurns || 1}
                onChange={(e) => onChange({
                  interaction: {
                    ...capability.interaction,
                    maxTurns: parseInt(e.target.value)
                  }
                })}
              />
            </div>
          )}
        </div>
      </div>
      
      <div>
        <Label htmlFor="output-format">Output Format</Label>
        <Select
          value={capability.output?.format || 'text'}
          onValueChange={(value) => onChange({
            output: {
              ...capability.output,
              format: value as 'text' | 'json' | 'markdown' | 'code'
            }
          })}
        >
          <SelectTrigger id="output-format">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Plain Text</SelectItem>
            <SelectItem value="markdown">Markdown</SelectItem>
            <SelectItem value="json">JSON</SelectItem>
            <SelectItem value="code">Code</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}