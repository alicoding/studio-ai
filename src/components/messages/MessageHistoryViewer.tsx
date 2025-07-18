import { useCallback, useEffect, useRef, useState } from 'react'
import { VariableSizeList as List } from 'react-window'
import { EnhancedMessageBubble } from './EnhancedMessageBubble'
import { TypingIndicator } from './TypingIndicator'
import { Loader2 } from 'lucide-react'
import { useWebSocket } from '../../hooks/useWebSocket'
import { useAgentStore } from '../../stores'

interface ToolResultContent {
  type: 'tool_result'
  tool_use_id: string
  content: string
  is_error?: boolean
}

interface ToolUseContent {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
  result?: string
}

interface TextContent {
  type: 'text'
  text: string
}

interface ThinkingContent {
  type: 'thinking'
  thinking: string
}

type MessageContent =
  | ToolResultContent
  | ToolUseContent
  | TextContent
  | ThinkingContent
  | {
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
  rawData?: unknown // For debugging purposes
}

interface MessageHistoryViewerProps {
  projectId: string
  agentId: string | null // Agent instance ID (e.g., "developer_01") - SINGLE SOURCE OF TRUTH, null when no agent selected
  agentName?: string
}

// Helper function to associate tool results with tool uses
function enrichMessagesWithToolResults(messages: Message[]): Message[] {
  // Build a map of tool_use_id to tool_result content
  const toolResultMap = new Map<string, string>()

  messages.forEach((msg) => {
    if (msg.role === 'user' && Array.isArray(msg.content)) {
      msg.content.forEach((item) => {
        if (typeof item === 'object' && 'type' in item && item.type === 'tool_result') {
          const toolResult = item as ToolResultContent
          if (toolResult.tool_use_id) {
            // Handle case where content might be an object with {type, text} structure
            let contentStr = ''
            if (typeof toolResult.content === 'string') {
              contentStr = toolResult.content
            } else if (
              typeof toolResult.content === 'object' &&
              toolResult.content &&
              'text' in toolResult.content
            ) {
              contentStr = (toolResult.content as { text?: string }).text || ''
            }
            toolResultMap.set(toolResult.tool_use_id, contentStr)
          }
        }
      })
    }
  })

  // Enrich tool uses with their results and filter out tool-result-only user messages
  return messages
    .map((msg) => {
      if (msg.role === 'assistant' && Array.isArray(msg.content)) {
        const enrichedContent = msg.content.map((item) => {
          if (typeof item === 'object' && 'type' in item && item.type === 'tool_use') {
            const toolUse = item as ToolUseContent
            if (toolUse.id && toolResultMap.has(toolUse.id)) {
              return {
                ...toolUse,
                result: toolResultMap.get(toolUse.id),
              }
            }
          }
          return item
        })
        return { ...msg, content: enrichedContent }
      }
      return msg
    })
    .filter((msg) => {
      // Filter out user messages that only contain tool results
      if (msg.role === 'user' && Array.isArray(msg.content)) {
        const hasNonToolResult = msg.content.some((item) => {
          return !(typeof item === 'object' && 'type' in item && item.type === 'tool_result')
        })
        return hasNonToolResult
      }
      return true
    })
}

const ESTIMATED_ITEM_HEIGHT = 150 // Increased for richer content
const PAGE_SIZE = 50
const LOAD_MORE_THRESHOLD = 5 // Load more when within 5 items of the top

