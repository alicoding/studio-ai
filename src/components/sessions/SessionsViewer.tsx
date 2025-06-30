import { useState, useEffect } from 'react'
import { formatDistance } from 'date-fns'
import { Bot, MessageSquare } from 'lucide-react'

interface Session {
  fileName: string
  sessionId: string
  createdAt: Date
  size: number
  messageCount?: number
  agentName?: string
  lastActivity?: Date
}

interface SessionsViewerProps {
  projectId: string
  projectPath: string
  sessionCount: number
  onSessionDeleted?: () => void
  onSessionOpen?: (sessionId: string) => void
}

export function SessionsViewer({ projectId, onSessionDeleted, onSessionOpen }: SessionsViewerProps) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingSession, setDeletingSession] = useState<string | null>(null)

  useEffect(() => {
    fetchSessions()
  }, [projectId])

  const fetchSessions = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/projects/${projectId}/sessions`)
      if (!response.ok) throw new Error('Failed to fetch sessions')
      const data = await response.json()
      setSessions(data.sessions || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSession = async (fileName: string) => {
    const confirmMessage = `Are you sure you want to delete session "${fileName}"?\n\nThis will permanently remove the session history and cannot be undone.`
    
    if (!confirm(confirmMessage)) return

    try {
      setDeletingSession(fileName)
      const response = await fetch(`/api/projects/${projectId}/sessions/${encodeURIComponent(fileName)}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) throw new Error('Failed to delete session')
      
      // Refresh sessions list
      await fetchSessions()
      
      // Notify parent component
      onSessionDeleted?.()
      
      alert('Session deleted successfully')
    } catch (err) {
      alert(`Failed to delete session: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setDeletingSession(null)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Loading sessions...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">Error: {error}</p>
        <button 
          onClick={fetchSessions}
          className="mt-2 text-sm text-primary hover:underline"
        >
          Try again
        </button>
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">
          No agent sessions found for this project.
        </p>
        <p className="text-xs text-muted-foreground">
          Sessions are created when agents interact with Claude Code.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="text-sm text-muted-foreground mb-2">
        This project has {sessions.length} agent{sessions.length !== 1 ? 's' : ''} that worked on it:
      </div>
      {sessions.map((session) => (
        <div 
          key={session.fileName}
          className="flex items-center justify-between p-3 bg-secondary/20 hover:bg-secondary/30 rounded-lg transition-colors cursor-pointer"
          onClick={() => onSessionOpen?.(session.sessionId)}
        >
          <div className="flex items-start gap-3">
            <div className="mt-1">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-sm flex items-center gap-2">
                {session.agentName || `Agent ${session.sessionId.slice(0, 8)}`}
                <span className="text-xs text-muted-foreground">
                  ({session.sessionId.slice(0, 8)})
                </span>
              </h4>
              <div className="flex gap-4 mt-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {session.messageCount || 0} messages
                </span>
                <span className="text-xs text-muted-foreground">
                  Created {formatDistance(new Date(session.createdAt), new Date(), { addSuffix: true })}
                </span>
                {session.lastActivity && (
                  <span className="text-xs text-muted-foreground">
                    Last active {formatDistance(new Date(session.lastActivity), new Date(), { addSuffix: true })}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => alert(`Viewing session details coming soon: ${session.fileName}`)}
              className="px-3 py-1 text-xs bg-secondary hover:bg-secondary/80 rounded transition-colors"
            >
              View
            </button>
            <button
              onClick={() => handleDeleteSession(session.fileName)}
              disabled={deletingSession === session.fileName}
              className="px-3 py-1 text-xs bg-destructive/10 hover:bg-destructive/20 text-destructive rounded transition-colors disabled:opacity-50"
            >
              {deletingSession === session.fileName ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      ))}
      
      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          Total: {sessions.length} session{sessions.length !== 1 ? 's' : ''} • 
          Storage: {formatFileSize(sessions.reduce((total, s) => total + s.size, 0))}
        </p>
      </div>
    </div>
  )
}