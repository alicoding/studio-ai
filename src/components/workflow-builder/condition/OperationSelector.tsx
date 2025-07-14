/**
 * OperationSelector - Dropdown for selecting comparison operations
 *
 * SOLID: Single responsibility - operation selection only
 * KISS: Simple dropdown with operation descriptions
 * Library-First: Uses shadcn/ui Select component
 */

import { memo } from 'react'
import { Check } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { OPERATION_METADATA, getOperationsForDataType } from '@/types/condition-types'
import type { OperationSelectorProps } from '@/types/condition-ui'

function OperationSelector({
  dataType,
  selectedOperation,
  onOperationSelect,
  disabled = false,
}: OperationSelectorProps) {
  // Get operations supported by the selected data type
  const supportedOperations = getOperationsForDataType(dataType)

  // Group operations by category for better organization
  const operationsByCategory = supportedOperations.reduce(
    (acc, operation) => {
      const metadata = OPERATION_METADATA[operation]
      let category = 'General'

      // Categorize operations based on their names
      if (operation.includes('length')) {
        category = 'Array Length'
      } else if (
        operation.includes('Date') ||
        operation === 'isAfter' ||
        operation === 'isBefore'
      ) {
        category = 'Date/Time'
      } else if (['exists', 'notExists', 'isEmpty', 'isNotEmpty'].includes(operation)) {
        category = 'Existence'
      } else if (['isTrue', 'isFalse'].includes(operation)) {
        category = 'Boolean'
      } else if (
        ['contains', 'notContains', 'startsWith', 'endsWith', 'matchesRegex'].includes(operation)
      ) {
        category = 'Text'
      } else if (['equals', 'notEquals', 'greaterThan', 'lessThan'].includes(operation)) {
        category = 'Comparison'
      }

      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push({ operation, metadata })
      return acc
    },
    {} as Record<
      string,
      Array<{
        operation: string
        metadata: (typeof OPERATION_METADATA)[keyof typeof OPERATION_METADATA]
      }>
    >
  )

  const handleOperationSelect = (operation: string) => {
    onOperationSelect(operation as keyof typeof OPERATION_METADATA)
  }

  const selectedOperationMeta = selectedOperation ? OPERATION_METADATA[selectedOperation] : null

  return (
    <Select
      value={selectedOperation || ''}
      onValueChange={handleOperationSelect}
      disabled={disabled}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select operation...">
          {selectedOperationMeta && (
            <div className="flex items-center gap-2">
              <span>{selectedOperationMeta.label}</span>
              {!selectedOperationMeta.requiresRightValue && (
                <span className="text-xs text-muted-foreground">(no value)</span>
              )}
            </div>
          )}
        </SelectValue>
      </SelectTrigger>

      <SelectContent>
        {Object.keys(operationsByCategory).length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No operations available for {dataType}
          </div>
        ) : (
          Object.entries(operationsByCategory).map(([category, operations]) => (
            <div key={category}>
              {Object.keys(operationsByCategory).length > 1 && (
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50">
                  {category}
                </div>
              )}
              {operations.map(({ operation, metadata }) => (
                <Tooltip key={operation}>
                  <TooltipTrigger asChild>
                    <SelectItem value={operation} className="cursor-pointer">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <span>{metadata.label}</span>
                          {!metadata.requiresRightValue && (
                            <span className="text-xs text-muted-foreground">(no value)</span>
                          )}
                        </div>
                        {selectedOperation === operation && <Check className="w-4 h-4 ml-2" />}
                      </div>
                    </SelectItem>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p>{metadata.description}</p>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Supported types: {metadata.supportedDataTypes.join(', ')}
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          ))
        )}
      </SelectContent>
    </Select>
  )
}

export default memo(OperationSelector)
