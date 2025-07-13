import { ReactNode } from 'react'
import { ScrollableContainer } from './scrollable-container'
import { cn } from '../../lib/utils'

interface PageLayoutProps {
  title: string
  description?: string
  children: ReactNode
  actions?: ReactNode
  className?: string
  contentClassName?: string
}

/**
 * DRY page layout with consistent header and scrolling
 */
export function PageLayout({
  title,
  description,
  children,
  actions,
  className,
  contentClassName
}: PageLayoutProps) {
  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Fixed header */}
      <div className="px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            {description && (
              <p className="text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      </div>
      
      {/* Scrollable content */}
      <ScrollableContainer 
        className={cn("flex-1 p-6", contentClassName)}
        maxHeight="calc(100vh - 150px)" // Account for nav + header
      >
        {children}
      </ScrollableContainer>
    </div>
  )
}