import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'

interface TypingIndicatorProps {
  agentName: string
  startTime?: number
  tokenCount?: number
}

export function TypingIndicator({ agentName, startTime, tokenCount = 0 }: TypingIndicatorProps) {
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    if (!startTime) return

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      setElapsedTime(elapsed)
    }, 100)

    return () => clearInterval(interval)
  }, [startTime])

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground px-4 py-2 bg-secondary/50 rounded-lg">
      <Sparkles className="w-4 h-4 animate-pulse text-primary" />
      <span className="font-medium">{agentName}</span>
      <span>is typing...</span>
      <span className="text-xs opacity-75">
        ({formatTime(elapsedTime)} · ↑ {tokenCount} tokens · ESC to interrupt)
      </span>
    </div>
  )
}