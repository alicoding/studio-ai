/**
 * Approval filtering and search component
 *
 * SOLID: Single responsibility - filtering and searching approvals
 * DRY: Reusable filter UI component
 * KISS: Simple filter interface with common patterns
 * Library-First: Uses shadcn/ui components
 */

import { useState } from 'react'
import { Card, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Badge } from '../ui/badge'
import { Separator } from '../ui/separator'
import { Search, Filter, X, Shield, Clock } from 'lucide-react'
import type { ApprovalFilters } from '../../hooks/useApprovals'

export interface ApprovalFiltersProps {
  filters: ApprovalFilters
  onFiltersChange: (filters: ApprovalFilters) => void
  onSearch: (query: string) => void
  searchQuery?: string
  className?: string
}

export function ApprovalFiltersComponent({
  filters,
  onFiltersChange,
  onSearch,
  searchQuery = '',
  className = '',
}: ApprovalFiltersProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery)

  // Count active filters
  const activeFilterCount = Object.keys(filters).filter(
    (key) => filters[key as keyof ApprovalFilters] !== undefined
  ).length

  const handleFilterChange = <K extends keyof ApprovalFilters>(
    key: K,
    value: ApprovalFilters[K] | 'all' | undefined
  ) => {
    const newFilters = { ...filters }
    if (value === 'all' || value === undefined) {
      delete newFilters[key]
    } else {
      newFilters[key] = value as ApprovalFilters[K]
    }
    onFiltersChange(newFilters)
  }

  const clearAllFilters = () => {
    onFiltersChange({})
    setIsFilterOpen(false)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(localSearchQuery)
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Bar */}
      <Card>
        <CardContent className="p-3">
          <form onSubmit={handleSearchSubmit} className="flex space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search approvals..."
                value={localSearchQuery}
                onChange={(e) => setLocalSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit" size="sm" variant="secondary">
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Filter Controls */}
      <div className="space-y-2">
        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-start">
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Filter Approvals</h4>
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="h-auto p-1"
                  >
                    Clear all
                  </Button>
                )}
              </div>

              <Separator />

              {/* Status Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Status</Label>
                <Select
                  value={filters.status || 'all'}
                  onValueChange={(value) =>
                    handleFilterChange(
                      'status',
                      value === 'all' ? undefined : (value as ApprovalFilters['status'])
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-2" />
                        Pending
                      </div>
                    </SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Risk Level Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Risk Level</Label>
                <Select
                  value={filters.riskLevel || 'all'}
                  onValueChange={(value) =>
                    handleFilterChange(
                      'riskLevel',
                      value === 'all' ? undefined : (value as ApprovalFilters['riskLevel'])
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Risk Levels</SelectItem>
                    <SelectItem value="critical">
                      <div className="flex items-center">
                        <Shield className="h-3 w-3 mr-2 text-red-500" />
                        Critical Risk
                      </div>
                    </SelectItem>
                    <SelectItem value="high">
                      <div className="flex items-center">
                        <Shield className="h-3 w-3 mr-2 text-orange-500" />
                        High Risk
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex items-center">
                        <Shield className="h-3 w-3 mr-2 text-yellow-500" />
                        Medium Risk
                      </div>
                    </SelectItem>
                    <SelectItem value="low">
                      <div className="flex items-center">
                        <Shield className="h-3 w-3 mr-2 text-green-500" />
                        Low Risk
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Priority</Label>
                <Select
                  value={filters.priority || 'all'}
                  onValueChange={(value) =>
                    handleFilterChange(
                      'priority',
                      value === 'all' ? undefined : (value as ApprovalFilters['priority'])
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex justify-end space-x-2">
                <Button variant="outline" size="sm" onClick={() => setIsFilterOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={() => setIsFilterOpen(false)}>
                  Apply Filters
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Active Filter Tags */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2">
            {filters.status && (
              <Badge variant="secondary" className="text-xs">
                Status: {filters.status}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1"
                  onClick={() => handleFilterChange('status', undefined)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {filters.riskLevel && (
              <Badge variant="secondary" className="text-xs">
                Risk: {filters.riskLevel}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1"
                  onClick={() => handleFilterChange('riskLevel', undefined)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {filters.priority && (
              <Badge variant="secondary" className="text-xs">
                Priority: {filters.priority}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1"
                  onClick={() => handleFilterChange('priority', undefined)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
