/**
 * Capability List Component
 * 
 * SOLID: Single responsibility - only displays list of capabilities
 * DRY: Reusable capability card component
 * KISS: Simple list with selection
 */

import { Card, CardContent } from '../../ui/card'
import { ScrollArea } from '../../ui/scroll-area'
import { Badge } from '../../ui/badge'
import { Button } from '../../ui/button'
import { Plus, Upload } from 'lucide-react'
import { CapabilityConfig } from '../../../lib/ai/orchestration/capability-config'
import { Brain, Search, Code, TestTube, FileText } from 'lucide-react'

const CATEGORY_ICONS = {
  research: Search,
  analysis: Brain,
  generation: Code,
  validation: TestTube,
  custom: FileText
}

interface CapabilityListProps {
  capabilities: CapabilityConfig[]
  selectedId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function CapabilityList({
  capabilities,
  selectedId,
  onSelect,
  onCreate,
  onImport
}: CapabilityListProps) {
  return (
    <Card>
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Capabilities</h3>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={onCreate}>
              <Plus className="h-4 w-4" />
            </Button>
            <label>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={onImport}
              />
              <Button size="sm" variant="ghost" asChild>
                <span>
                  <Upload className="h-4 w-4" />
                </span>
              </Button>
            </label>
          </div>
        </div>
      </div>
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          <div className="p-4 space-y-2">
            {capabilities.map((cap) => {
              const Icon = CATEGORY_ICONS[cap.category] || FileText
              return (
                <Card
                  key={cap.id}
                  className={`cursor-pointer transition-all ${
                    selectedId === cap.id 
                      ? 'border-primary ring-2 ring-primary/20' 
                      : 'hover:border-muted-foreground/50'
                  }`}
                  onClick={() => onSelect(cap.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">{cap.name}</h4>
                          <Badge variant="secondary" className="text-xs">
                            {cap.category}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {cap.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            Model: {cap.models.primary}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}