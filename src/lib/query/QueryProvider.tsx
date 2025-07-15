/**
 * TanStack Query Provider Component
 *
 * SOLID: Single provider component for query client
 * DRY: Centralized query provider setup
 * KISS: Simple provider wrapper with devtools
 * Library-First: Uses TanStack Query v5 React integration
 */

import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './queryClient'
import type { ReactNode } from 'react'

interface QueryProviderProps {
  children: ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Devtools will be added later once we verify the correct import */}
    </QueryClientProvider>
  )
}
