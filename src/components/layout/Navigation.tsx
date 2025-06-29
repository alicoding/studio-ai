import { Link, useLocation } from '@tanstack/react-router'
import { Settings } from 'lucide-react'

interface NavigationProps {
  onSettingsClick: () => void
}

export function Navigation({ onSettingsClick }: NavigationProps) {
  const location = useLocation()

  const isActive = (path: string) => {
    return location.pathname === path
  }

  return (
    <nav className="flex items-center justify-between bg-card border-b border-border px-6 h-14">
      <div className="text-xl font-semibold text-primary">Claude Studio</div>
      <div className="flex gap-6">
        <Link
          to="/"
          className={`px-4 py-2 rounded-md transition-colors font-medium ${
            isActive('/')
              ? 'text-primary bg-primary/10 border border-primary/20'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          }`}
        >
          Workspace
        </Link>
        <Link
          to="/projects"
          className={`px-4 py-2 rounded-md transition-colors font-medium ${
            isActive('/projects')
              ? 'text-primary bg-primary/10 border border-primary/20'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          }`}
        >
          Projects
        </Link>
        <Link
          to="/agents"
          className={`px-4 py-2 rounded-md transition-colors font-medium ${
            isActive('/agents')
              ? 'text-primary bg-primary/10 border border-primary/20'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          }`}
        >
          Agents
        </Link>
        <Link
          to="/teams"
          className={`px-4 py-2 rounded-md transition-colors font-medium ${
            isActive('/teams')
              ? 'text-primary bg-primary/10 border border-primary/20'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          }`}
        >
          Teams
        </Link>
      </div>
      <button
        className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
        title="Settings"
        onClick={onSettingsClick}
      >
        <Settings className="w-5 h-5" />
      </button>
    </nav>
  )
}
