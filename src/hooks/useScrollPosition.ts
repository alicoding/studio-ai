import { useRef, useCallback } from 'react'

// Global map to store scroll positions by sessionId
const scrollPositions = new Map<string, number>()

export function useScrollPosition(sessionId: string) {
  const lastScrollRef = useRef<number>(0)

  // Save current scroll position
  const saveScrollPosition = useCallback((scrollOffset: number) => {
    lastScrollRef.current = scrollOffset
    scrollPositions.set(sessionId, scrollOffset)
    console.log(`💾 Saved scroll position for ${sessionId}:`, scrollOffset)
  }, [sessionId])

  // Get saved scroll position
  const getSavedScrollPosition = useCallback(() => {
    const saved = scrollPositions.get(sessionId)
    console.log(`📍 Retrieved scroll position for ${sessionId}:`, saved || 'none')
    return saved
  }, [sessionId])

  // Clear scroll position (for cleanup)
  const clearScrollPosition = useCallback(() => {
    scrollPositions.delete(sessionId)
    console.log(`🗑️ Cleared scroll position for ${sessionId}`)
  }, [sessionId])

  return {
    saveScrollPosition,
    getSavedScrollPosition,
    clearScrollPosition
  }
}