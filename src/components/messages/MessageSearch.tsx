import { useState, useEffect, useCallback } from 'react'
import { Search, Calendar, Clock, Filter, User, Bot, Settings as SettingsIcon } from 'lucide-react'
import { Input } from '../ui/input'
import { Card } from '../ui/card'
import { Badge } from '../ui/badge'
import { ScrollArea } from '../ui/scroll-area'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Checkbox } from '../ui/checkbox'
import { Label } from '../ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'

interface Message {
  timestamp: string
  text: string
  lineNumber: number
  type: 'user' | 'assistant' | 'system' | 'other'
  role?: string
  metadata?: Record<string, string | number | boolean>
}

interface Project {
  name: string
  path: string
  conversations: Conversation[]
}

interface Conversation {
  id: string
  filename: string
  path: string
  lastModified: string
  size: number
  messageCount: number
  messageTypes: {
    user: number
    assistant: number
    system: number
    other: number
  }
}

export function MessageSearch() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [selectedConversation, setSelectedConversation] = useState<string>('')
  const [conversationSearch, setConversationSearch] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [availableFilters, setAvailableFilters] = useState<Map<string, Set<string>>>(new Map())
  const [activeFilters, setActiveFilters] = useState<Map<string, Set<string>>>(new Map())
  const [startDateTime, setStartDateTime] = useState<string>('')
  const [endDateTime, setEndDateTime] = useState<string>('')

  // Load projects on mount
  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/claude-projects')

      if (!response.ok) {
        throw new Error('Failed to load projects')
      }

      const data = await response.json()
      setProjects(data.projects)

      // Auto-select first project and conversation if available
      if (data.projects.length > 0) {
        setSelectedProject(data.projects[0].path)
        if (data.projects[0].conversations.length > 0) {
          setSelectedConversation(data.projects[0].conversations[0].path)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = useCallback(async () => {
    if (!selectedConversation) return

    try {
      setLoading(true)
      // Load ALL messages from the conversation - no filtering at API level
      const params = new URLSearchParams({
        file: selectedConversation,
      })

      const response = await fetch(`/api/session/search?${params}`)

      if (!response.ok) {
        throw new Error('Failed to load messages')
      }

      const data = await response.json()
      setMessages(data.messages || [])

      // Collect all available filters dynamically from the data
      const filters = new Map<string, Set<string>>()

      // Always add message type as a filter
      filters.set('type', new Set<string>())

      data.messages.forEach((msg: Message) => {
        // Add message type
        filters.get('type')!.add(msg.type)

        // Add any metadata fields as filters
        if (msg.metadata) {
          Object.entries(msg.metadata).forEach(([key, value]) => {
            if (!filters.has(key)) {
              filters.set(key, new Set<string>())
            }
            filters.get(key)!.add(String(value))
          })
        }
      })

      setAvailableFilters(filters)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages')
    } finally {
      setLoading(false)
    }
  }, [selectedConversation])

  useEffect(() => {
    if (selectedConversation) {
      loadMessages()
    }
  }, [loadMessages, selectedConversation])

  // Apply filters on the client side
  useEffect(() => {
    let filtered = [...messages]

    // Apply dynamic filters
    activeFilters.forEach((selectedValues, filterKey) => {
      if (selectedValues.size > 0) {
        filtered = filtered.filter((msg) => {
          if (filterKey === 'type') {
            return selectedValues.has(msg.type)
          } else if (msg.metadata && msg.metadata[filterKey] !== undefined) {
            return selectedValues.has(String(msg.metadata[filterKey]))
          }
          return true
        })
      }
    })

    // Filter by date range
    if (startDateTime) {
      const startTime = new Date(startDateTime).getTime()
      filtered = filtered.filter((msg) => new Date(msg.timestamp).getTime() >= startTime)
    }

    if (endDateTime) {
      const endTime = new Date(endDateTime).getTime()
      filtered = filtered.filter((msg) => new Date(msg.timestamp).getTime() <= endTime)
    }

    // Filter by search term
    if (searchTerm.trim()) {
      filtered = filtered.filter((msg) => msg.text.toLowerCase().includes(searchTerm.toLowerCase()))
    }

    setFilteredMessages(filtered)
  }, [messages, activeFilters, startDateTime, endDateTime, searchTerm])

  const handleSearch = (term: string) => {
    setSearchTerm(term)
  }

  const handleProjectChange = (projectPath: string) => {
    setSelectedProject(projectPath)
    const project = projects.find((p) => p.path === projectPath)
    if (project && project.conversations.length > 0) {
      setSelectedConversation(project.conversations[0].path)
    } else {
      setSelectedConversation('')
    }
    // Reset filters when changing projects
    setActiveFilters(new Map())
    setStartDateTime('')
    setEndDateTime('')
    setSearchTerm('')
  }

  const toggleFilter = (filterKey: string, value: string) => {
    setActiveFilters((prev) => {
      const newFilters = new Map(prev)
      if (!newFilters.has(filterKey)) {
        newFilters.set(filterKey, new Set())
      }
      const values = newFilters.get(filterKey)!
      if (values.has(value)) {
        values.delete(value)
        if (values.size === 0) {
          newFilters.delete(filterKey)
        }
      } else {
        values.add(value)
      }
      return newFilters
    })
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
    }
  }

  const getMessageIcon = (type: Message['type']) => {
    switch (type) {
      case 'user':
        return <User className="h-4 w-4" />
      case 'assistant':
        return <Bot className="h-4 w-4" />
      case 'system':
        return <SettingsIcon className="h-4 w-4" />
      default:
        return null
    }
  }

  const getMessageTypeColor = (type: Message['type']) => {
    switch (type) {
      case 'user':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'assistant':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'system':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    }
  }

  const selectedProjectData = projects.find((p) => p.path === selectedProject)

  if (loading && projects.length === 0) {
    return <div className="p-4">Loading projects...</div>
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b space-y-4">
        <h2 className="text-lg font-semibold">Search Claude Messages</h2>

        {/* Project and Conversation Selection */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Project</Label>
            <Select value={selectedProject} onValueChange={handleProjectChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.path} value={project.path}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Conversation</Label>
            <Select
              value={selectedConversation}
              onValueChange={(value) => {
                setSelectedConversation(value)
                // Don't reset filters - let user keep them across conversations
              }}
            >
              <SelectTrigger disabled={!selectedProjectData}>
                <SelectValue placeholder="Select a conversation" />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2">
                  <Input
                    type="text"
                    placeholder="Search conversations..."
                    value={conversationSearch}
                    onChange={(e) => setConversationSearch(e.target.value)}
                    className="mb-2"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                {selectedProjectData?.conversations
                  .filter(
                    (conv) =>
                      conversationSearch.trim() === '' ||
                      conv.id.toLowerCase().includes(conversationSearch.toLowerCase()) ||
                      new Date(conv.lastModified).toLocaleDateString().includes(conversationSearch)
                  )
                  .sort(
                    (a, b) =>
                      new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
                  )
                  .map((conv) => (
                    <SelectItem key={conv.path} value={conv.path}>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm truncate">{conv.id}</span>
                          <Badge variant="secondary" className="text-xs">
                            {conv.messageCount} msgs
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{new Date(conv.lastModified).toLocaleDateString()}</span>
                          <span className="text-[10px]">
                            {conv.messageTypes.user > 0 && `${conv.messageTypes.user} user`}
                            {conv.messageTypes.assistant > 0 &&
                              `, ${conv.messageTypes.assistant} assistant`}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                {selectedProjectData?.conversations.filter(
                  (conv) =>
                    conversationSearch.trim() === '' ||
                    conv.id.toLowerCase().includes(conversationSearch.toLowerCase()) ||
                    new Date(conv.lastModified).toLocaleDateString().includes(conversationSearch)
                ).length === 0 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No conversations found matching "{conversationSearch}"
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 max-h-[600px] overflow-y-auto">
              <div className="space-y-4">
                {availableFilters.size > 0 ? (
                  Array.from(availableFilters.entries()).map(([filterKey, values]) => (
                    <div key={filterKey}>
                      <Label className="text-sm font-medium capitalize">
                        {filterKey.replace(/([A-Z])/g, ' $1').trim()}
                      </Label>
                      <div className="mt-2 space-y-2">
                        {Array.from(values)
                          .sort()
                          .map((value) => (
                            <div key={value} className="flex items-center space-x-2">
                              <Checkbox
                                id={`${filterKey}-${value}`}
                                checked={activeFilters.get(filterKey)?.has(value) || false}
                                onCheckedChange={() => toggleFilter(filterKey, value)}
                              />
                              <Label
                                htmlFor={`${filterKey}-${value}`}
                                className="text-sm font-normal cursor-pointer"
                              >
                                {value}
                              </Label>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No filters available</p>
                )}

                <div className="space-y-2 border-t pt-4 mt-4">
                  <Label className="text-sm font-medium">Time Range</Label>
                  <div className="space-y-2">
                    <div>
                      <Label htmlFor="start-time" className="text-xs text-muted-foreground">
                        Start Time
                      </Label>
                      <Input
                        id="start-time"
                        type="datetime-local"
                        value={startDateTime}
                        onChange={(e) => setStartDateTime(e.target.value)}
                        placeholder="Start time"
                      />
                    </div>
                    <div>
                      <Label htmlFor="end-time" className="text-xs text-muted-foreground">
                        End Time
                      </Label>
                      <Input
                        id="end-time"
                        type="datetime-local"
                        value={endDateTime}
                        onChange={(e) => setEndDateTime(e.target.value)}
                        placeholder="End time"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="text-sm text-muted-foreground">
          Found {filteredMessages.length} of {messages.length} messages
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {filteredMessages.map((msg, index) => {
            const { date, time } = formatTimestamp(msg.timestamp)
            return (
              <Card key={index} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`flex items-center gap-1 ${getMessageTypeColor(msg.type)}`}
                    >
                      {getMessageIcon(msg.type)}
                      {msg.type}
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {date}
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {time}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">Line {msg.lineNumber}</span>
                </div>
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap">
                    {searchTerm ? highlightText(msg.text, searchTerm) : msg.text}
                  </p>
                </div>
              </Card>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}

function highlightText(text: string, term: string) {
  if (!term) return text

  const regex = new RegExp(`(${term})`, 'gi')
  const parts = text.split(regex)

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-800">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  )
}
