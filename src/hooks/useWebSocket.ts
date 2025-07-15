import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

interface UseWebSocketOptions {
  reconnectAttempts?: number
  reconnectDelay?: number
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  // Simple approach: connect to the same origin as the UI
  // Redis adapter handles cross-server communication automatically
  const { reconnectAttempts = 5, reconnectDelay = 1000 } = options

  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const reconnectCountRef = useRef(0)

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return

    // Connect to the same server serving the UI
    const socketUrl = window.location.origin
    console.log(`[WebSocket] Connecting to: ${socketUrl}`)

    const socket = io(socketUrl, {
      reconnection: true,
      reconnectionAttempts: reconnectAttempts,
      reconnectionDelay: reconnectDelay,
    })

    socket.on('connect', () => {
      setIsConnected(true)
      setError(null)
      reconnectCountRef.current = 0
      console.log('WebSocket connected')
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
      console.log('WebSocket disconnected')
    })

    socket.on('reconnect', (attemptNumber: number) => {
      console.log(`WebSocket reconnected after ${attemptNumber} attempts`)
      // Emit custom event for components to re-establish their subscriptions
      window.dispatchEvent(new CustomEvent('websocket-reconnected'))
    })

    socket.on('connect_error', (err) => {
      setError(err)
      reconnectCountRef.current++

      if (reconnectCountRef.current >= reconnectAttempts) {
        socket.disconnect()
        console.error('Max reconnection attempts reached')
      }
    })

    socketRef.current = socket
  }, [reconnectAttempts, reconnectDelay])

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }
  }, [])

  const emit = useCallback((event: string, data?: unknown) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data)
    } else {
      console.warn('Socket not connected, cannot emit:', event)
    }
  }, [])

  const on = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, handler)
    }
  }, [])

  const off = useCallback((event: string, handler?: (...args: unknown[]) => void) => {
    if (socketRef.current) {
      socketRef.current.off(event, handler)
    }
  }, [])

  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  return {
    isConnected,
    error,
    emit,
    on,
    off,
    socket: socketRef.current,
  }
}
