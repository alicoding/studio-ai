import { useState } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card } from '../ui/card'
import { Badge } from '../ui/badge'
import { Checkbox } from '../ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Search, User } from 'lucide-react'
import type { AgentConfig } from '../../stores/agents'

interface AgentSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (agentIds: string[]) => void
  availableAgents: AgentConfig[]
}

export function AgentSelectionModal({
  isOpen,
  onClose,
  onSelect,
  availableAgents,
}: AgentSelectionModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')

  const filteredAgents = availableAgents.filter((agent) => {
    // No longer filter out agents already in the project - allow multiple instances

    // Safety check for agent properties
    if (!agent || !agent.name || !agent.role) {
      return false
    }

    // Search filter
    const matchesSearch =
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.role.toLowerCase().includes(searchQuery.toLowerCase())

    // Role filter
    const matchesRole = roleFilter === 'all' || agent.role === roleFilter

    return matchesSearch && matchesRole
  })

  const handleToggleAgent = (agentId: string) => {
    setSelectedIds((prev) =>
      prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId]
    )
  }

  const handleSelectAll = () => {
    setSelectedIds(filteredAgents.map((agent) => agent.id))
  }

  const handleClearAll = () => {
    setSelectedIds([])
  }

  const handleSubmit = () => {
    onSelect(selectedIds)
    setSelectedIds([])
    setSearchQuery('')
    setRoleFilter('all')
    onClose()
  }

  const handleClose = () => {
    setSelectedIds([])
    setSearchQuery('')
    setRoleFilter('all')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Add Agents to Team</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex gap-2 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search agents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="dev">Developer</SelectItem>
                  <SelectItem value="architect">Architect</SelectItem>
                  <SelectItem value="ux">UX Designer</SelectItem>
                  <SelectItem value="tester">Tester</SelectItem>
                  <SelectItem value="orchestrator">Orchestrator</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={filteredAgents.length === 0}
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                disabled={selectedIds.length === 0}
              >
                Clear
              </Button>
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {filteredAgents.map((agent) => (
              <Card
                key={agent.id}
                className={`p-4 cursor-pointer transition-colors hover:bg-accent ${
                  selectedIds.includes(agent.id) ? 'ring-2 ring-primary bg-accent' : ''
                }`}
                onClick={() => handleToggleAgent(agent.id)}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedIds.includes(agent.id)}
                    onCheckedChange={() => handleToggleAgent(agent.id)}
                    className="mt-1"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{agent.name}</span>
                      <Badge variant="secondary">{agent.role}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                      <span>{agent.model}</span>
                      <span>{agent.tools.filter((tool) => tool.enabled).length} tools</span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {agent.systemPrompt.length > 100
                        ? `${agent.systemPrompt.substring(0, 100)}...`
                        : agent.systemPrompt}
                    </p>
                  </div>
                </div>
              </Card>
            ))}

            {filteredAgents.length === 0 && (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">
                  {searchQuery || roleFilter !== 'all'
                    ? 'No agents match your search criteria'
                    : 'No agents available'}
                </p>
              </Card>
            )}
          </div>

          {selectedIds.length > 0 && (
            <div className="text-sm text-muted-foreground text-center">
              Selected {selectedIds.length} agent{selectedIds.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={selectedIds.length === 0}>
            Add {selectedIds.length} Agent{selectedIds.length !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
