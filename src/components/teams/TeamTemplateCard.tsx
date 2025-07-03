import { TeamTemplate } from '../../types/teams'

interface TeamTemplateCardProps {
  template: TeamTemplate
  onUse: (id: string) => void
  onClone: (id: string) => void
  onEdit: (id: string) => void
  onExport: (id: string) => void
}

export function TeamTemplateCard({
  template,
  onUse,
  onClone,
  onEdit,
  onExport,
}: TeamTemplateCardProps) {
  const roleColors: Record<string, string> = {
    orchestrator: '#9333ea',
    architect: '#3b82f6',
    dev: '#10b981',
    ux: '#f59e0b',
    tester: '#ef4444',
  }

  const getRoleCount = () => {
    const counts: Record<string, number> = {}
    template.agents.forEach((agent) => {
      counts[agent.role] = (counts[agent.role] || 0) + 1
    })
    return counts
  }

  const roleCounts = getRoleCount()

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <h3 className="text-lg font-semibold text-foreground">{template.name}</h3>
        <span className="text-xs text-muted-foreground">
          Created {new Date(template.createdAt).toLocaleDateString()}
        </span>
      </div>

      <div className="text-sm text-muted-foreground">{template.description}</div>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {Object.entries(roleCounts).map(([role, count]) => (
            <div
              key={role}
              className="px-2 py-1 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: roleColors[role] || '#666' }}
            >
              {count} {role}
              {count > 1 ? 's' : ''}
            </div>
          ))}
        </div>
        <div className="text-xs text-muted-foreground">Total: {template.agents.length} agents</div>
      </div>

      <div className="space-y-1 max-h-24 overflow-y-auto">
        {template.agents.map((agent, idx) => (
          <div key={idx} className="flex items-center gap-2 text-xs">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: roleColors[agent.role] || '#666' }}
            />
            <span className="text-muted-foreground">{agent.name}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-2 border-t border-border">
        <button
          className="flex-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
          onClick={() => onUse(template.id)}
        >
          Use Template
        </button>
        <button
          className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
          onClick={() => onClone(template.id)}
        >
          Clone
        </button>
        <button
          className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
          onClick={() => onEdit(template.id)}
        >
          Edit
        </button>
        <button
          className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
          onClick={() => onExport(template.id)}
        >
          Export
        </button>
      </div>
    </div>
  )
}
