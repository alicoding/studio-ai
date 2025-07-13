/**
 * Batch Operations Control
 * UI component for managing batch message operations with wait strategies
 */

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { InfoIcon, Send, Trash2, Plus, Clock, Users } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface BatchMessage {
  id: string
  targetAgentId: string
  content: string
  dependencies: string[]
  timeout?: number
}

interface BatchOperationsControlProps {
  onSendBatch: (params: {
    messages: BatchMessage[]
    fromAgentId: string
    projectId: string
    waitStrategy: 'all' | 'any' | 'none'
    concurrency?: number
    timeout?: number
  }) => Promise<void>
  agents: Array<{ id: string; name: string; role: string }>
  isLoading?: boolean
  className?: string
}

export function BatchOperationsControl({
  onSendBatch,
  agents,
  isLoading = false,
  className = ''
}: BatchOperationsControlProps) {
  const [messages, setMessages] = useState<BatchMessage[]>([
    {
      id: '1',
      targetAgentId: '',
      content: '',
      dependencies: []
    }
  ])
  const [waitStrategy, setWaitStrategy] = useState<'all' | 'any' | 'none'>('all')
  const [concurrency, setConcurrency] = useState(5)
  const [globalTimeout, setGlobalTimeout] = useState(60000) // 60 seconds default
  const [fromAgentId, setFromAgentId] = useState('batch-controller')
  const [projectId, setProjectId] = useState('test-project-1')

  const addMessage = () => {
    const newId = (messages.length + 1).toString()
    setMessages([...messages, {
      id: newId,
      targetAgentId: '',
      content: '',
      dependencies: []
    }])
  }

  const removeMessage = (id: string) => {
    setMessages(messages.filter(m => m.id !== id))
    // Update dependencies
    setMessages(prev => prev.map(msg => ({
      ...msg,
      dependencies: msg.dependencies.filter(dep => dep !== id)
    })))
  }

  const updateMessage = (id: string, updates: Partial<BatchMessage>) => {
    setMessages(messages.map(m => m.id === id ? { ...m, ...updates } : m))
  }

  const handleSend = async () => {
    if (isLoading) return
    
    // Validate messages
    const validMessages = messages.filter(m => m.targetAgentId && m.content.trim())
    if (validMessages.length === 0) return
    
    try {
      await onSendBatch({
        messages: validMessages,
        fromAgentId,
        projectId,
        waitStrategy,
        concurrency,
        timeout: globalTimeout
      })
      
      // Clear messages after successful send
      setMessages([{
        id: '1',
        targetAgentId: '',
        content: '',
        dependencies: []
      }])
    } catch (error) {
      console.error('Failed to send batch:', error)
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Batch Operations
          </CardTitle>
          <CardDescription>
            Send multiple messages to agents with dependencies and wait strategies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Global Settings */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <Label>From Agent ID</Label>
              <Input
                value={fromAgentId}
                onChange={(e) => setFromAgentId(e.target.value)}
                placeholder="batch-controller"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label>Project ID</Label>
              <Input
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder="test-project-1"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Wait Strategy
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <InfoIcon className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="max-w-xs">
                        <p className="font-medium">Wait Strategies:</p>
                        <p className="text-sm">• <strong>All:</strong> Wait for all messages</p>
                        <p className="text-sm">• <strong>Any:</strong> Return after first response</p>
                        <p className="text-sm">• <strong>None:</strong> Fire and forget</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Select value={waitStrategy} onValueChange={(v) => setWaitStrategy(v as typeof waitStrategy)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wait for All</SelectItem>
                  <SelectItem value="any">Wait for Any</SelectItem>
                  <SelectItem value="none">Fire and Forget</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Global Timeout (seconds)
              </Label>
              <Input
                type="number"
                min="1"
                max="300"
                value={globalTimeout / 1000}
                onChange={(e) => setGlobalTimeout(Number(e.target.value) * 1000)}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Concurrency Limit</Label>
            <Input
              type="number"
              min="1"
              max="20"
              value={concurrency}
              onChange={(e) => setConcurrency(Number(e.target.value))}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Maximum number of messages processed simultaneously
            </p>
          </div>

          {/* Messages */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Messages</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={addMessage}
                disabled={isLoading}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Message
              </Button>
            </div>

            {messages.map((msg) => (
              <Card key={msg.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">Message {msg.id}</Badge>
                    {messages.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMessage(msg.id)}
                        disabled={isLoading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Target Agent</Label>
                      <Select
                        value={msg.targetAgentId}
                        onValueChange={(v) => updateMessage(msg.id, { targetAgentId: v })}
                        disabled={isLoading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select agent..." />
                        </SelectTrigger>
                        <SelectContent>
                          {agents.map(agent => (
                            <SelectItem key={agent.id} value={agent.id}>
                              @{agent.id} - {agent.name || agent.role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Dependencies</Label>
                      <Select
                        value=""
                        onValueChange={(v) => {
                          if (!msg.dependencies.includes(v)) {
                            updateMessage(msg.id, {
                              dependencies: [...msg.dependencies, v]
                            })
                          }
                        }}
                        disabled={isLoading || messages.length === 1}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Add dependency..." />
                        </SelectTrigger>
                        <SelectContent>
                          {messages
                            .filter(m => m.id !== msg.id && !msg.dependencies.includes(m.id))
                            .map(m => (
                              <SelectItem key={m.id} value={m.id}>
                                Message {m.id}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      {msg.dependencies.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {msg.dependencies.map(dep => (
                            <Badge
                              key={dep}
                              variant="outline"
                              className="text-xs cursor-pointer"
                              onClick={() => updateMessage(msg.id, {
                                dependencies: msg.dependencies.filter(d => d !== dep)
                              })}
                            >
                              Depends on {dep} ✕
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Message Content</Label>
                    <Textarea
                      placeholder="Enter your message..."
                      value={msg.content}
                      onChange={(e) => updateMessage(msg.id, { content: e.target.value })}
                      disabled={isLoading}
                      rows={2}
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Send Button */}
          <Button
            onClick={handleSend}
            disabled={isLoading || messages.every(m => !m.targetAgentId || !m.content.trim())}
            className="w-full"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                Processing Batch...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Batch ({messages.filter(m => m.targetAgentId && m.content).length} messages)
              </>
            )}
          </Button>

          {/* Status Display */}
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>Strategy:</span>
              <span className="font-medium">{waitStrategy}</span>
            </div>
            <div className="flex justify-between">
              <span>Concurrency:</span>
              <span className="font-medium">{concurrency} messages</span>
            </div>
            <div className="flex justify-between">
              <span>Timeout:</span>
              <span className="font-medium">{globalTimeout / 1000}s</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}