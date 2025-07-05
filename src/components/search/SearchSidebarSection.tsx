/**
 * Search Sidebar Section - Workspace-integrated search using Breeze MCP
 * 
 * SOLID: Single Responsibility - Search UI only
 * DRY: Reuses existing UI components
 * KISS: Simple search interface
 * Library-First: Uses Breeze MCP server for actual search
 */

import { useState, useEffect } from 'react'
import { Search, FileText, AlertCircle, ChevronDown, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { useProjectStore } from '@/stores'
import { cn } from '@/lib/utils'

interface SearchResult {
  id: string
  file_path: string
  file_type: string
  relevance_score: number
  snippet: string
}

interface SearchSidebarSectionProps {
  onFileSelect?: (filePath: string) => void
  className?: string
}

export function SearchSidebarSection({ onFileSelect, className = '' }: SearchSidebarSectionProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [projectPath, setProjectPath] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState('')
  const { activeProjectId, projects } = useProjectStore()
  
  // Auto-detect project path from active project
  useEffect(() => {
    if (activeProjectId && projects.length > 0) {
      const activeProject = projects.find(p => p.id === activeProjectId)
      if (activeProject?.path) {
        setProjectPath(activeProject.path)
      }
    }
  }, [activeProjectId, projects])

  const handleSearch = async () => {
    if (!query.trim()) return
    
    setIsSearching(true)
    setError('')
    
    try {
      const response = await fetch('/api/search/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query, 
          projectPath,
          limit: 20 
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setResults(data.results || [])
        // Check for special messages
        if (data.message) {
          setError(data.message)
        }
      } else {
        console.error('Search failed:', data.error)
        setResults([])
        // Show user-friendly error for known issues
        if (data.error && data.error.includes('numpy.float32')) {
          setError('Search index needs to be rebuilt. Please re-index the project.')
        } else {
          setError(data.error || 'Search failed')
        }
      }
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
      setError('Failed to connect to search service')
    } finally {
      setIsSearching(false)
    }
  }
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={cn("border-b", className)}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-accent/50 transition-colors">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4" />
          <span className="text-sm font-medium">Search</span>
        </div>
        <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="p-3 pt-0 space-y-4">
          {false ? (
            <Alert className="flex items-start gap-3">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Search Available</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Search is powered by Breeze semantic code indexing
                </p>
              </div>
            </Alert>
          ) : (
            <>
              {/* Search Input */}
              <div className="relative">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search code semantically..."
                  className="pr-10"
                  disabled={isSearching}
                />
                {isSearching ? (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" />
                ) : (
                  <Search 
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground cursor-pointer"
                    onClick={handleSearch}
                  />
                )}
              </div>
              
              {/* Project indexing status */}
              {projectPath && (
                <div className="text-xs text-muted-foreground">
                  <span>Searching in: {projectPath.split('/').pop()}</span>
                </div>
              )}
              
              {/* Error display */}
              {error && (
                <Alert className="flex items-start gap-3">
                  <AlertCircle className="h-4 w-4 mt-0.5 text-destructive" />
                  <div className="flex-1">
                    <p className="text-sm">{error}</p>
                  </div>
                </Alert>
              )}
              
              {/* Results */}
              {results.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {results.length} results
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {projectPath ? 'Project scope' : 'All projects'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1">
                    {results.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => onFileSelect?.(result.file_path)}
                        className="w-full text-left p-2 rounded hover:bg-accent transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <FileText className="w-3 h-3 mt-0.5 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium truncate">
                                {result.file_path}
                              </span>
                              <Badge variant="outline" className="text-xs shrink-0">
                                {(result.relevance_score * 100).toFixed(0)}%
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                              {result.snippet}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}