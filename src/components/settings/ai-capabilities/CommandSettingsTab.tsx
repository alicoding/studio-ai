/**
 * Command Settings Tab
 * 
 * SOLID: Single responsibility - command configuration
 * DRY: Consistent form patterns
 * KISS: Simple command setup
 */

import { Label } from '../../ui/label'
import { Input } from '../../ui/input'
import { Textarea } from '../../ui/textarea'
import { CapabilityConfig } from '../../../lib/ai/orchestration/capability-config'

interface CommandSettingsTabProps {
  capability: CapabilityConfig
  onChange: (updates: Partial<CapabilityConfig>) => void
}

export function CommandSettingsTab({ capability, onChange }: CommandSettingsTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="command-enabled"
          checked={capability.command?.enabled || false}
          onChange={(e) => onChange({
            command: {
              ...capability.command,
              enabled: e.target.checked,
              trigger: capability.command?.trigger || '',
              aliases: capability.command?.aliases || [],
              description: capability.command?.description || ''
            }
          })}
        />
        <Label htmlFor="command-enabled">Enable command for this capability</Label>
      </div>
      
      {capability.command?.enabled && (
        <>
          <div>
            <Label htmlFor="command-trigger">Command Trigger</Label>
            <Input
              id="command-trigger"
              value={capability.command?.trigger || ''}
              onChange={(e) => onChange({
                command: {
                  ...capability.command!,
                  trigger: e.target.value
                }
              })}
              placeholder="e.g., search"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Primary command to trigger this capability
            </p>
          </div>
          
          <div>
            <Label htmlFor="command-aliases">Command Aliases</Label>
            <Input
              id="command-aliases"
              value={capability.command?.aliases?.join(', ') || ''}
              onChange={(e) => onChange({
                command: {
                  ...capability.command!,
                  aliases: e.target.value.split(',').map(a => a.trim()).filter(Boolean)
                }
              })}
              placeholder="e.g., find, lookup, research"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Alternative commands (comma-separated)
            </p>
          </div>
          
          <div>
            <Label htmlFor="command-description">Command Help Text</Label>
            <Textarea
              id="command-description"
              value={capability.command?.description || ''}
              onChange={(e) => onChange({
                command: {
                  ...capability.command!,
                  description: e.target.value
                }
              })}
              placeholder="Help text shown when listing commands"
              rows={2}
            />
          </div>
        </>
      )}
    </div>
  )
}