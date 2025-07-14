/**
 * Theme Toggle Component
 *
 * SOLID: Single responsibility - theme switching UI
 * DRY: Reusable theme toggle across different layouts
 * KISS: Simple toggle with clear visual states
 * Library-First: Uses established UI patterns and icons
 */

import { Button } from './button'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const handleCycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark')
    } else if (theme === 'dark') {
      setTheme('system')
    } else {
      setTheme('light')
    }
  }

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="h-4 w-4" />
      case 'dark':
        return <Moon className="h-4 w-4" />
      case 'system':
        return <Monitor className="h-4 w-4" />
      default:
        return <Sun className="h-4 w-4" />
    }
  }

  const getThemeLabel = () => {
    switch (theme) {
      case 'light':
        return 'Light theme'
      case 'dark':
        return 'Dark theme'
      case 'system':
        return 'System theme'
      default:
        return 'Toggle theme'
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCycleTheme}
      title={getThemeLabel()}
      className="flex items-center gap-2"
    >
      {getThemeIcon()}
      <span className="sr-only">{getThemeLabel()}</span>
    </Button>
  )
}
