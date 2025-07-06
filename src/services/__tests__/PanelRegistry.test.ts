import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PanelRegistry } from '../PanelRegistry'
import type { PanelDefinition } from '../PanelRegistry'

// Mock icon component
const MockIcon = () => null

// Mock panel component
const MockPanel = () => null

describe('PanelRegistry', () => {
  let registry: PanelRegistry

  beforeEach(() => {
    registry = new PanelRegistry()
  })

  it('should register and retrieve panels', () => {
    const panel: PanelDefinition = {
      id: 'test-panel',
      title: 'Test Panel',
      icon: MockIcon,
      component: MockPanel,
      defaultPosition: 'sidebar',
    }

    registry.register(panel)

    expect(registry.has('test-panel')).toBe(true)
    expect(registry.get('test-panel')).toEqual(panel)
  })

  it('should get panels by position', () => {
    const sidebarPanel: PanelDefinition = {
      id: 'sidebar-panel',
      title: 'Sidebar Panel',
      icon: MockIcon,
      component: MockPanel,
      defaultPosition: 'sidebar',
    }

    const mainPanel: PanelDefinition = {
      id: 'main-panel',
      title: 'Main Panel',
      icon: MockIcon,
      component: MockPanel,
      defaultPosition: 'main',
    }

    registry.register(sidebarPanel)
    registry.register(mainPanel)

    const sidebarPanels = registry.getByPosition('sidebar')
    expect(sidebarPanels).toHaveLength(1)
    expect(sidebarPanels[0].id).toBe('sidebar-panel')

    const mainPanels = registry.getByPosition('main')
    expect(mainPanels).toHaveLength(1)
    expect(mainPanels[0].id).toBe('main-panel')
  })

  it('should handle duplicate registration with warning', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const panel: PanelDefinition = {
      id: 'duplicate',
      title: 'Panel 1',
      icon: MockIcon,
      component: MockPanel,
      defaultPosition: 'sidebar',
    }

    const updatedPanel: PanelDefinition = {
      ...panel,
      title: 'Panel 2',
    }

    registry.register(panel)
    registry.register(updatedPanel)

    expect(consoleSpy).toHaveBeenCalledWith('Panel duplicate is already registered, overwriting...')
    expect(registry.get('duplicate')?.title).toBe('Panel 2')

    consoleSpy.mockRestore()
  })

  it('should unregister panels', () => {
    const panel: PanelDefinition = {
      id: 'to-remove',
      title: 'Remove Me',
      icon: MockIcon,
      component: MockPanel,
      defaultPosition: 'sidebar',
    }

    registry.register(panel)
    expect(registry.has('to-remove')).toBe(true)

    const removed = registry.unregister('to-remove')
    expect(removed).toBe(true)
    expect(registry.has('to-remove')).toBe(false)
  })
})
