import { useState, useEffect, useCallback } from 'react'
import { Search, Calendar, Clock } from 'lucide-react'
import { Input } from '../ui/input'
import { Card } from '../ui/card'
import { Badge } from '../ui/badge'
import { ScrollArea } from '../ui/scroll-area'

interface UserMessage {
  timestamp: string
  text: string
  lineNumber: number
}

export function UserMessageSearch({ sessionFile }: { sessionFile: string }) {
  const [messages, setMessages] = useState<UserMessage[]>([])
  const [filteredMessages, setFilteredMessages] = useState<UserMessage[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/session/search?file=${encodeURIComponent(sessionFile)}`)

      if (!response.ok) {
        throw new Error('Failed to load messages')
      }

      const data = await response.json()
      setMessages(data.userMessages)
      setFilteredMessages(data.userMessages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages')
    } finally {
      setLoading(false)
    }
  }, [sessionFile])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  const handleSearch = (term: string) => {
    setSearchTerm(term)

    if (!term.trim()) {
      setFilteredMessages(messages)
      return
    }

    const filtered = messages.filter((msg) => msg.text.toLowerCase().includes(term.toLowerCase()))
    setFilteredMessages(filtered)
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
    }
  }

  if (loading) {
    return <div className="p-4">Loading messages...</div>
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold mb-3">Search Your Messages</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search your messages..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="mt-2 text-sm text-muted-foreground">
          Found {filteredMessages.length} of {messages.length} messages
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {filteredMessages.map((msg, index) => {
            const { date, time } = formatTimestamp(msg.timestamp)
            return (
              <Card key={index} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {date}
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {time}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">Line {msg.lineNumber}</span>
                </div>
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap">
                    {searchTerm ? highlightText(msg.text, searchTerm) : msg.text}
                  </p>
                </div>
              </Card>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}

function highlightText(text: string, term: string) {
  if (!term) return text

  const regex = new RegExp(`(${term})`, 'gi')
  const parts = text.split(regex)

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-800">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  )
}
