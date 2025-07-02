import { format } from 'date-fns'
import { MessageParser, type MessagePart } from './MessageParser'
import { cn } from '../../lib/utils'

interface MessageBubbleProps {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string | Date
  agentName?: string
}

const parser = new MessageParser()

function renderMessagePart(part: MessagePart) {
  switch (part.type) {
    case 'text':
      return <span>{part.content}</span>
    
    case 'mention':
      return (
        <span className="text-blue-500 font-medium hover:text-blue-400 cursor-pointer">
          {part.content}
        </span>
      )
    
    case 'command':
      return (
        <span className="text-green-500 font-medium hover:text-green-400 cursor-pointer">
          {part.content}
        </span>
      )
    
    case 'code':
      return (
        <pre className="block my-2 p-3 bg-secondary rounded-md overflow-x-auto">
          <code className={cn("text-sm", part.language && `language-${part.language}`)}>
            {part.code}
          </code>
        </pre>
      )
    
    default:
      return null
  }
}

export function MessageBubble({ role, content, timestamp, agentName }: MessageBubbleProps) {
  const parsed = parser.parse(content)
  const formattedTime = timestamp 
    ? format(new Date(timestamp), 'HH:mm:ss')
    : null

  return (
    <div className={cn(
      "flex gap-3 py-4 px-4",
      role === 'assistant' && "bg-secondary/30"
    )}>
      <div className="flex-shrink-0">
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
          role === 'user' 
            ? "bg-primary text-primary-foreground" 
            : "bg-secondary text-secondary-foreground"
        )}>
          {role === 'user' ? 'U' : 'A'}
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="font-medium text-sm">
            {role === 'user' ? 'User' : agentName || 'Assistant'}
          </span>
          {formattedTime && (
            <span className="text-xs text-muted-foreground">{formattedTime}</span>
          )}
        </div>
        
        <div className="text-sm text-foreground break-words">
          {parsed.parts.map((part, index) => (
            <span key={index}>{renderMessagePart(part)}</span>
          ))}
        </div>
      </div>
    </div>
  )
}