/**
 * Search Index Controls - Shows Breeze MCP status for projects
 * 
 * SOLID: Single Responsibility - Display Breeze MCP info only
 * DRY: Reusable across ViewControls and Projects page
 * KISS: Simple UI for Breeze MCP status
 * Library-First: Uses Breeze MCP server
 */

import { useState, useCallback } from 'react'
import { Database, Info, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useProjectStore } from '@/stores'

interface SearchIndexControlsProps {
  variant?: 'compact' | 'full'
  className?: string
  projectId?: string
}

export function SearchIndexControls({ 
  variant = 'compact', 
  className = '',
  projectId
}: SearchIndexControlsProps) {
  const [stats, setStats] = useState<{ total_documents: number } | null>(null)
  const [isIndexing, setIsIndexing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { projects } = useProjectStore()
  
  const project = projects.find(p => p.id === projectId)
  const projectPath = project?.path
  
  const fetchStats = useCallback(async () => {
    if (isLoading || !projectId || !projectPath) return
    
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      params.append('projectPath', projectPath)
      
      const response = await fetch(`/api/search/stats/${projectId}?${params}`)
      const data = await response.json()
      if (data.success && data.stats) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setIsLoading(false)
    }
  }, [projectId, projectPath, isLoading])
  
  // Only fetch stats on mount if explicitly requested via prop
  // Remove auto-fetch to prevent overwhelming the server
  
  const handleIndex = async () => {
    if (!projectPath || isIndexing) return
    
    try {
      setIsIndexing(true)
      const response = await fetch('/api/search/index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath })
      })
      const data = await response.json()
      if (data.success) {
        // Wait a bit then refresh stats
        setTimeout(() => {
          setIsIndexing(false)
          fetchStats()
        }, 3000)
      } else {
        setIsIndexing(false)
        console.error('Indexing failed:', data.error)
      }
    } catch (error) {
      setIsIndexing(false)
      console.error('Failed to start indexing:', error)
    }
  }
  
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex items-center gap-1">
          <Database className="w-3 h-3 text-muted-foreground" />
          {isLoading ? (
            <span className="text-xs text-muted-foreground">Loading...</span>
          ) : stats ? (
            <Badge variant="secondary" className="text-xs">
              {stats.total_documents} files
            </Badge>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={fetchStats}
              disabled={isLoading}
              title="Check index status"
            >
              Check status
            </Button>
          )}
        </div>
        
        {projectPath && stats && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2"
            onClick={handleIndex}
            disabled={isIndexing}
            title="Re-index this project"
          >
            <RefreshCw className={`w-3 h-3 ${isIndexing ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>
    )
  }

  // Full variant for Projects page
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Search Index</span>
        </div>
        {!stats && (
          <Button
            size="sm"
            variant="ghost"
            onClick={fetchStats}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Check Status'}
          </Button>
        )}
      </div>

      {stats ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Indexed files:</span>
            <span className="font-medium">{stats.total_documents}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={handleIndex}
            disabled={isIndexing || !projectPath}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isIndexing ? 'animate-spin' : ''}`} />
            {isIndexing ? 'Indexing...' : 'Re-index Project'}
          </Button>
        </div>
      ) : isLoading ? (
        <div className="text-sm text-muted-foreground text-center py-2">
          Checking index status...
        </div>
      ) : (
        <Alert className="flex items-start gap-3">
          <Info className="h-4 w-4 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium">Click "Check Status" above</p>
            <p className="text-xs text-muted-foreground mt-1">
              Check if this project has been indexed for search
            </p>
          </div>
        </Alert>
      )}
    </div>
  )
}