export function MessageHistoryViewer({ projectId, agentId, agentName }: MessageHistoryViewerProps) {
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
  const [agentTypingStartTime, setAgentTypingStartTime] = useState<number | null>(null)
  const loadedSessionRef = useRef<string | null>(null)

  // Get WebSocket connection
  const { socket } = useWebSocket()

  // Get agent status
  const agent = useAgentStore((state) => state.agents.find((a) => a.id === agentId))

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

  // Reset everything when agent changes
  useEffect(() => {
    console.log('📍 Agent changed:', { agentId })
    setMessages([])
    setHasMore(true)
    cursorRef.current = null
    itemHeights.current = {}
    hasUserScrolled.current = false
    setError(null)
    // Reset loaded session ref when agent changes
    if (loadedSessionRef.current !== agentId) {
      loadedSessionRef.current = null
    }
  }, [agentId])

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

  // Track when agent starts/stops typing
  useEffect(() => {
    if (agent?.status === 'busy' && !agentTypingStartTime) {
      setAgentTypingStartTime(Date.now())
    } else if (agent?.status !== 'busy' && agentTypingStartTime) {
      setAgentTypingStartTime(null)
    }
  }, [agent?.status, agentTypingStartTime])

  // Listen for new messages via WebSocket
  useEffect(() => {
    console.log('Setting up WebSocket message handler:', {
      hasSocket: !!socket,
      socketConnected: socket?.connected,
      agentId,
      projectId,
    })

    if (!socket || !agentId) return

    const handleNewMessage = (data: {
      sessionId: string
      projectId?: string
      agentId?: string
      message: {
        id?: string
        role: string
        content: string | MessageContent[]
        timestamp?: string
        model?: string
        isMeta?: boolean
        isCompactSummary?: boolean
        usage?: Message['usage']
        isStreaming?: boolean
      }
    }) => {
      // Use agentId for WebSocket matching (agent instance ID)
      const webSocketSessionId = agentId

      console.log('WebSocket message received:', {
        dataSessionId: data.sessionId,
        dataProjectId: data.projectId,
        dataAgentId: data.agentId,
        webSocketSessionId: webSocketSessionId,
        ourProjectId: projectId,
        ourAgentId: agentId,
        // Using agentId for WebSocket routing
        matches: data.sessionId === webSocketSessionId && data.projectId === projectId,
        message: data.message,
        isStreaming: data.message.isStreaming,
      })

      // Only handle messages for our agent AND project
      // This prevents cross-project message contamination
      if (data.sessionId === webSocketSessionId && data.projectId === projectId) {
        const newMessage: Message = {
          id: data.message.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
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
              detail: { agentId },
            })
          )
        }

        // Always append messages as-is, let the UI handle rendering
        setMessages((prev) => [...prev, newMessage])
      }
    }

    // Set up message handler
    socket.on('message:new', handleNewMessage)

    // Test if we're receiving any events at all
    socket.onAny((eventName, ...args) => {
      console.log('WebSocket event received:', eventName, args)
    })

    // Handle WebSocket reconnection
    const handleReconnect = () => {
      console.log('WebSocket reconnected, re-establishing message subscriptions')
      // The socket.on above will be re-established automatically
      // Trigger a custom event to reload messages after reconnection
      if (messages.length > 0) {
        window.dispatchEvent(new CustomEvent('reload-messages-after-reconnect'))
      }
    }

    window.addEventListener('websocket-reconnected', handleReconnect)

    return () => {
      socket.off('message:new', handleNewMessage)
      socket.offAny()
      window.removeEventListener('websocket-reconnected', handleReconnect)
    }
  }, [socket, agentId, agentName, messages.length, projectId])

  const loadMoreMessages = useCallback(async () => {
    if (loading || !hasMore || !agentId || !projectId) {
      console.log('📍 loadMoreMessages early return:', { loading, hasMore, agentId, projectId })
      return
    }

    console.log('🔄 Loading more messages for agent:', agentId, 'current count:', messages.length)
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        limit: PAGE_SIZE.toString(),
        ...(cursorRef.current && { cursor: cursorRef.current }),
      })

      // Use agent-based messages endpoint - let server handle session mapping internally
      const url = `/api/studio-projects/${projectId}/agents/${agentId}/messages?${params}`
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
      const newMessages = (data.messages || []).map((msg: Message) => ({
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
  }, [agentId, projectId, loading, hasMore, messages.length])

  // Load initial messages when agentId or projectId changes
  useEffect(() => {
    console.log('📍 Message loading effect triggered:', {
      agentId,
      projectId,
      messagesLength: messages.length,
      loading,
      hasAgentId: !!agentId,
      hasProjectId: !!projectId,
      loadedAgent: loadedSessionRef.current,
    })

    // Check if we need to load messages for this agent
    const needsLoad =
      agentId &&
      projectId &&
      !loading &&
      (messages.length === 0 || loadedSessionRef.current !== agentId)

    if (needsLoad) {
      console.log('📍 Loading messages for agent:', agentId, '(was:', loadedSessionRef.current, ')')
      loadedSessionRef.current = agentId
      loadMoreMessages()
    }
  }, [agentId, projectId, loading, loadMoreMessages, messages.length]) // Include loadMoreMessages for React rules

  // Listen for session clear events
  useEffect(() => {
    const handleSessionCleared = (event: CustomEvent) => {
      const { agentId: clearedAgentId, oldSessionId, newSessionId } = event.detail

      // Check if this is the session we're viewing
      // Compare using the agentId prop which is the agent instance ID
      const isThisSession = agentId === clearedAgentId

      if (isThisSession) {
        console.log('🗑️ Session cleared, resetting message history for:', {
          agentId,
          clearedAgentId,
          oldSessionId,
          newSessionId,
        })
        setMessages([])
        setHasMore(true)
        setError(null)
        cursorRef.current = null
        itemHeights.current = {}
        loadedSessionRef.current = null

        // Reset list if available
        if (listRef.current) {
          listRef.current.resetAfterIndex(0)
        }
      }
    }

    window.addEventListener('agent-session-cleared', handleSessionCleared as EventListener)

    return () => {
      window.removeEventListener('agent-session-cleared', handleSessionCleared as EventListener)
    }
  }, [agentId])

  // Listen for reload messages after reconnection
  useEffect(() => {
    const handleReloadMessages = () => {
      console.log('Reloading messages after WebSocket reconnection')
      // Small delay to ensure server is ready
      setTimeout(() => {
        loadMoreMessages()
      }, 500)
    }

    window.addEventListener('reload-messages-after-reconnect', handleReloadMessages)

    return () => {
      window.removeEventListener('reload-messages-after-reconnect', handleReloadMessages)
    }
  }, [loadMoreMessages])

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

  // Enrich messages with tool results before rendering
  const enrichedMessages = enrichMessagesWithToolResults(messages)

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const message = enrichedMessages[index]
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

  const itemCount = loading && messages.length === 0 ? 1 : enrichedMessages.length

  const isTyping = agent?.status === 'busy' && agentTypingStartTime
  const typingIndicatorHeight = 72 // Approximate height of typing indicator (p-4 + content + border)

  // Early return when no agent is selected (after all hooks)
  if (!agentId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground">No agent selected</p>
          <p className="text-sm text-muted-foreground">Select an agent to view message history</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="h-full bg-background relative">
      <List
        ref={listRef}
        height={isTyping ? containerHeight - typingIndicatorHeight : containerHeight}
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
      {isTyping && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
          <TypingIndicator
            agentName={agentName || agent.name}
            startTime={agentTypingStartTime}
            tokenCount={agent.tokens}
          />
        </div>
      )}
    </div>
  )
}
