/**
 * Mention Wait Mode Control
 * UI component for controlling mention wait mode in chat
 */

import React, { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { InfoIcon, Clock, Users, Send } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface MentionWaitModeControlProps {
  onSendMention: (params: {
    message: string
    wait: boolean
    timeout?: number
  }) => Promise<void>
  isLoading?: boolean
  className?: string
}

export function MentionWaitModeControl({
  onSendMention,
  isLoading = false,
  className = ''
}: MentionWaitModeControlProps) {
  const [message, setMessage] = useState('')
  const [waitMode, setWaitMode] = useState(false)
  const [timeout, setTimeout] = useState(30000) // 30 seconds default
  const [isValid, setIsValid] = useState(false)

  // Validate mention format
  React.useEffect(() => {
    const mentionPattern = /^@[\w-]+\s+.+/
    setIsValid(mentionPattern.test(message.trim()))
  }, [message])

  const handleSend = async () => {
    if (!isValid || isLoading) return
    
    try {
      await onSendMention({
        message: message.trim(),
        wait: waitMode,
        timeout: waitMode ? timeout : undefined
      })
      
      // Clear message after successful send
      setMessage('')
    } catch (error) {
      console.error('Failed to send mention:', error)
      // Error handling could be improved with toast notifications
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className={`space-y-4 p-4 border rounded-lg bg-card ${className}`}>
      <div className="flex items-center space-x-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <Label className="text-sm font-medium">Agent Mention</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <InfoIcon className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <div className="max-w-xs">
                <p className="font-medium">Mention Format:</p>
                <p className="text-sm">@agent-name your message here</p>
                <p className="text-sm mt-1">Example: @dev-agent Fix the login bug</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Message Input */}
      <div className="space-y-2">
        <Label htmlFor="mention-message" className="text-sm">
          Message
        </Label>
        <Input
          id="mention-message"
          placeholder="@agent-name your message here..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
          className={!isValid && message.length > 0 ? 'border-destructive' : ''}
        />
        {!isValid && message.length > 0 && (
          <p className="text-xs text-destructive">
            Message must start with @agent-name followed by your message
          </p>
        )}
      </div>

      {/* Wait Mode Controls */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Switch
            id="wait-mode"
            checked={waitMode}
            onCheckedChange={setWaitMode}
            disabled={isLoading}
          />
          <Label htmlFor="wait-mode" className="text-sm">
            Wait for Response
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <InfoIcon className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <div className="max-w-xs">
                  <p className="font-medium">Wait Mode:</p>
                  <p className="text-sm">
                    • <strong>On:</strong> Wait for agent response before continuing
                  </p>
                  <p className="text-sm">
                    • <strong>Off:</strong> Send message and continue immediately
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Timeout Control (only shown in wait mode) */}
        {waitMode && (
          <div className="ml-6 space-y-2">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="timeout" className="text-sm">
                Timeout (seconds)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Input
                id="timeout"
                type="number"
                min="1"
                max="300"
                value={timeout / 1000}
                onChange={(e) => setTimeout(Number(e.target.value) * 1000)}
                disabled={isLoading}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">seconds</span>
            </div>
            <p className="text-xs text-muted-foreground">
              How long to wait for agent response (1-300 seconds)
            </p>
          </div>
        )}
      </div>

      {/* Send Button */}
      <Button
        onClick={handleSend}
        disabled={!isValid || isLoading}
        className="w-full"
        size="sm"
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
            {waitMode ? 'Waiting for Response...' : 'Sending...'}
          </>
        ) : (
          <>
            <Send className="h-4 w-4 mr-2" />
            Send Mention
          </>
        )}
      </Button>

      {/* Status Display */}
      <div className="text-xs text-muted-foreground space-y-1">
        <div className="flex justify-between">
          <span>Mode:</span>
          <span className="font-medium">
            {waitMode ? 'Wait for Response' : 'Fire and Forget'}
          </span>
        </div>
        {waitMode && (
          <div className="flex justify-between">
            <span>Timeout:</span>
            <span className="font-medium">{timeout / 1000}s</span>
          </div>
        )}
      </div>
    </div>
  )
}