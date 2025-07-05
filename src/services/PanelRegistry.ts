/**
 * PanelRegistry - SOLID Panel Registration System
 * 
 * SOLID: Open/Closed - New panels can be added without modifying existing code
 * DRY: Centralized panel registration and management
 * KISS: Simple interface for panel management
 * Library First: Uses Map for efficient panel lookup
 */

import type { ComponentType } from 'react'

export interface PanelProps {
  projectId?: string
  className?: string
}

export interface PanelDefinition {
  id: string
  title: string
  icon: ComponentType<{ className?: string }>
  component: ComponentType<PanelProps>
  defaultPosition: 'sidebar' | 'main' | 'bottom'
  singleton?: boolean
  requiresProject?: boolean
}

export class PanelRegistry {
  private panels: Map<string, PanelDefinition> = new Map()

  constructor() {}

  /**
   * Register a panel
   */
  register(panel: PanelDefinition): void {
    if (this.panels.has(panel.id)) {
      console.warn(`Panel ${panel.id} is already registered, overwriting...`)
    }
    this.panels.set(panel.id, panel)
  }

  /**
   * Get a panel by ID
   */
  get(id: string): PanelDefinition | undefined {
    return this.panels.get(id)
  }

  /**
   * Get all panels
   */
  getAll(): PanelDefinition[] {
    return Array.from(this.panels.values())
  }

  /**
   * Get panels by position
   */
  getByPosition(position: 'sidebar' | 'main' | 'bottom'): PanelDefinition[] {
    return this.getAll().filter(panel => panel.defaultPosition === position)
  }

  /**
   * Check if a panel exists
   */
  has(id: string): boolean {
    return this.panels.has(id)
  }

  /**
   * Unregister a panel
   */
  unregister(id: string): boolean {
    return this.panels.delete(id)
  }

  /**
   * Clear all panels
   */
  clear(): void {
    this.panels.clear()
  }
}

// No singleton - instances created via dependency injection