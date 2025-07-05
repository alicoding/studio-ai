import { useState, useRef } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import { CommandSuggestions } from './CommandSuggestions'
import { MentionWaitModeControl } from '../orchestration/MentionWaitModeControl'
import { BatchOperationsControl } from '../orchestration/BatchOperationsControl'
import { useAgentStore, useProjectStore } from '../../stores'
import type { Agent } from '../../stores/agents'

interface ChatPanelProps {
  onSendMessage: (message: string) => void | Promise<void>
  onInterrupt: () => void
}

export function ChatPanel({ onSendMessage, onInterrupt }: ChatPanelProps) {
  // Get agents from Zustand store
  const { getProjectAgents } = useAgentStore()
  const { activeProjectId } = useProjectStore()

  const agents = getProjectAgents(activeProjectId || '')
  const [message, setMessage] = useState('')
  const [showMentions, setShowMentions] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const [showCommands, setShowCommands] = useState<'slash' | 'hash' | null>(null)
  const [commandFilter, setCommandFilter] = useState('')
  const [showMentionWaitMode, setShowMentionWaitMode] = useState(false)
  const [showBatchOperations, setShowBatchOperations] = useState(false)
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
      setShowMentionWaitMode(false)
    }
    // Check for slash commands
    else if (lastWord.startsWith('/') && lastWord.length >= 1) {
      setCommandFilter(lastWord.substring(1).toLowerCase())
      setShowCommands('slash')
      setShowMentions(false)
    }
    // Hash commands are deprecated - we use MCP instead
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
        setShowCommands(null)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onInterrupt()
    }
  }

  // Helper function to get readable agent info
  const getAgentDisplayInfo = (agent: Agent) => {
    // Check if agent has readable ID (new format: dev1, ux1, etc.)
    if (agent.id.match(/^[a-z]+\d+$/)) {
      return {
        displayName: agent.name || `${agent.role.charAt(0).toUpperCase() + agent.role.slice(1)} ${agent.id.match(/\d+$/)?.[0] || '1'}`,
        mentionId: agent.id,
        isReadable: true
      }
    }
    
    // Legacy agent - show truncated ID with suggestion
    return {
      displayName: `${agent.name || agent.role} (legacy)`,
      mentionId: agent.id,
      isReadable: false
    }
  }

  const completeMention = (agentId: string) => {
    const words = message.split(' ')
    words[words.length - 1] = `@${agentId}`
    setMessage(words.join(' ') + ' ')
    setShowMentions(false)
    setShowCommands(null)
    inputRef.current?.focus()
  }

  const completeCommand = (command: string) => {
    const words = message.split(' ')
    words[words.length - 1] = command
    setMessage(words.join(' ') + ' ')
    setShowCommands(null)
    setShowMentions(false)
    inputRef.current?.focus()
  }

  const filteredAgents = agents.filter((agent) => {
    if (!mentionFilter) return true
    
    const filter = mentionFilter.toLowerCase()
    const agentId = agent.id.toLowerCase()
    const agentName = (agent.name || '').toLowerCase()
    const agentRole = agent.role.toLowerCase()
    
    // Match against multiple fields for better UX
    return (
      agentId.includes(filter) ||
      agentName.includes(filter) ||
      agentRole.includes(filter) ||
      // Support partial matching for readable IDs (e.g., "or" matches "orchestrator1")
      (agent.id.match(/^[a-z]+\d+$/) && agentRole.startsWith(filter))
    )
  })

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
          placeholder="Type a message, /compact, /config, /help, or @agent..."
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          minRows={1}
          maxRows={8}
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground">
            ESC to interrupt current agent • Enter to send • Shift+Enter for new line
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setShowMentionWaitMode(!showMentionWaitMode)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showMentionWaitMode ? 'Hide' : 'Show'} Wait Mode
            </button>
            <span className="text-xs text-muted-foreground">•</span>
            <button
              onClick={() => setShowBatchOperations(!showBatchOperations)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showBatchOperations ? 'Hide' : 'Show'} Batch
            </button>
          </div>
        </div>
      </div>

      {showCommands && (
        <CommandSuggestions filter={commandFilter} onSelect={completeCommand} type={showCommands} />
      )}

      {showMentions && (
        <div className="absolute bottom-full left-0 right-0 bg-popover border border-border rounded-md shadow-lg mb-2 mx-4 max-h-48 overflow-y-auto">
          {filteredAgents.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No agents found matching "{mentionFilter}"
            </div>
          ) : (
            filteredAgents.map((agent) => {
              const { displayName, mentionId, isReadable } = getAgentDisplayInfo(agent)
              return (
                <div
                  key={agent.id}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-secondary cursor-pointer transition-colors"
                  onClick={() => completeMention(mentionId)}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: statusColors[agent.status] }}
                  ></span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">@{isReadable ? mentionId : mentionId.substring(0, 15) + '...'}</span>
                      {!isReadable && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-1 rounded">legacy</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{displayName} • {agent.status}</div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {showMentionWaitMode && (
        <div className="absolute bottom-full left-0 right-0 mb-2 mx-4">
          <MentionWaitModeControl
            onSendMention={async (params) => {
              await onSendMessage(params.message)
              setShowMentionWaitMode(false)
              setMessage('')
            }}
            className="shadow-lg"
          />
        </div>
      )}

      {showBatchOperations && (
        <div className="absolute bottom-full left-0 right-0 mb-2 mx-4">
          <BatchOperationsControl
            onSendBatch={async (params) => {
              // TODO: Implement batch API call
              console.log('Batch operation:', params)
              setShowBatchOperations(false)
            }}
            agents={agents}
            className="shadow-lg"
          />
        </div>
      )}
    </div>
  )
}
