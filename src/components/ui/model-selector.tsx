/**
 * ModelSelector - Reusable fuzzy search model selector
 * 
 * SOLID: Single responsibility - model selection with search
 * DRY: Used in both PlaygroundSettings and AI Capabilities
 * KISS: Simple interface with powerful search
 * Library-First: Uses fuse.js for fuzzy search
 */

import * as React from 'react'
import Fuse from 'fuse.js'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Button } from './button'
import { Input } from './input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './popover'
import { Badge } from './badge'

interface ModelSelectorProps {
  models: string[]
  value?: string
  values?: string[] // For multi-select
  onChange?: (value: string) => void
  onMultiChange?: (values: string[]) => void
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  multiSelect?: boolean
  className?: string
}

export function ModelSelector({
  models,
  value,
  values = [],
  onChange,
  onMultiChange,
  placeholder = "Select model...",
  disabled = false,
  loading = false,
  multiSelect = false,
  className
}: ModelSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')

  // Configure Fuse.js for fuzzy search
  const fuse = React.useMemo(() => {
    return new Fuse(models, {
      threshold: 0.3, // Adjust for fuzzy matching sensitivity
      includeScore: true,
      findAllMatches: true,
    })
  }, [models])

  // Get filtered models based on search
  const filteredModels = React.useMemo(() => {
    if (!search) return models
    
    const results = fuse.search(search)
    return results.map(result => result.item)
  }, [search, fuse, models])

  // Handle single selection
  const handleSelect = (model: string) => {
    if (multiSelect) {
      const newValues = values.includes(model)
        ? values.filter(v => v !== model)
        : [...values, model]
      onMultiChange?.(newValues)
    } else {
      onChange?.(model)
      setOpen(false)
      setSearch('')
    }
  }

  // Get display text
  const displayText = () => {
    if (loading) return "Loading models..."
    if (multiSelect) {
      if (values.length === 0) return placeholder
      if (values.length === 1) return values[0]
      return `${values.length} models selected`
    }
    return value || placeholder
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled || loading}
        >
          <span className="truncate">{displayText()}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <div className="flex items-center border-b px-3 pb-2 pt-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            placeholder="Search models..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-full border-0 bg-transparent p-0 focus:ring-0"
            autoFocus
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {filteredModels.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No models found
            </div>
          ) : (
            <div className="p-1">
              {filteredModels.map((model) => {
                const isSelected = multiSelect 
                  ? values.includes(model)
                  : value === model
                  
                return (
                  <button
                    key={model}
                    onClick={() => handleSelect(model)}
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                      isSelected && "bg-accent/50"
                    )}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{model}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
        {multiSelect && values.length > 0 && (
          <div className="border-t p-2">
            <div className="flex flex-wrap gap-1">
              {values.map((model) => (
                <Badge
                  key={model}
                  variant="secondary"
                  className="text-xs"
                  onClick={() => handleSelect(model)}
                >
                  {model}
                  <span className="ml-1 hover:text-destructive">×</span>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}