interface RoleTemplate {
  role: string
  name: string
  description: string
  systemPrompt: string
  tools: string[]
}

const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    role: 'dev',
    name: 'Developer',
    description: 'Full-stack development with file system access',
    systemPrompt:
      'You are a skilled full-stack developer. You write clean, maintainable code following best practices...',
    tools: ['File System (Read/Write)', 'Terminal Commands', 'Web Search'],
  },
  {
    role: 'architect',
    name: 'Architect',
    description: 'System design and technical architecture',
    systemPrompt:
      'You are a software architect who designs scalable systems. You focus on patterns, performance, and maintainability...',
    tools: ['File System (Read/Write)', 'Web Search'],
  },
  {
    role: 'ux',
    name: 'UX Designer',
    description: 'User experience and interface design',
    systemPrompt:
      'You are a UX/UI designer who creates intuitive interfaces. You focus on user needs and accessibility...',
    tools: ['File System (Read/Write)', 'Web Search'],
  },
  {
    role: 'tester',
    name: 'Tester',
    description: 'Quality assurance and testing',
    systemPrompt:
      'You are a QA engineer who ensures code quality. You write comprehensive tests and find edge cases...',
    tools: ['File System (Read/Write)', 'Terminal Commands'],
  },
  {
    role: 'orchestrator',
    name: 'Orchestrator',
    description: 'Team coordination and task management',
    systemPrompt:
      'You are a project orchestrator who coordinates team efforts. You break down tasks and delegate effectively...',
    tools: ['Web Search'],
  },
]

interface PredefinedRolesProps {
  onSelectRole: (template: RoleTemplate) => void
}

export function PredefinedRoles({ onSelectRole }: PredefinedRolesProps) {
  const roleColors: Record<string, string> = {
    orchestrator: '#9333ea',
    architect: '#3b82f6',
    dev: '#10b981',
    ux: '#f59e0b',
    tester: '#ef4444',
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Quick Start Templates</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ROLE_TEMPLATES.map((template) => (
          <div
            key={template.role}
            className="p-4 bg-card border border-border rounded-lg cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all"
            onClick={() => onSelectRole(template)}
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className="px-2 py-1 rounded text-xs font-medium text-white"
                style={{ backgroundColor: roleColors[template.role] || '#666' }}
              >
                {template.role}
              </span>
              <h4 className="text-base font-semibold">{template.name}</h4>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{template.description}</p>
            <div className="text-xs text-muted-foreground">
              {template.tools.length} tools enabled
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
