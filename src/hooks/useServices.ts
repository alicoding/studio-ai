/**
 * Service hooks - Access dependency injected services
 *
 * SOLID: Single responsibility - Service access only
 * DRY: One place for all service hooks
 * KISS: Simple hook wrappers
 */

import { useContext } from 'react'
import { ServiceContext } from '../contexts/ServiceContextDef'
import type { ServiceContainer } from '../contexts/ServiceContext'
import type { TypedEventBus } from '../services/EventBus'
import type { PanelRegistry } from '../services/PanelRegistry'

// Hook to access services
export function useServices(): ServiceContainer {
  const context = useContext(ServiceContext)
  if (!context) {
    throw new Error('useServices must be used within a ServiceProvider')
  }
  return context
}

// Individual service hooks for convenience
export function useEventBus(): TypedEventBus {
  return useServices().eventBus
}

export function usePanelRegistry(): PanelRegistry {
  return useServices().panelRegistry
}
