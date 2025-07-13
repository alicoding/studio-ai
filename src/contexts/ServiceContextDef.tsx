/**
 * ServiceContext Definition - React Context for Dependency Injection
 * 
 * SOLID: Interface Segregation - Context definition separate from provider
 * DRY: Single context definition used across app
 * KISS: Simple context export
 * Library-First: Uses React Context (built-in)
 */

import { createContext } from 'react'
import type { TypedEventBus } from '../services/EventBus'
import type { PanelRegistry } from '../services/PanelRegistry'

// Service container interface
export interface ServiceContainer {
  eventBus: TypedEventBus
  panelRegistry: PanelRegistry
}

// Context - separate from provider to satisfy ESLint react-refresh
export const ServiceContext = createContext<ServiceContainer | null>(null)