import { useState, useRef } from 'react'

interface Agent {
  id: string
  role: string
  status: 'ready' | 'online' | 'busy' | 'offline'
}

interface ChatPanelProps {
  agents: Agent[]
  onSendMessage: (message: string) => void
  onBroadcast: () => void
  onInterrupt: () => void
}

export function ChatPanel({ agents, onSendMessage, onBroadcast, onInterrupt }: ChatPanelProps) {
  const [message, setMessage] = useState('')
  const [showMentions, setShowMentions] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setMessage(value)

    const lastWord = value.split(' ').pop() || ''
    if (lastWord.startsWith('@') && lastWord.length > 1) {
      setMentionFilter(lastWord.substring(1).toLowerCase())
      setShowMentions(true)
    } else {
      setShowMentions(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (message.trim()) {
        onSendMessage(message.trim())
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
        <input
          ref={inputRef}
          type="text"
          className="w-full px-4 py-2 bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Type a message or command (#team, @agent)..."
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground">ESC to interrupt • Enter to send</span>
          <button
            className="text-xs px-3 py-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors"
            onClick={onBroadcast}
          >
            #broadcast
          </button>
        </div>
      </div>

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
