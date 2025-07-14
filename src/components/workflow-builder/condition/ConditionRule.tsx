/**
 * ConditionRule - Individual condition rule component
 *
 * SOLID: Single responsibility - single condition rule editing
 * KISS: Simple layout with field, operation, value inputs
 * Library-First: Uses condition builder components
 */

import { memo } from 'react'
import { Trash2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { validateConditionRule, conditionValueToField } from '@/lib/condition-utils'
import {
  OPERATION_METADATA,
  getOperationsForDataType,
} from '../../../web/server/schemas/condition-types'
import type { ConditionRuleProps } from '@/types/condition-ui'
import type { ConditionDataType } from '../../../web/server/schemas/condition-types'
import FieldSelector from './FieldSelector'
import OperationSelector from './OperationSelector'
import ValueInput from './ValueInput'

function ConditionRule({
  rule,
  availableFields,
  isSelected = false,
  onUpdateRule,
  onDeleteRule,
  onSelect,
}: ConditionRuleProps) {
  // Validate the rule
  const validationErrors = validateConditionRule(rule, availableFields)
  const hasErrors = validationErrors.length > 0

  // Get current field selection
  const leftField = conditionValueToField(rule.leftValue, availableFields)

  // Handle field selection
  const handleLeftFieldSelect = (field: (typeof availableFields)[0]) => {
    onUpdateRule(rule.id, {
      leftValue: {
        stepId: field.stepId,
        field: field.field,
      },
      dataType: field.dataType || 'string',
    })
  }

  // Handle data type change
  const handleDataTypeChange = (dataType: ConditionDataType) => {
    // Get supported operations for new data type
    const supportedOps = getOperationsForDataType(dataType)
    const currentOpSupported = supportedOps.includes(rule.operation)

    onUpdateRule(rule.id, {
      dataType,
      // Reset operation if current one isn't supported
      operation: currentOpSupported ? rule.operation : supportedOps[0],
      // Clear right value when changing data type
      rightValue: undefined,
    })
  }

  // Handle operation change
  const handleOperationChange = (operation: typeof rule.operation) => {
    const operationMeta = OPERATION_METADATA[operation]

    onUpdateRule(rule.id, {
      operation,
      // Clear right value if operation doesn't require it
      rightValue: operationMeta.requiresRightValue ? rule.rightValue : undefined,
    })
  }

  // Handle value change
  const handleValueChange = (rightValue: typeof rule.rightValue) => {
    onUpdateRule(rule.id, { rightValue })
  }

  const getDataTypeColor = (dataType: ConditionDataType) => {
    switch (dataType) {
      case 'string':
        return 'bg-blue-100 text-blue-800'
      case 'number':
        return 'bg-green-100 text-green-800'
      case 'boolean':
        return 'bg-purple-100 text-purple-800'
      case 'array':
        return 'bg-orange-100 text-orange-800'
      case 'object':
        return 'bg-gray-100 text-gray-800'
      case 'dateTime':
        return 'bg-pink-100 text-pink-800'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  return (
    <Card
      className={`p-4 space-y-3 cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'
      } ${hasErrors ? 'border-red-200 bg-red-50/50' : ''}`}
      onClick={() => onSelect(rule.id)}
    >
      {/* Header with data type and delete button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Rule</span>
          <Select value={rule.dataType} onValueChange={handleDataTypeChange}>
            <SelectTrigger className="w-auto h-6 text-xs">
              <SelectValue>
                <Badge className={`text-xs px-2 py-0.5 ${getDataTypeColor(rule.dataType)}`}>
                  {rule.dataType}
                </Badge>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="string">String</SelectItem>
              <SelectItem value="number">Number</SelectItem>
              <SelectItem value="boolean">Boolean</SelectItem>
              <SelectItem value="array">Array</SelectItem>
              <SelectItem value="object">Object</SelectItem>
              <SelectItem value="dateTime">Date/Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          {hasErrors && (
            <Tooltip>
              <TooltipTrigger>
                <AlertCircle className="w-4 h-4 text-red-500" />
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  {validationErrors.map((error, index) => (
                    <div key={index} className="text-sm">
                      {error}
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onDeleteRule(rule.id)
            }}
            className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-100"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Rule configuration */}
      <div className="space-y-3">
        {/* Left side - Field selection */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Field</label>
          <FieldSelector
            availableFields={availableFields}
            selectedField={leftField}
            onFieldSelect={handleLeftFieldSelect}
            placeholder="Select field to check..."
          />
        </div>

        {/* Operation selection */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Operation</label>
          <OperationSelector
            dataType={rule.dataType}
            selectedOperation={rule.operation}
            onOperationSelect={handleOperationChange}
          />
        </div>

        {/* Right side - Value input (if required) */}
        {OPERATION_METADATA[rule.operation]?.requiresRightValue && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Value</label>
            <ValueInput
              dataType={rule.dataType}
              operation={rule.operation}
              value={rule.rightValue}
              onValueChange={handleValueChange}
              availableFields={availableFields}
              placeholder="Enter comparison value..."
            />
          </div>
        )}
      </div>
    </Card>
  )
}

export default memo(ConditionRule)
