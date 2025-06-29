import { X, Plus } from 'lucide-react'

interface Project {
  id: string
  name: string
  description?: string
}

interface ProjectTabsProps {
  projects: Project[]
  activeProjectId: string | null
  onProjectSelect: (projectId: string) => void
  onProjectCreate: () => void
  onProjectClose: (projectId: string) => void
}

export function ProjectTabs({
  projects,
  activeProjectId,
  onProjectSelect,
  onProjectCreate,
  onProjectClose,
}: ProjectTabsProps) {
  return (
    <div className="flex items-center bg-card border-b px-2 h-10">
      {projects.map((project) => (
        <div
          key={project.id}
          className={`flex items-center px-3 py-1 mr-1 rounded-t cursor-pointer transition-colors ${
            project.id === activeProjectId
              ? 'bg-secondary text-white'
              : 'bg-background text-muted-foreground hover:bg-secondary hover:text-white'
          }`}
          onClick={() => onProjectSelect(project.id)}
        >
          <span className="text-sm mr-2">{project.name}</span>
          <button
            className="p-0.5 text-muted-foreground hover:text-white hover:bg-red-600 rounded transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              onProjectClose(project.id)
            }}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      <button
        className="flex items-center gap-1 px-3 py-1 text-sm text-muted-foreground hover:text-white hover:bg-secondary rounded transition-colors"
        onClick={onProjectCreate}
      >
        <Plus className="w-4 h-4" />
        New Project
      </button>
    </div>
  )
}
