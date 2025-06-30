import { useState, useRef } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import { CommandSuggestions } from './CommandSuggestions'

interface Agent {
  id: string
  role: string
  status: 'ready' | 'online' | 'busy' | 'offline'
}

interface ChatPanelProps {
  agents: Agent[]
  onSendMessage: (message: string) => void | Promise<void>
  onBroadcast: () => void
  onInterrupt: () => void
}

export function ChatPanel({ agents, onSendMessage, onBroadcast, onInterrupt }: ChatPanelProps) {
  const [message, setMessage] = useState('')
  const [showMentions, setShowMentions] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const [showCommands, setShowCommands] = useState<'slash' | 'hash' | null>(null)
  const [commandFilter, setCommandFilter] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setMessage(value)

    const lastWord = value.split(' ').pop() || ''
    
    // Check for mentions
    if (lastWord.startsWith('@') && lastWord.length > 1) {
      setMentionFilter(lastWord.substring(1).toLowerCase())
      setShowMentions(true)
      setShowCommands(null)
    } 
    // Check for slash commands
    else if (lastWord.startsWith('/') && lastWord.length >= 1) {
      setCommandFilter(lastWord.substring(1).toLowerCase())
      setShowCommands('slash')
      setShowMentions(false)
    }
    // Check for hash commands
    else if (lastWord.startsWith('#') && lastWord.length >= 1) {
      setCommandFilter(lastWord.substring(1).toLowerCase())
      setShowCommands('hash')
      setShowMentions(false)
    }
    else {
      setShowMentions(false)
      setShowCommands(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (message.trim()) {
        onSendMessage(message) // Don't trim here to preserve formatting
        setMessage('')
        setShowMentions(false)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onInterrupt()
    }
  }

  const completeMention = (agentId: string) => {
    const words = message.split(' ')
    words[words.length - 1] = `@${agentId}`
    setMessage(words.join(' ') + ' ')
    setShowMentions(false)
    inputRef.current?.focus()
  }

  const completeCommand = (command: string) => {
    const words = message.split(' ')
    words[words.length - 1] = command
    setMessage(words.join(' ') + ' ')
    setShowCommands(null)
    inputRef.current?.focus()
  }

  const filteredAgents = agents.filter(
    (agent) => agent.status !== 'offline' && agent.id.toLowerCase().includes(mentionFilter)
  )

  const statusColors: Record<string, string> = {
    ready: '#10b981',
    online: '#3b82f6',
    busy: '#f59e0b',
    offline: '#6b7280',
  }

  return (
    <div className="relative bg-card border-t border-border">
      <div className="p-4">
        <TextareaAutosize
          ref={inputRef}
          className="w-full px-4 py-2 bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          placeholder="Type a message, /compact, /config, /help, #commands, or @agent..."
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          minRows={1}
          maxRows={8}
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground">ESC to interrupt • Enter to send • Shift+Enter for new line</span>
          <button
            className="text-xs px-3 py-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors"
            onClick={onBroadcast}
          >
            #broadcast
          </button>
        </div>
      </div>

      {showCommands && (
        <CommandSuggestions
          filter={commandFilter}
          onSelect={completeCommand}
          type={showCommands}
        />
      )}

      {showMentions && (
        <div className="absolute bottom-full left-0 right-0 bg-popover border border-border rounded-md shadow-lg mb-2 mx-4 max-h-48 overflow-y-auto">
          {filteredAgents.map((agent) => (
            <div
              key={agent.id}
              className="flex items-center gap-2 px-3 py-2 hover:bg-secondary cursor-pointer transition-colors"
              onClick={() => completeMention(agent.id)}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: statusColors[agent.status] }}
              ></span>
              <span className="font-medium">@{agent.id}</span>
              <span className="text-xs text-muted-foreground">({agent.role})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
