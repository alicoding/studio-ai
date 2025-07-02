import { cn } from '../../lib/utils'
import { ReactNode } from 'react'

interface ScrollableContainerProps {
  children: ReactNode
  className?: string
  maxHeight?: string
}

/**
 * DRY component for scrollable content areas
 * Handles overflow and scrollbar styling consistently
 */
export function ScrollableContainer({ 
  children, 
  className,
  maxHeight = 'calc(100vh - 200px)' // Default for pages, modals can override
}: ScrollableContainerProps) {
  return (
    <div 
      className={cn(
        "overflow-y-auto",
        "scrollbar-thin", // Using existing scrollbar styles from index.css
        "pr-2", // Padding for scrollbar
        className
      )}
      style={{ maxHeight }}
    >
      {children}
    </div>
  )
}