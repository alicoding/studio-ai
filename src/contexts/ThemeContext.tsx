/**
 * Theme Context Provider for Studio AI
 *
 * SOLID: Single responsibility - theme state management
 * DRY: Centralized theme logic used across all components
 * KISS: Simple light/dark theme toggle with persistence
 * Library-First: Uses React Context and localStorage patterns
 */

import { createContext, useEffect, useState, ReactNode } from 'react'

export type Theme = 'light' | 'dark' | 'system'

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
  storageKey = 'studio-ai-theme',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Check localStorage first
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey) as Theme
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
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

    // Determine effective theme
    let effectiveTheme = theme
    if (theme === 'system') {
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }

    // Add new theme class
    if (effectiveTheme === 'dark') {
      root.setAttribute('data-theme', 'dark')
    }
  }, [theme])

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = (_e: MediaQueryListEvent) => {
      // Update theme if user is using system preference
      if (theme === 'system') {
        // Force re-render to apply new system theme
        setThemeState('system')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme, storageKey])

  const value: ThemeContextType = {
    theme,
    setTheme,
    toggleTheme,
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
