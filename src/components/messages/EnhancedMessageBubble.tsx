import { format, formatDistanceToNow } from 'date-fns'
import { cn } from '../../lib/utils'
import { ChevronDown, ChevronRight, Copy, Check, RefreshCw, Trash2, Terminal, FileJson, AlertCircle } from 'lucide-react'
import { useState, useCallback } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Button } from '../ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible'
import { Badge } from '../ui/badge'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { CommandMessage } from './CommandMessage'

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
  rawData?: any
  onRetry?: () => void
  onDelete?: () => void
}


function detectLanguage(code: string): string {
  // Simple language detection based on content
  if (code.includes('function') || code.includes('const ') || code.includes('let ')) return 'javascript'
  if (code.includes('def ') || code.includes('import ') || code.includes('print(')) return 'python'
  if (code.includes('interface ') || code.includes('type ') || code.includes(': string')) return 'typescript'
  if (code.includes('<div') || code.includes('<span') || code.includes('</')) return 'html'
  if (code.includes('{') && code.includes('}') && code.includes(':')) return 'json'
  if (code.includes('SELECT') || code.includes('FROM') || code.includes('WHERE')) return 'sql'
  return 'text'
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false)
  const detectedLang = language || detectLanguage(code)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [code])

  return (
    <div className="relative group my-2">
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCopy}
          className="h-7 px-2"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>
      <SyntaxHighlighter
        language={detectedLang}
        style={oneDark}
        className="rounded-md !bg-secondary"
        customStyle={{
          margin: 0,
          fontSize: '0.875rem',
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}

function ToolUseBlock({ name, input }: { name: string; input: unknown }) {
  const [isOpen, setIsOpen] = useState(false)
  const inputStr = typeof input === 'string' ? input : JSON.stringify(input, null, 2)
  const isLarge = inputStr.length > 200

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="my-2 p-3 bg-secondary/50 rounded-md border border-border">
        <CollapsibleTrigger className="flex items-center gap-2 w-full text-left hover:opacity-80">
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <Terminal className="h-4 w-4 text-blue-500" />
          <span className="font-medium text-sm">Tool: {name}</span>
          {isLarge && !isOpen && (
            <span className="text-xs text-muted-foreground ml-auto">Click to expand</span>
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden">
          <div className="mt-2 overflow-auto max-h-[400px]">
            <CodeBlock code={inputStr} language="json" />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

function ToolResultBlock({ content }: { content: string | object }) {
  const [isOpen, setIsOpen] = useState(true)
  const contentStr = typeof content === 'string' ? content : JSON.stringify(content, null, 2)
  const isLarge = contentStr.length > 500

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="my-2 p-3 bg-green-500/10 rounded-md border border-green-500/20">
        <CollapsibleTrigger className="flex items-center gap-2 w-full text-left hover:opacity-80">
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <FileJson className="h-4 w-4 text-green-500" />
          <span className="font-medium text-sm text-green-700 dark:text-green-400">Tool Result</span>
          {isLarge && !isOpen && (
            <span className="text-xs text-muted-foreground ml-auto">Click to expand</span>
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden">
          <div className="mt-2 overflow-auto max-h-[400px]">
            {typeof content === 'string' ? (
              <pre className="text-sm whitespace-pre-wrap break-words">{content}</pre>
            ) : (
              <CodeBlock code={contentStr} language="json" />
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

// Configure marked to preserve breaks
marked.setOptions({
  breaks: true,
  gfm: true,
  pedantic: false,
})

function MarkdownContent({ content }: { content: string }) {
  // Process content to preserve multiple newlines
  const processedContent = content
    .replace(/\n\n+/g, (match) => {
      // Replace multiple newlines with HTML breaks
      return '\n\n' + '<br/>'.repeat(match.length - 2)
    })
  
  const html = marked.parse(processedContent) as string
  const cleanHtml = DOMPurify.sanitize(html)
  
  return (
    <div 
      className="prose prose-sm dark:prose-invert max-w-none [&_p]:whitespace-pre-line"
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
    />
  )
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
        <div className="text-sm text-foreground break-words whitespace-pre-wrap">
          {content}
        </div>
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
        {content.map((item, index) => {
          if (item.type === 'text' && item.text) {
            return (
              <div key={index} className="text-sm text-foreground break-words">
                <MarkdownContent content={item.text} />
              </div>
            )
          }
          
          if (item.type === 'tool_use' && item.name) {
            return <ToolUseBlock key={index} name={item.name} input={item.input} />
          }
          
          if (item.type === 'tool_result' && item.content) {
            return <ToolResultBlock key={index} content={item.content} />
          }
          
          // Handle unknown content types gracefully
          return (
            <div key={index} className="my-2 p-3 bg-yellow-500/10 rounded-md border border-yellow-500/20">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">Unknown content type: {item.type}</span>
              </div>
              <pre className="mt-2 text-xs overflow-x-auto">
                {JSON.stringify(item, null, 2)}
              </pre>
            </div>
          )
        })}
      </div>
    )
  }

  // Fallback for unknown content format
  return (
    <pre className="text-sm whitespace-pre-wrap">
      {JSON.stringify(content, null, 2)}
    </pre>
  )
}

export function EnhancedMessageBubble({
  role,
  content,
  timestamp,
  agentName,
  model,
  usage,
  isMeta,
  onRetry,
  onDelete,
}: EnhancedMessageBubbleProps) {
  const [showTimestamp, setShowTimestamp] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const formattedTime = timestamp ? format(new Date(timestamp), 'PPpp') : null
  const relativeTime = timestamp ? formatDistanceToNow(new Date(timestamp), { addSuffix: true }) : null

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete?.()
      setConfirmDelete(false)
    } else {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 3000)
    }
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
          <div className="text-sm">
            {renderContent(content, role)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex gap-3 py-4 px-4 group hover:bg-secondary/20 transition-colors",
        role === 'assistant' && "bg-secondary/30"
      )}
      onMouseEnter={() => setShowTimestamp(true)}
      onMouseLeave={() => setShowTimestamp(false)}
    >
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
              {showTimestamp && formattedTime ? formattedTime : relativeTime}
            </span>
          )}
          
          <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
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
                variant={confirmDelete ? "destructive" : "ghost"}
                onClick={handleDelete}
                className="h-7 px-2"
                title={confirmDelete ? "Click again to confirm" : "Delete message"}
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