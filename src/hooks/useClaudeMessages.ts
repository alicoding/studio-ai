import { useState, useCallback } from 'react'

interface SendMessageOptions {
  sessionId?: string
  projectId?: string
  agentId?: string
  projectPath?: string
  role?: 'dev' | 'ux' | 'test' | 'pm'
  forceNewSession?: boolean
}

interface MessageResponse {
  success: boolean
  response: string
  sessionId: string | null
  error?: string
}

// KISS: Simple hook for sending messages to Claude
export function useClaudeMessages() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(
    async (content: string, options: SendMessageOptions = {}): Promise<MessageResponse | null> => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content,
            projectId: options.projectId,
            agentId: options.agentId,
            projectPath: options.projectPath,
            role: options.role || 'dev',
            forceNewSession: options.forceNewSession || false,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error('Server error response:', errorData)
          const errorMessage = errorData.error || 'Failed to send message'
          const errorDetails = errorData.details ? ` - ${errorData.details}` : ''
          throw new Error(`${errorMessage}${errorDetails}`)
        }

        const data = await response.json()
        return data
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
        setError(errorMessage)
        console.error('Error sending message:', err)
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    sendMessage,
    loading,
    error,
    clearError,
  }
}
