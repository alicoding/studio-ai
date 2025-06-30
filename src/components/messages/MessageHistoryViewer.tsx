import { useCallback, useEffect, useRef, useState } from 'react'
import { VariableSizeList as List } from 'react-window'
import { EnhancedMessageBubble } from './EnhancedMessageBubble'
import { Loader2 } from 'lucide-react'
import { useWebSocket } from '../../hooks/useWebSocket'

interface MessageContent {
  type: string
  text?: string
  name?: string
  input?: unknown
  id?: string
  content?: string | object
}

interface Message {
  id: string
  role: string // Changed from 'user' | 'assistant' to allow all message types
  content: string | MessageContent[]
  timestamp: string
  agentName?: string
  type?: string
  model?: string
  stop_reason?: string
  stop_sequence?: string | null
  usage?: {
    input_tokens: number
    output_tokens: number
    cache_creation_input_tokens?: number
    cache_read_input_tokens?: number
  }
  isMeta?: boolean
  isCompactSummary?: boolean
  messageId?: string
  rawData?: any // For debugging purposes
}

interface MessageHistoryViewerProps {
  sessionId: string
  projectId: string
  agentName?: string
}

const ESTIMATED_ITEM_HEIGHT = 150 // Increased for richer content
const PAGE_SIZE = 50
const LOAD_MORE_THRESHOLD = 5 // Load more when within 5 items of the top

