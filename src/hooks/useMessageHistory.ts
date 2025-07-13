import { useState, useCallback, useRef } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  agentName?: string
}

interface UseMessageHistoryOptions {
  pageSize?: number
  initialMessages?: Message[]
}

interface UseMessageHistoryReturn {
  messages: Message[]
  loading: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => Promise<void>
  reset: () => void
}

export function useMessageHistory(
  projectId: string,
  sessionId: string,
  options: UseMessageHistoryOptions = {}
): UseMessageHistoryReturn {
  const { pageSize = 50, initialMessages = [] } = options
  
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const cursorRef = useRef<string | null>(null)

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        ...(cursorRef.current && { cursor: cursorRef.current })
      })
      
      const response = await fetch(
        `/api/projects/${projectId}/sessions/${sessionId}/messages?${params}`
      )
      
      if (!response.ok) {
        throw new Error(`Failed to load messages: ${response.statusText}`)
      }

      const data = await response.json()
      
      // Messages are returned newest first, but we display oldest first
      const newMessages = data.messages.reverse()
      
      setMessages(prev => [...newMessages, ...prev])
      setHasMore(data.hasMore)
      cursorRef.current = data.nextCursor
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages')
    } finally {
      setLoading(false)
    }
  }, [projectId, sessionId, pageSize, loading, hasMore])

  const reset = useCallback(() => {
    setMessages([])
    setLoading(false)
    setError(null)
    setHasMore(true)
    cursorRef.current = null
  }, [])

  return {
    messages,
    loading,
    error,
    hasMore,
    loadMore,
    reset
  }
}