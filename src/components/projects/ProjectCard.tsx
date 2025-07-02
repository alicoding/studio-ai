import { FolderOpen, Edit3, Copy, Trash2, Users, Star } from 'lucide-react'

interface Project {
  id: string
  name: string
  description?: string
  path: string
  createdAt: Date | string
  sessionCount: number
  lastSessionAt?: Date | string
  status: 'active' | 'archived' | 'draft'
  lastModified: Date | string
  tags: string[]
  favorite: boolean
}

interface ProjectCardProps {
  project: Project
  onOpen: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onClone: (id: string) => void
}

export function ProjectCard({ project, onOpen, onEdit, onDelete, onClone }: ProjectCardProps) {
  const formatDate = (dateString: string | Date) => {
    if (!dateString) return 'Unknown'

    const date = new Date(dateString)

    // Check if date is valid
    if (isNaN(date.getTime())) return 'Invalid Date'

    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays <= 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  const isClaudeCodeProject = (project: Project) => {
    // Check if it's a Claude Code managed project
    return project.id.startsWith('-Users-ali-') || project.path?.includes('/.claude/')
  }

  return (
    <div className="bg-card border rounded-lg overflow-hidden hover:border-gray-500 transition-colors group">
      <div className="aspect-video bg-background flex items-center justify-center border-b relative">
        <div className="flex items-center justify-center text-muted-foreground">
          <FolderOpen className="w-12 h-12" />
        </div>
        {project.favorite && (
          <Star className="absolute top-2 right-2 w-4 h-4 text-yellow-400 fill-current" />
        )}
      </div>

      <div className="p-4 space-y-3">
        <div>
          <h3 className="text-white font-semibold text-lg mb-1 group-hover:text-blue-400 transition-colors">
            {project.name}
          </h3>
          <p className="text-muted-foreground text-sm line-clamp-2 min-h-[2.5rem]">
            {project.description || 'No description available'}
          </p>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Modified {formatDate(project.lastModified)}</span>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>
              {project.sessionCount} session{project.sessionCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {project.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {project.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-secondary text-xs rounded text-muted-foreground"
              >
                {tag}
              </span>
            ))}
            {project.tags.length > 3 && (
              <span className="px-2 py-1 bg-secondary text-xs rounded text-muted-foreground">
                +{project.tags.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 pt-2 border-t">
          <button
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
            onClick={() => onOpen(project.id)}
            title="Open project"
          >
            <FolderOpen className="w-3 h-3" />
            Open
          </button>
          <button
            className="p-2 text-muted-foreground hover:text-white hover:bg-secondary rounded transition-colors"
            onClick={() => onEdit(project.id)}
            title="Edit project"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          {!isClaudeCodeProject(project) ? (
            <button
              className="p-2 text-muted-foreground hover:text-white hover:bg-secondary rounded transition-colors"
              onClick={() => onClone(project.id)}
              title="Clone project"
            >
              <Copy className="w-4 h-4" />
            </button>
          ) : (
            <button
              className="p-2 text-muted-foreground/50 cursor-not-allowed"
              title="Claude Code projects cannot be cloned"
              disabled
            >
              <Copy className="w-4 h-4" />
            </button>
          )}
          <button
            className="p-2 text-red-400 hover:text-red-300 hover:bg-secondary rounded transition-colors"
            onClick={() => onDelete(project.id)}
            title="Delete project"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
