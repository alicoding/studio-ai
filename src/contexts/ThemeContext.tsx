/**
 * Theme Context Provider for Claude Studio
 *
 * SOLID: Single responsibility - theme state management
 * DRY: Centralized theme logic used across all components
 * KISS: Simple light/dark theme toggle with persistence
 * Library-First: Uses React Context and localStorage patterns
 */

import { createContext, useEffect, useState, ReactNode } from 'react'

export type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

export function ThemeProvider({
  children,
  defaultTheme = 'light',
  storageKey = 'claude-studio-theme',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Check localStorage first
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey) as Theme
      if (stored === 'light' || stored === 'dark') {
        return stored
      }
    }

    // Check system preference
    if (typeof window !== 'undefined') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      return systemTheme
    }

    return defaultTheme
  })

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)

    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, newTheme)
    }
  }

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement

    // Remove previous theme class
    root.removeAttribute('data-theme')

    // Add new theme class
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark')
    }
  }, [theme])

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = (e: MediaQueryListEvent) => {
      // Only auto-switch if user hasn't manually set a preference
      const stored = localStorage.getItem(storageKey)
      if (!stored) {
        setThemeState(e.matches ? 'dark' : 'light')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [storageKey])

  const value: ThemeContextType = {
    theme,
    setTheme,
    toggleTheme,
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
