/**
 * ValueInput - Dynamic input component for condition values
 *
 * SOLID: Single responsibility - value input only
 * KISS: Simple input that adapts to data type
 * Library-First: Uses shadcn/ui Input, Select components
 */

import { memo, useState } from 'react'
import { Database, Type } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getValueInputConfig } from '@/lib/condition-utils'
import { ConditionValueHelpers, isTemplateVariable, isStaticValue } from '@/types/condition-types'
import type { ValueInputProps, AvailableField } from '@/types/condition-ui'
import FieldSelector from './FieldSelector'

function ValueInput({
  dataType,
  operation,
  value,
  onValueChange,
  availableFields,
  placeholder,
  disabled = false,
}: ValueInputProps) {
  const [inputMode, setInputMode] = useState<'static' | 'field'>(
    value && isTemplateVariable(value) ? 'field' : 'static'
  )

  const inputConfig = getValueInputConfig(dataType, operation)

  // Get current values for display
  const staticValue = value && isStaticValue(value) ? value.value : ''
  const staticStringValue =
    typeof staticValue === 'boolean' ? String(staticValue) : staticValue || ''
  const templateField =
    value && isTemplateVariable(value)
      ? availableFields.find((f) => f.stepId === value.stepId && f.field === value.field)
      : null

  const handleStaticValueChange = (newValue: string | number | boolean | null) => {
    if (dataType === 'string') {
      onValueChange(ConditionValueHelpers.staticString(String(newValue)))
    } else if (dataType === 'number') {
      const numValue = typeof newValue === 'string' ? parseFloat(newValue) : Number(newValue)
      onValueChange(ConditionValueHelpers.staticNumber(isNaN(numValue) ? 0 : numValue))
    } else if (dataType === 'boolean') {
      onValueChange(ConditionValueHelpers.staticBoolean(Boolean(newValue)))
    } else {
      onValueChange(ConditionValueHelpers.staticString(String(newValue)))
    }
  }

  const handleStringChange = (value: string) => handleStaticValueChange(value)
  const handleNumberChange = (value: string) => handleStaticValueChange(value)
  const handleBooleanChange = (value: boolean) => handleStaticValueChange(value)

  const handleFieldSelect = (field: AvailableField) => {
    onValueChange({
      stepId: field.stepId,
      field: field.field,
    })
  }

  // If operation doesn't require a value, show disabled message
  if (!inputConfig.type || inputConfig.placeholder === 'No value required') {
    return (
      <div className="flex items-center justify-center h-10 px-3 py-2 border border-dashed border-muted-foreground/30 rounded-md bg-muted/20">
        <span className="text-sm text-muted-foreground">No value required</span>
      </div>
    )
  }

  const renderStaticInput = () => {
    switch (inputConfig.type) {
      case 'number':
        return (
          <Input
            type="number"
            value={staticStringValue}
            onChange={(e) => handleNumberChange(e.target.value)}
            placeholder={inputConfig.placeholder}
            disabled={disabled}
          />
        )

      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={Boolean(staticValue)}
              onCheckedChange={handleBooleanChange}
              disabled={disabled}
            />
            <Label className="text-sm">{Boolean(staticValue) ? 'True' : 'False'}</Label>
          </div>
        )

      case 'select':
        return (
          <Select
            value={String(staticValue || '')}
            onValueChange={(val) => {
              if (inputConfig.options) {
                const option = inputConfig.options.find((opt) => String(opt.value) === val)
                if (option) {
                  handleStaticValueChange(option.value)
                }
              }
            }}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder={inputConfig.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {inputConfig.options?.map((option) => (
                <SelectItem key={String(option.value)} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'date':
        return (
          <Input
            type="datetime-local"
            value={staticStringValue}
            onChange={(e) => handleStringChange(e.target.value)}
            placeholder={inputConfig.placeholder}
            disabled={disabled}
          />
        )

      default:
        return (
          <Input
            type="text"
            value={staticStringValue}
            onChange={(e) => handleStringChange(e.target.value)}
            placeholder={inputConfig.placeholder || placeholder}
            disabled={disabled}
          />
        )
    }
  }

  return (
    <div className="w-full">
      <Tabs value={inputMode} onValueChange={(mode) => setInputMode(mode as 'static' | 'field')}>
        <TabsList className="grid w-full grid-cols-2 mb-3">
          <TabsTrigger value="static" className="flex items-center gap-2">
            <Type className="w-4 h-4" />
            Static Value
          </TabsTrigger>
          <TabsTrigger value="field" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Field Reference
          </TabsTrigger>
        </TabsList>

        <TabsContent value="static" className="mt-0">
          {renderStaticInput()}
          {inputConfig.validation && (
            <div className="mt-1 text-xs text-muted-foreground">
              {dataType === 'string' &&
                operation.includes('regex') &&
                'Enter a valid regular expression pattern'}
            </div>
          )}
        </TabsContent>

        <TabsContent value="field" className="mt-0">
          <FieldSelector
            availableFields={availableFields}
            selectedField={templateField}
            onFieldSelect={handleFieldSelect}
            placeholder="Select field to compare with..."
            disabled={disabled}
          />
          <div className="mt-1 text-xs text-muted-foreground">
            Compare with output from another step
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default memo(ValueInput)
