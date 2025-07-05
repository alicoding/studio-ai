/**
 * AI Sessions Store - Persistent storage for LangChain conversations
 * 
 * SOLID: Single responsibility - manages AI session state
 * DRY: Reuses existing persistent store infrastructure
 * Library-First: Uses Zustand with persistence
 */

import { createPersistentStore } from './createPersistentStore'

export interface AISession {
  id: string
  created: number
  updated: number
  messages: Array<{
    role: 'user' | 'assistant'
    content: string
    timestamp: number
    toolsUsed?: string[]
    modelUsed?: string
  }>
  metadata?: {
    capability?: string
    model?: string
  }
}

export interface AISessionState {
  sessions: Record<string, AISession>
  activeSessionId: string | null
  
  // Actions
  createSession: (id?: string) => string
  getSession: (id: string) => AISession | undefined
  updateSession: (id: string, messages: AISession['messages']) => void
  deleteSession: (id: string) => void
  setActiveSession: (id: string | null) => void
  clearAllSessions: () => void
}

export const useAISessionStore = createPersistentStore<AISessionState>(
  'ai-sessions',
  (set, get) => ({
    sessions: {},
    activeSessionId: null,
    
    createSession: (id?: string) => {
      const sessionId = id || crypto.randomUUID()
      const now = Date.now()
      
      set(state => ({
        sessions: {
          ...state.sessions,
          [sessionId]: {
            id: sessionId,
            created: now,
            updated: now,
            messages: []
          }
        },
        activeSessionId: sessionId
      }))
      
      return sessionId
    },
    
    getSession: (id: string) => {
      return get().sessions[id]
    },
    
    updateSession: (id: string, messages: AISession['messages']) => {
      set(state => ({
        sessions: {
          ...state.sessions,
          [id]: {
            ...state.sessions[id],
            messages,
            updated: Date.now()
          }
        }
      }))
    },
    
    deleteSession: (id: string) => {
      set(state => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [id]: _, ...remaining } = state.sessions
        return {
          sessions: remaining,
          activeSessionId: state.activeSessionId === id ? null : state.activeSessionId
        }
      })
    },
    
    setActiveSession: (id: string | null) => {
      set({ activeSessionId: id })
    },
    
    clearAllSessions: () => {
      set({ sessions: {}, activeSessionId: null })
    }
  }),
  {
    partialize: (state) => ({
      sessions: state.sessions,
      activeSessionId: state.activeSessionId
    })
  }
)