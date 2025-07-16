/**
 * Theme hooks for Studio AI
 *
 * SOLID: Single responsibility - theme-related hooks only
 * DRY: Centralized theme logic used across components
 * KISS: Simple theme access and approval color utilities
 * Library-First: Uses React Context patterns
 */

import { useContext } from 'react'
import { ThemeContext } from '../contexts/ThemeContext'

/**
 * Hook to use theme context
 */
export function useTheme() {
  const context = useContext(ThemeContext)

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }

  return context
}

/**
 * Hook to get theme-aware approval colors
 */
export function useApprovalColors() {
  const { theme } = useTheme()

  return {
    // Risk level colors
    getRiskColor: (level: 'critical' | 'high' | 'medium' | 'low') =>
      ({
        critical: {
          bg: 'var(--color-approval-critical-bg)',
          text: 'var(--color-approval-critical-foreground)',
          border: 'var(--color-approval-critical)',
        },
        high: {
          bg: 'var(--color-approval-high-bg)',
          text: 'var(--color-approval-high-foreground)',
          border: 'var(--color-approval-high)',
        },
        medium: {
          bg: 'var(--color-approval-medium-bg)',
          text: 'var(--color-approval-medium-foreground)',
          border: 'var(--color-approval-medium)',
        },
        low: {
          bg: 'var(--color-approval-low-bg)',
          text: 'var(--color-approval-low-foreground)',
          border: 'var(--color-approval-low)',
        },
      })[level],

    // Status colors
    getStatusColor: (status: 'pending' | 'approved' | 'rejected' | 'overdue') =>
      ({
        pending: {
          bg: 'var(--color-approval-pending-bg)',
          text: 'var(--color-approval-pending)',
        },
        approved: {
          bg: 'var(--color-approval-approved-bg)',
          text: 'var(--color-approval-approved)',
        },
        rejected: {
          bg: 'var(--color-approval-rejected-bg)',
          text: 'var(--color-approval-rejected)',
        },
        overdue: {
          bg: 'var(--color-approval-overdue-bg)',
          text: 'var(--color-approval-overdue)',
        },
      })[status],

    // Action colors
    actions: {
      approve: 'var(--color-approval-action-approve)',
      reject: 'var(--color-approval-action-reject)',
    },

    // Interface colors
    canvas: {
      bg: 'var(--color-approval-canvas-bg)',
      cardBg: 'var(--color-approval-card-bg)',
      cardBorder: 'var(--color-approval-card-border)',
      queueBg: 'var(--color-approval-queue-bg)',
    },

    theme,
  }
}
