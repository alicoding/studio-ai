import { useState, useCallback } from 'react'

interface SendMessageOptions {
  sessionId?: string
  projectPath?: string
  role?: 'dev' | 'ux' | 'test' | 'pm'
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

  const sendMessage = useCallback(async (
    content: string,
    options: SendMessageOptions = {}
  ): Promise<MessageResponse | null> => {
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
          sessionId: options.sessionId,
          projectPath: options.projectPath,
          role: options.role || 'dev',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send message')
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
  }, [])

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