export function MessageHistoryViewer({
  sessionId,
  projectId,
  agentName,
}: MessageHistoryViewerProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cursorRef = useRef<string | null>(null)
  const listRef = useRef<List>(null)
  const itemHeights = useRef<{ [key: number]: number }>({})
  const hasUserScrolled = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerHeight, setContainerHeight] = useState(600)

  // Get WebSocket connection
  const { socket } = useWebSocket()

  // Get item size
  const getItemSize = useCallback((index: number) => {
    return itemHeights.current[index] || ESTIMATED_ITEM_HEIGHT
  }, [])

  // Set item size after measurement
  const setItemSize = useCallback((index: number, size: number) => {
    itemHeights.current[index] = size
    if (listRef.current) {
      listRef.current.resetAfterIndex(index)
    }
  }, [])

  // Reset everything when session changes
  useEffect(() => {
    setMessages([])
    setHasMore(true)
    cursorRef.current = null
    itemHeights.current = {}
    hasUserScrolled.current = false
    setError(null)
  }, [sessionId])

  // Track container height
  useEffect(() => {
    if (!containerRef.current) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.contentRect.height
        if (height > 0) {
          setContainerHeight(height)
        }
      }
    })

    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  // Listen for new messages via WebSocket
  useEffect(() => {
    if (!socket || !sessionId) return

    const handleNewMessage = (data: { sessionId: string; message: any }) => {
      console.log('WebSocket message received:', {
        dataSessionId: data.sessionId,
        currentSessionId: sessionId,
        matches: data.sessionId === sessionId,
        message: data.message,
      })

      // Only handle messages for our session
      if (data.sessionId === sessionId) {
        const newMessage: Message = {
          id: data.message.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          role: data.message.role,
          content: data.message.content,
          timestamp: data.message.timestamp || new Date().toISOString(),
          model: data.message.model,
          agentName: data.message.role === 'assistant' ? agentName : undefined,
          isMeta: data.message.isMeta || false,
          isCompactSummary: data.message.isCompactSummary || false,
          usage: data.message.usage,
          rawData: data.message,
        }

        // Check if this is a compact command output
        const contentStr = typeof data.message.content === 'string' ? data.message.content : ''
        if (contentStr.includes('<local-command-stdout>Compacted')) {
          // Trigger a refresh of the token count
          // This will cause the parent component to re-fetch agent data
          window.dispatchEvent(
            new CustomEvent('session-compacted', {
              detail: { sessionId },
            })
          )
        }

        // Append to messages (including system messages)
        setMessages((prev) => [...prev, newMessage])
      }
    }

    socket.on('message:new', handleNewMessage)

    return () => {
      socket.off('message:new', handleNewMessage)
    }
  }, [socket, sessionId, agentName])

  const loadMoreMessages = useCallback(async () => {
    if (loading || !hasMore || !sessionId || !projectId) return

    console.log('🔄 Loading more messages, current count:', messages.length)
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        limit: PAGE_SIZE.toString(),
        ...(cursorRef.current && { cursor: cursorRef.current }),
      })

      const url = `/api/projects/${projectId}/sessions/${sessionId}/messages?${params}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Failed to load messages: ${response.status}`)
      }

      const data = await response.json()
      console.log('📦 Received data:', {
        messageCount: data.messages?.length,
        hasMore: data.hasMore,
        cursor: data.nextCursor,
      })

      // Don't filter - show all messages including system messages
      const newMessages = (data.messages || []).map((msg: any) => ({
        ...msg,
        isCompactSummary: msg.isCompactSummary || false,
      }))

      if (newMessages.length > 0) {
        if (cursorRef.current) {
          // Prepending older messages
          setMessages((prev) => [...newMessages, ...prev])
          // Adjust item heights indices
          const newHeights: { [key: number]: number } = {}
          Object.keys(itemHeights.current).forEach((key) => {
            newHeights[parseInt(key) + newMessages.length] = itemHeights.current[parseInt(key)]
          })
          itemHeights.current = newHeights
        } else {
          // Initial load
          setMessages(newMessages)
        }
      } else {
        // No more messages
        setHasMore(false)
      }

      setHasMore(data.hasMore || false)
      cursorRef.current = data.nextCursor || null
    } catch (err) {
      console.error('Error loading messages:', err)
      setError(err instanceof Error ? err.message : 'Failed to load messages')
    } finally {
      setLoading(false)
    }
  }, [sessionId, projectId, loading, hasMore, messages.length])

  // Load initial messages
  useEffect(() => {
    if (sessionId && projectId && messages.length === 0) {
      loadMoreMessages()
    }
  }, [sessionId, projectId, messages.length, loadMoreMessages])

  // Always scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0 && listRef.current) {
      // Small delay to ensure sizes are calculated
      setTimeout(() => {
        if (listRef.current) {
          console.log('📍 Scrolling to bottom')
          listRef.current.scrollToItem(messages.length - 1, 'end')
        }
      }, 100)
    }
  }, [messages])

  // Handle scroll to check if we need to load more
  const handleScroll = useCallback(
    ({
      scrollOffset,
      scrollDirection,
    }: {
      scrollOffset: number
      scrollDirection: 'forward' | 'backward'
    }) => {
      // Mark that user has scrolled
      if (!hasUserScrolled.current && scrollOffset > 0) {
        hasUserScrolled.current = true
      }

      // Only load more if:
      // 1. User is scrolling up (backward)
      // 2. We're near the top
      // 3. We have more messages to load
      // 4. Not currently loading
      // 5. User has actually scrolled (prevents auto-loading when viewport isn't full)
      if (
        scrollDirection === 'backward' &&
        scrollOffset < LOAD_MORE_THRESHOLD * ESTIMATED_ITEM_HEIGHT &&
        hasMore &&
        !loading &&
        messages.length > 0 &&
        hasUserScrolled.current
      ) {
        loadMoreMessages()
      }
    },
    [hasMore, loading, loadMoreMessages, messages.length]
  )

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const message = messages[index]
    const measureRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
      if (!measureRef.current) return

      // Delay ResizeObserver setup to avoid interfering with initial render
      const timer = setTimeout(() => {
        if (!measureRef.current) return

        const resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const height = entry.contentRect.height
            if (height > 0 && Math.abs(height - getItemSize(index)) > 5) {
              setItemSize(index, height)
            }
          }
        })

        resizeObserver.observe(measureRef.current)

        return () => {
          resizeObserver.disconnect()
        }
      }, 50)

      return () => {
        clearTimeout(timer)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [index, getItemSize, setItemSize])

    if (!message) {
      // Loading indicator at the top
      if (index === 0 && loading) {
        return (
          <div
            style={{
              position: 'absolute',
              top: style.top,
              left: 0,
              width: '100%',
            }}
            className="flex items-center justify-center p-4"
          >
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )
      }
      return null
    }

    return (
      <div
        ref={measureRef}
        style={{
          position: 'absolute',
          top: style.top,
          left: 0,
          width: '100%',
        }}
      >
        <EnhancedMessageBubble
          id={message.id}
          role={message.role}
          content={message.content}
          timestamp={message.timestamp}
          agentName={message.agentName || agentName}
          model={message.model}
          usage={message.usage}
          isMeta={message.isMeta}
          isCompactSummary={message.isCompactSummary}
          rawData={message.rawData}
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-destructive mb-2">{error}</p>
          <button
            onClick={() => loadMoreMessages()}
            className="text-sm text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  const itemCount = loading && messages.length === 0 ? 1 : messages.length

  return (
    <div ref={containerRef} className="h-full bg-background relative">
      <List
        ref={listRef}
        height={containerHeight}
        itemCount={itemCount}
        itemSize={getItemSize}
        onScroll={handleScroll}
        width="100%"
        className="scrollbar-thin scrollbar-thumb-secondary"
        style={{ overflow: 'auto' }}
        overscanCount={5}
        initialScrollOffset={0}
      >
        {Row}
      </List>
    </div>
  )
}
