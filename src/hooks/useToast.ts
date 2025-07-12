import { useCallback } from 'react'

interface ToastOptions {
  title: string
  description?: string
  variant?: 'default' | 'destructive'
}

export function useToast() {
  const toast = useCallback((options: ToastOptions) => {
    // Simple implementation - you can replace with a proper toast library
    if (options.variant === 'destructive') {
      console.error(`${options.title}: ${options.description || ''}`)
      alert(`Error: ${options.title}\n${options.description || ''}`)
    } else {
      console.log(`${options.title}: ${options.description || ''}`)
      // For now, just log success messages
      // In production, you'd use a proper toast notification library
    }
  }, [])

  return { toast }
}
