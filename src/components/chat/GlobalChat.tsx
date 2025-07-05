/**
 * Global Chat Component - AI Model Playground
 * 
 * SOLID: Single responsibility - AI testing interface
 * KISS: Simple playground for testing models/prompts
 * Library-First: Uses clean API service
 * DRY: No duplicate AI logic
 */

import { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Maximize2, Minimize2, Send } from 'lucide-react'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { ScrollArea } from '../ui/scroll-area'
import { cn } from '../../lib/utils'
import { toast } from 'sonner'
import { PlaygroundService, type PlaygroundMessage } from '../../lib/ai/PlaygroundService'
import { PlaygroundSettings } from './PlaygroundSettings'
import { usePlaygroundSettingsStore } from '../../stores/playgroundSettings'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export function GlobalChat() {
  // UI State
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  // Chat State  
  const [messages, setMessages] = useState<ChatMessage[]>([])
  
  // Playground Settings from centralized store
  const { settings, loadSettings } = usePlaygroundSettingsStore()
  const { model, systemPrompt, temperature, maxTokens } = settings
  
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const playgroundService = PlaygroundService.getInstance()

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  // Load settings when chat opens
  useEffect(() => {
    if (isChatOpen) {
      loadSettings()
      if (textareaRef.current) {
        textareaRef.current.focus()
      }
    }
  }, [isChatOpen, loadSettings])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: Date.now()
    }

    console.log('[GlobalChat] Sending message:', userMessage)
    console.log('[GlobalChat] Settings:', { model, temperature, maxTokens })

    // Add user message
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Build messages array with system prompt
      const playgroundMessages: PlaygroundMessage[] = [
        { role: 'system', content: systemPrompt },
        ...messages.map(msg => ({ role: msg.role, content: msg.content })),
        { role: 'user', content: userMessage.content }
      ]

      // Send to playground API
      const response = await playgroundService.chat({
        model,
        messages: playgroundMessages,
        temperature,
        maxTokens
      })

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.content,
        timestamp: Date.now()
      }

      setMessages(prev => [...prev, assistantMessage])
      
      console.log('[GlobalChat] Response received:', {
        contentLength: response.content.length,
        usage: response.usage
      })
    } catch (error) {
      console.error('[GlobalChat] Chat error:', error)
      toast.error(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }


  const clearChat = () => {
    setMessages([])
  }

  if (!isChatOpen) {
    return (
      <Button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        size="icon"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>
    )
  }

  return (
    <div
      className={cn(
        "fixed bg-background border-l shadow-xl z-40 flex flex-col",
        isFullscreen 
          ? "inset-0" 
          : "right-0 bottom-0 w-96 h-[600px] max-h-[80vh]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">AI Playground</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{model}</span>
          
          <PlaygroundSettings />
          
          <Button
            variant="ghost"
            size="icon"
            onClick={clearChat}
            title="Clear chat"
          >
            <X className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsChatOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">Start a conversation to test AI models</p>
              <p className="text-xs mt-1">Configure model and prompts in settings</p>
            </div>
          )}
          
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex",
                message.role === 'user' ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-4 py-2 whitespace-pre-wrap",
                  message.role === 'user'
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                {message.content}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg px-4 py-2 bg-muted">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-foreground/50 rounded-full animate-pulse" />
                  <div className="w-2 h-2 bg-foreground/50 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <div className="w-2 h-2 bg-foreground/50 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                  <span className="text-sm text-muted-foreground ml-2">Thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="resize-none"
            rows={2}
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}