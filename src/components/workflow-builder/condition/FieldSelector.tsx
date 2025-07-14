/**
 * FieldSelector - Dropdown for selecting step fields in conditions
 *
 * SOLID: Single responsibility - field selection only
 * KISS: Simple dropdown with search functionality
 * Library-First: Uses shadcn/ui Select component
 */

import { memo, useState } from 'react'
import { ChevronDown, Search, Database } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import type { FieldSelectorProps, AvailableField } from '@/types/condition-ui'

function FieldSelector({
  availableFields,
  selectedField,
  onFieldSelect,
  placeholder = 'Select a field...',
  disabled = false,
}: FieldSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Filter fields based on search query
  const filteredFields = availableFields.filter(
    (field) =>
      field.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      field.stepName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      field.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Group fields by step for better organization
  const fieldsByStep = filteredFields.reduce(
    (acc, field) => {
      if (!acc[field.stepId]) {
        acc[field.stepId] = {
          stepName: field.stepName,
          fields: [],
        }
      }
      acc[field.stepId].fields.push(field)
      return acc
    },
    {} as Record<string, { stepName: string; fields: AvailableField[] }>
  )

  const handleFieldSelect = (field: AvailableField) => {
    onFieldSelect(field)
    setIsOpen(false)
    setSearchQuery('')
  }

  const getDataTypeColor = (dataType?: string) => {
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
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedField ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Database className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{selectedField.label}</span>
              {selectedField.dataType && (
                <Badge
                  variant="secondary"
                  className={`text-xs px-1.5 py-0.5 ${getDataTypeColor(selectedField.dataType)}`}
                >
                  {selectedField.dataType}
                </Badge>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[400px] p-0" align="start">
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            placeholder="Search fields..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 border-0 outline-none ring-0 focus:ring-0 focus-visible:ring-0"
          />
        </div>

        <div className="max-h-64 overflow-auto p-1">
          {Object.keys(fieldsByStep).length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {searchQuery ? 'No fields found' : 'No fields available'}
            </div>
          ) : (
            Object.entries(fieldsByStep).map(([stepId, { stepName, fields }]) => (
              <div key={stepId} className="mb-2">
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50">
                  {stepName}
                </div>
                {fields.map((field) => (
                  <Button
                    key={field.id}
                    variant="ghost"
                    className="w-full justify-start h-auto p-2 font-normal"
                    onClick={() => handleFieldSelect(field)}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Database className="w-4 h-4 flex-shrink-0" />
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate">{field.field}</span>
                          {field.dataType && (
                            <Badge
                              variant="secondary"
                              className={`text-xs px-1.5 py-0.5 ${getDataTypeColor(field.dataType)}`}
                            >
                              {field.dataType}
                            </Badge>
                          )}
                        </div>
                        {field.description && (
                          <div className="text-xs text-muted-foreground truncate">
                            {field.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default memo(FieldSelector)
