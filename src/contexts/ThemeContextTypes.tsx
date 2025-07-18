/**
 * Theme Context Types for Studio AI
 *
 * SOLID: Single responsibility - theme type definitions
 * DRY: Centralized theme types used across all components
 * KISS: Simple light/dark theme toggle types
 * Library-First: Uses React Context patterns
 */

import { createContext } from 'react'

export type Theme = 'light' | 'dark' | 'system'

export interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined)
