import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { Badge } from '../ui/badge'
import { Edit3, Copy, Trash2, Bot, Briefcase } from 'lucide-react'

interface AgentConfig {
  id: string
  name: string
  role: string
  systemPrompt: string
  tools: string[]
  model: string
  projectsUsing: string[]
}

interface AgentConfigCardProps {
  agent: AgentConfig
  onEdit: (id: string) => void
  onClone: (id: string) => void
  onDelete: (id: string) => void
}

export function AgentConfigCard({ agent, onEdit, onClone, onDelete }: AgentConfigCardProps) {
  return (
    <Card className="p-6 space-y-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">{agent.name}</h3>
        </div>
        <Badge variant="secondary">{agent.role}</Badge>
      </div>

      <div className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {agent.systemPrompt.length > 100
            ? `${agent.systemPrompt.substring(0, 100)}...`
            : agent.systemPrompt}
        </p>

        <div className="flex flex-wrap gap-1">
          {agent.tools.slice(0, 3).map((tool) => (
            <Badge key={tool} variant="outline" className="text-xs">
              {tool}
            </Badge>
          ))}
          {agent.tools.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{agent.tools.length - 3} more
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Model: {agent.model}</span>
          <div className="flex items-center gap-1">
            <Briefcase className="w-4 h-4" />
            <span>{agent.projectsUsing.length} project(s)</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t">
        <Button variant="outline" size="sm" onClick={() => onEdit(agent.id)}>
          <Edit3 className="w-4 h-4 mr-1" />
          Edit
        </Button>
        <Button variant="outline" size="sm" onClick={() => onClone(agent.id)}>
          <Copy className="w-4 h-4 mr-1" />
          Clone
        </Button>
        <Button variant="destructive" size="sm" onClick={() => onDelete(agent.id)}>
          <Trash2 className="w-4 h-4 mr-1" />
          Delete
        </Button>
      </div>
    </Card>
  )
}
