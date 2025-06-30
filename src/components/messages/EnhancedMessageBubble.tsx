import { format, formatDistanceToNow } from 'date-fns'
import { cn } from '../../lib/utils'
import { RefreshCw, Trash2, Terminal } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { CommandMessage } from './CommandMessage'
import { MarkdownContent, CompactSummaryBlock } from './content-blocks'
import { renderContentItem } from './content-blocks/ContentTypeRegistry'

interface MessageContent {
  type: string
  text?: string
  name?: string
  input?: unknown
  id?: string
  content?: string | object
}

interface EnhancedMessageBubbleProps {
  id: string
  role: string // Changed to allow all role types
  content: string | MessageContent[]
  timestamp?: string | Date
  agentName?: string
  model?: string
  usage?: {
    input_tokens: number
    output_tokens: number
    cache_creation_input_tokens?: number
    cache_read_input_tokens?: number
  }
  isMeta?: boolean
  isCompactSummary?: boolean
  rawData?: unknown
  onRetry?: () => void
  onDelete?: () => void
}

function renderContent(content: string | MessageContent[], role: string) {
  if (typeof content === 'string') {
    // Check if this is a command message
    const commandMatch = content.match(/<command-name>([^<]+)<\/command-name>/)
    const messageMatch = content.match(/<command-message>([^<]+)<\/command-message>/)
    const argsMatch = content.match(/<command-args>([^<]*)<\/command-args>/)
    const outputMatch = content.match(/<local-command-stdout>([^<]+)<\/local-command-stdout>/)

    if (commandMatch || outputMatch) {
      return (
        <CommandMessage
          commandName={commandMatch?.[1] || ''}
          commandMessage={messageMatch?.[1]}
          commandArgs={argsMatch?.[1]}
          output={outputMatch?.[1]}
        />
      )
    }

    // User messages are always plain text - preserve exact formatting
    if (role === 'user') {
      return (
        <div className="text-sm text-foreground break-words whitespace-pre-wrap font-mono">
          {content}
        </div>
      )
    }

    // Assistant messages might contain markdown
    const hasMarkdown = /[*_`#\[\](!]/.test(content) || content.includes('```')

    // For plain text without markdown, preserve formatting
    if (!hasMarkdown) {
      return (
        <div className="text-sm text-foreground break-words whitespace-pre-wrap">{content}</div>
      )
    }

    // For markdown content
    return (
      <div className="text-sm text-foreground break-words">
        <MarkdownContent content={content} />
      </div>
    )
  }

  if (Array.isArray(content)) {
    return (
      <div className="space-y-2">
        {content.map((item, index) => renderContentItem(item, index))}
      </div>
    )
  }

  // Fallback for unknown content format
  return <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(content, null, 2)}</pre>
}

export function EnhancedMessageBubble({
  role,
  content,
  timestamp,
  agentName,
  model,
  usage,
  isMeta,
  isCompactSummary,
  onRetry,
  onDelete,
}: EnhancedMessageBubbleProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  const formattedTime = timestamp ? format(new Date(timestamp), 'PPpp') : null
  const relativeTime = timestamp
    ? formatDistanceToNow(new Date(timestamp), { addSuffix: true })
    : null

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete?.()
      setConfirmDelete(false)
    } else {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 3000)
    }
  }

  // Handle compact summary messages
  if (isCompactSummary) {
    return (
      <CompactSummaryBlock
        content={typeof content === 'string' ? content : JSON.stringify(content)}
        timestamp={timestamp}
      />
    )
  }

  // Handle system messages and other message types
  if (role !== 'user' && role !== 'assistant') {
    return (
      <div className="px-4 py-2 my-2">
        <div className="bg-muted/50 rounded-md p-3 border border-muted">
          <div className="flex items-center gap-2 mb-2">
            <Terminal className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase">
              {role} {isMeta && '(System)'}
            </span>
          </div>
          <div className="text-sm">{renderContent(content, role)}</div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex gap-3 py-4 px-4 group', role === 'assistant' && 'bg-secondary/30')}>
      <div className="flex-shrink-0">
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
            role === 'user'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground'
          )}
        >
          {role === 'user' ? 'U' : 'A'}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1 flex-wrap">
          <span className="font-medium text-sm">
            {role === 'user' ? 'User' : agentName || 'Assistant'}
          </span>

          {role === 'assistant' && model && (
            <Badge variant="outline" className="text-xs">
              {model}
            </Badge>
          )}

          {usage && (
            <Badge variant="secondary" className="text-xs">
              {usage.input_tokens + usage.output_tokens} tokens
            </Badge>
          )}

          {relativeTime && (
            <span
              className="text-xs text-muted-foreground cursor-help"
              title={formattedTime || undefined}
            >
              {relativeTime}
            </span>
          )}

          <div className="ml-auto opacity-0 group-hover:opacity-100 flex gap-1">
            {role === 'assistant' && onRetry && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onRetry}
                className="h-7 px-2"
                title="Retry message"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}

            {onDelete && (
              <Button
                size="sm"
                variant={confirmDelete ? 'destructive' : 'ghost'}
                onClick={handleDelete}
                className="h-7 px-2"
                title={confirmDelete ? 'Click again to confirm' : 'Delete message'}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {renderContent(content, role)}

        {usage && (
          <div className="mt-2 text-xs text-muted-foreground">
            <span>Input: {usage.input_tokens}</span>
            {usage.cache_read_input_tokens && (
              <span> (cache: {usage.cache_read_input_tokens})</span>
            )}
            <span className="mx-2">•</span>
            <span>Output: {usage.output_tokens}</span>
          </div>
        )}
      </div>
    </div>
  )
}
