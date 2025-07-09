import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ToolPermissionEditor } from '../ToolPermissionEditor'
import { useAvailableTools } from '../../../hooks/useAvailableTools'
import type { ToolPermission } from '../../../types/tool-permissions'

// Mock the useAvailableTools hook
vi.mock('../../../hooks/useAvailableTools')

const mockUseAvailableTools = vi.mocked(useAvailableTools)

describe('ToolPermissionEditor', () => {
  const mockTools = [
    'Read',
    'Write',
    'Edit',
    'MultiEdit',
    'Bash',
    'Grep',
    'Glob',
    'LS',
    'WebFetch',
    'WebSearch',
    'TodoRead',
    'TodoWrite',
    'exit_plan_mode',
  ]

  const mockOnChange = vi.fn()
  const mockRefetch = vi.fn()

  beforeEach(() => {
    mockUseAvailableTools.mockReturnValue({
      tools: mockTools,
      toolPermissions: mockTools.map((tool) => ({ name: tool, enabled: true })),
      loading: false,
      error: null,
      refetch: mockRefetch,
    })
    mockOnChange.mockClear()
    mockRefetch.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading State', () => {
    it('should show loading state when tools are being fetched', () => {
      mockUseAvailableTools.mockReturnValue({
        tools: [],
        toolPermissions: [],
        loading: true,
        error: null,
        refetch: mockRefetch,
      })

      render(<ToolPermissionEditor permissions={[]} onChange={mockOnChange} />)

      expect(screen.getByText('Loading available tools...')).toBeInTheDocument()
      expect(screen.getByText('Tool Permissions')).toBeInTheDocument()
    })
  })

  describe('Basic Functionality', () => {
    it('should display tool permissions component', () => {
      render(<ToolPermissionEditor permissions={[]} onChange={mockOnChange} />)

      expect(screen.getByText('Tool Permissions')).toBeInTheDocument()
      expect(screen.getByText('Permission Preset')).toBeInTheDocument()
    })

    it('should show correct tool count', () => {
      const somePermissions: ToolPermission[] = [
        { name: 'Read', enabled: true },
        { name: 'Write', enabled: true },
        { name: 'Bash', enabled: false },
      ]

      render(<ToolPermissionEditor permissions={somePermissions} onChange={mockOnChange} />)

      expect(screen.getByText('2 / 13 tools enabled')).toBeInTheDocument()
    })

    it('should handle empty permissions', () => {
      render(<ToolPermissionEditor permissions={[]} onChange={mockOnChange} />)

      expect(screen.getByText('0 / 13 tools enabled')).toBeInTheDocument()
    })

    it('should handle all tools enabled', () => {
      const allEnabled: ToolPermission[] = mockTools.map((tool) => ({
        name: tool,
        enabled: true,
      }))

      render(<ToolPermissionEditor permissions={allEnabled} onChange={mockOnChange} />)

      expect(screen.getByText('13 / 13 tools enabled')).toBeInTheDocument()
    })
  })

  describe('Preset Selection', () => {
    it('should display preset dropdown', () => {
      render(<ToolPermissionEditor permissions={[]} onChange={mockOnChange} />)

      expect(screen.getByRole('combobox')).toBeInTheDocument()
      expect(screen.getByText('Choose a preset or configure manually')).toBeInTheDocument()
    })

    it('should trigger onChange when preset is applied', async () => {
      render(<ToolPermissionEditor permissions={[]} onChange={mockOnChange} />)

      const dropdown = screen.getByRole('combobox')
      fireEvent.click(dropdown)

      // Wait for dropdown to open and find read-only option
      await waitFor(() => {
        const readOnlyOption = screen.getByText('Read Only')
        expect(readOnlyOption).toBeInTheDocument()
      })

      const readOnlyOption = screen.getByText('Read Only')
      fireEvent.click(readOnlyOption)

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled()
      })
    })
  })

  describe('Toggle Functionality', () => {
    it('should have enable/disable all button', () => {
      const somePermissions: ToolPermission[] = [
        { name: 'Read', enabled: true },
        { name: 'Write', enabled: false },
      ]

      render(<ToolPermissionEditor permissions={somePermissions} onChange={mockOnChange} />)

      expect(screen.getByText('Enable All')).toBeInTheDocument()
    })

    it('should show disable all when all tools are enabled', () => {
      const allEnabled: ToolPermission[] = mockTools.map((tool) => ({
        name: tool,
        enabled: true,
      }))

      render(<ToolPermissionEditor permissions={allEnabled} onChange={mockOnChange} />)

      expect(screen.getByText('Disable All')).toBeInTheDocument()
    })

    it('should call onChange when enable all is clicked', async () => {
      const somePermissions: ToolPermission[] = [
        { name: 'Read', enabled: true },
        { name: 'Write', enabled: false },
      ]

      render(<ToolPermissionEditor permissions={somePermissions} onChange={mockOnChange} />)

      const enableAllButton = screen.getByText('Enable All')
      fireEvent.click(enableAllButton)

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled()
      })
    })
  })

  describe('Advanced Options', () => {
    it('should have advanced options toggle', () => {
      render(<ToolPermissionEditor permissions={[]} onChange={mockOnChange} />)

      expect(screen.getByText('Show Advanced')).toBeInTheDocument()
    })

    it('should toggle advanced options visibility', () => {
      render(<ToolPermissionEditor permissions={[]} onChange={mockOnChange} />)

      const advancedButton = screen.getByText('Show Advanced')
      fireEvent.click(advancedButton)

      expect(screen.getByText('Hide Advanced')).toBeInTheDocument()
    })
  })

  describe('Dynamic Tools Integration', () => {
    it('should handle dynamic tool list from Claude SDK', () => {
      const dynamicTools = ['Read', 'Write', 'Bash', 'Grep', 'CustomTool', 'AnotherTool']

      mockUseAvailableTools.mockReturnValue({
        tools: dynamicTools,
        toolPermissions: dynamicTools.map((tool) => ({ name: tool, enabled: true })),
        loading: false,
        error: null,
        refetch: mockRefetch,
      })

      render(<ToolPermissionEditor permissions={[]} onChange={mockOnChange} />)

      expect(screen.getByText('0 / 6 tools enabled')).toBeInTheDocument()
    })

    it('should work with empty tool list', () => {
      mockUseAvailableTools.mockReturnValue({
        tools: [],
        toolPermissions: [],
        loading: false,
        error: null,
        refetch: mockRefetch,
      })

      render(<ToolPermissionEditor permissions={[]} onChange={mockOnChange} />)

      expect(screen.getByText('0 / 0 tools enabled')).toBeInTheDocument()
    })

    it('should handle error state from tool discovery', () => {
      mockUseAvailableTools.mockReturnValue({
        tools: [],
        toolPermissions: [],
        loading: false,
        error: 'Failed to fetch tools',
        refetch: mockRefetch,
      })

      render(<ToolPermissionEditor permissions={[]} onChange={mockOnChange} />)

      // Should still render but with empty tools
      expect(screen.getByText('0 / 0 tools enabled')).toBeInTheDocument()
    })
  })

  describe('Props Integration', () => {
    it('should accept and use className prop', () => {
      const { container } = render(
        <ToolPermissionEditor permissions={[]} onChange={mockOnChange} className="custom-class" />
      )

      expect(container.firstChild).toHaveClass('custom-class')
    })

    it('should call onChange with correct parameters', async () => {
      render(<ToolPermissionEditor permissions={[]} onChange={mockOnChange} />)

      const enableAllButton = screen.getByText('Enable All')
      fireEvent.click(enableAllButton)

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              name: expect.any(String),
              enabled: true,
            }),
          ])
        )
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper role attributes', () => {
      render(<ToolPermissionEditor permissions={[]} onChange={mockOnChange} />)

      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('should support keyboard navigation', () => {
      render(<ToolPermissionEditor permissions={[]} onChange={mockOnChange} />)

      const dropdown = screen.getByRole('combobox')

      // Should be focusable
      dropdown.focus()
      expect(dropdown).toHaveFocus()
    })
  })
})
