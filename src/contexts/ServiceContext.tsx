/**
 * ServiceContext - Dependency Injection Container
 *
 * SOLID: Dependency Inversion - Services depend on abstractions
 * DRY: Single place to manage all services
 * KISS: Simple React Context for service access
 * Library-First: Uses React Context (built-in)
 */

import type { ReactNode } from 'react'
import { createEventBus, TypedEventBus } from '../services/EventBus'
import { PanelRegistry } from '../services/PanelRegistry'
import { ServiceContext, type ServiceContainer } from './ServiceContextDef'

// Re-export types for convenience
export type { ServiceContainer }

// Create service instances for a workspace
function createServiceContainer(): ServiceContainer {
  const eventBus = new TypedEventBus(createEventBus())
  const panelRegistry = new PanelRegistry()

  return {
    eventBus,
    panelRegistry,
  }
}

// Provider component
interface ServiceProviderProps {
  children: ReactNode
  services?: ServiceContainer // Allow injecting services for testing
}

export function ServiceProvider({ children, services }: ServiceProviderProps) {
  // Create or use provided services
  const container = services || createServiceContainer()

  return <ServiceContext.Provider value={container}>{children}</ServiceContext.Provider>
}

// Hooks are in src/hooks/useServices.ts to satisfy ESLint react-refresh
