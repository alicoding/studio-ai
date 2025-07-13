import { Link, useLocation } from '@tanstack/react-router'
import { Settings, Database, Search, Workflow } from 'lucide-react'

export function Navigation() {
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
        <Link
          to="/workflows"
          className={`px-4 py-2 rounded-md transition-colors font-medium flex items-center gap-2 ${
            isActive('/workflows')
              ? 'text-primary bg-primary/10 border border-primary/20'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          }`}
        >
          <Workflow className="w-4 h-4" />
          Workflows
        </Link>
        <Link
          to="/storage"
          className={`px-4 py-2 rounded-md transition-colors font-medium flex items-center gap-2 ${
            isActive('/storage')
              ? 'text-primary bg-primary/10 border border-primary/20'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          }`}
        >
          <Database className="w-4 h-4" />
          Storage
        </Link>
        <Link
          to="/session-search"
          className={`px-4 py-2 rounded-md transition-colors font-medium flex items-center gap-2 ${
            isActive('/session-search')
              ? 'text-primary bg-primary/10 border border-primary/20'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          }`}
        >
          <Search className="w-4 h-4" />
          Search
        </Link>
      </div>
      <Link
        to="/settings"
        search={{ tab: 'system' }}
        className={`p-2 rounded-md transition-colors ${
          isActive('/settings')
            ? 'text-primary bg-primary/10 border border-primary/20'
            : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
        }`}
        title="Settings"
      >
        <Settings className="w-5 h-5" />
      </Link>
    </nav>
  )
}
