import { useState, useCallback, useMemo } from 'react'
import { useAgents } from './useAgents'

interface MentionSuggestion {
  id: string
  display: string
  role: string
  status: 'ready' | 'online' | 'busy' | 'offline'
}

export function useMentions() {
  const { agents } = useAgents()
  const [mentionQuery, setMentionQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Only show online/busy agents as mentionable
  const mentionableAgents = useMemo(
    () => agents.filter((agent) => agent.status !== 'offline'),
    [agents]
  )

  // Filter agents based on mention query
  const suggestions = useMemo<MentionSuggestion[]>(() => {
    if (!mentionQuery) return []

    const query = mentionQuery.toLowerCase()
    return mentionableAgents
      .filter(
        (agent) =>
          agent.id.toLowerCase().includes(query) ||
          agent.name.toLowerCase().includes(query) ||
          agent.role.toLowerCase().includes(query)
      )
      .map((agent) => ({
        id: agent.id,
        display: `@${agent.id}`,
        role: agent.role,
        status: agent.status,
      }))
  }, [mentionableAgents, mentionQuery])

  const handleInputChange = useCallback((value: string) => {
    const lastAtSymbol = value.lastIndexOf('@')

    if (lastAtSymbol === -1) {
      setShowSuggestions(false)
      setMentionQuery('')
      return
    }

    // Check if we're in a mention context
    const textAfterAt = value.substring(lastAtSymbol + 1)
    const nextSpace = textAfterAt.indexOf(' ')

    if (nextSpace === -1) {
      // Still typing the mention
      setMentionQuery(textAfterAt)
      setShowSuggestions(true)
    } else {
      // Mention completed
      setShowSuggestions(false)
      setMentionQuery('')
    }
  }, [])

  const completeMention = useCallback((suggestion: MentionSuggestion, currentValue: string) => {
    const lastAtSymbol = currentValue.lastIndexOf('@')
    if (lastAtSymbol === -1) return currentValue

    const beforeMention = currentValue.substring(0, lastAtSymbol)
    return `${beforeMention}@${suggestion.id} `
  }, [])

  const reset = useCallback(() => {
    setShowSuggestions(false)
    setMentionQuery('')
  }, [])

  return {
    suggestions,
    showSuggestions,
    handleInputChange,
    completeMention,
    reset,
    mentionableAgents,
  }
}
