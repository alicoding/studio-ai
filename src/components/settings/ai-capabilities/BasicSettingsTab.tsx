/**
 * Basic Settings Tab
 * 
 * SOLID: Single responsibility - basic capability configuration
 * DRY: Reuses form components
 * KISS: Simple form fields
 */

import { Label } from '../../ui/label'
import { Input } from '../../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { Textarea } from '../../ui/textarea'
import { CapabilityConfig } from '../../../lib/ai/orchestration/capability-config'

interface BasicSettingsTabProps {
  capability: CapabilityConfig
  isCreating: boolean
  onChange: (updates: Partial<CapabilityConfig>) => void
}

export function BasicSettingsTab({ capability, isCreating, onChange }: BasicSettingsTabProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={capability.name}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="category">Category</Label>
          <Select
            value={capability.category}
            onValueChange={(value) => onChange({ category: value as any })}
          >
            <SelectTrigger id="category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="research">Research</SelectItem>
              <SelectItem value="analysis">Analysis</SelectItem>
              <SelectItem value="generation">Generation</SelectItem>
              <SelectItem value="validation">Validation</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={capability.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={2}
        />
      </div>
      
      <div>
        <Label htmlFor="id">ID (unique identifier)</Label>
        <Input
          id="id"
          value={capability.id}
          onChange={(e) => onChange({ id: e.target.value })}
          disabled={!isCreating}
        />
      </div>
    </div>
  )
}