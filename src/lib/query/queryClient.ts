/**
 * TanStack Query Client Configuration
 *
 * SOLID: Single configuration for all query operations
 * DRY: Centralized query client setup
 * KISS: Simple configuration with sensible defaults
 * Library-First: Uses TanStack Query v5 offline capabilities
 */

import { QueryClient } from '@tanstack/react-query'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { persistQueryClient } from '@tanstack/query-persist-client-core'

// Create query client with offline-first configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Enable offline support
      networkMode: 'offlineFirst',
      // Stale time - how long data is considered fresh
      staleTime: 5 * 60 * 1000, // 5 minutes
      // Cache time - how long data stays in cache
      gcTime: 30 * 60 * 1000, // 30 minutes (was cacheTime in v4)
      // Retry configuration
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors)
        if (error instanceof Error && 'status' in error) {
          const status = (error as { status: number }).status
          if (status >= 400 && status < 500) {
            return false
          }
        }
        // Retry up to 3 times for network errors
        return failureCount < 3
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // Enable offline support for mutations
      networkMode: 'offlineFirst',
      // Retry mutations once on network error
      retry: 1,
      retryDelay: 2000,
    },
  },
})

// Create storage persister using localStorage (synchronous)
const persister = createSyncStoragePersister({
  storage: {
    getItem: (key: string) => localStorage.getItem(key),
    setItem: (key: string, value: string) => localStorage.setItem(key, value),
    removeItem: (key: string) => localStorage.removeItem(key),
  },
  key: 'claude-studio-query-cache',
  serialize: JSON.stringify,
  deserialize: JSON.parse,
})

// Enable query persistence
persistQueryClient({
  queryClient,
  persister,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  buster: process.env.NODE_ENV === 'development' ? Math.random().toString() : undefined,
})

// Query keys for type safety and consistency
export const queryKeys = {
  // Workflow queries
  workflows: {
    all: ['workflows'] as const,
    saved: () => ['workflows', 'saved'] as const,
    byId: (id: string) => ['workflows', 'saved', id] as const,
    byProject: (projectId: string) => ['workflows', 'saved', 'project', projectId] as const,
  },
  // Project queries
  projects: {
    all: ['projects'] as const,
    byId: (id: string) => ['projects', id] as const,
    agents: (id: string) => ['projects', id, 'agents'] as const,
  },
  // Agent queries
  agents: {
    all: ['agents'] as const,
    byId: (id: string) => ['agents', id] as const,
    sessions: (id: string) => ['agents', id, 'sessions'] as const,
  },
} as const

// Utility functions for query invalidation
export const invalidateQueries = {
  workflows: {
    all: () => queryClient.invalidateQueries({ queryKey: queryKeys.workflows.all }),
    saved: () => queryClient.invalidateQueries({ queryKey: queryKeys.workflows.saved() }),
    byId: (id: string) => queryClient.invalidateQueries({ queryKey: queryKeys.workflows.byId(id) }),
    byProject: (projectId: string) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.byProject(projectId) }),
  },
  projects: {
    all: () => queryClient.invalidateQueries({ queryKey: queryKeys.projects.all }),
    byId: (id: string) => queryClient.invalidateQueries({ queryKey: queryKeys.projects.byId(id) }),
  },
  agents: {
    all: () => queryClient.invalidateQueries({ queryKey: queryKeys.agents.all }),
    byId: (id: string) => queryClient.invalidateQueries({ queryKey: queryKeys.agents.byId(id) }),
  },
}

// Network status utilities
export const networkUtils = {
  isOnline: () => navigator.onLine,

  // Force refetch when coming back online
  onOnline: () => {
    queryClient.resumePausedMutations()
    queryClient.invalidateQueries()
  },

  // Pause mutations when going offline
  onOffline: () => {
    // Mutations will be paused automatically by TanStack Query
    console.log('Network offline - mutations will be queued')
  },
}

// Setup network listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', networkUtils.onOnline)
  window.addEventListener('offline', networkUtils.onOffline)
}

// Development tools
if (process.env.NODE_ENV === 'development') {
  // Query client debugging is now handled by devtools
  console.log('TanStack Query client initialized in development mode')
}
