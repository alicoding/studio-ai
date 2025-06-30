import { ReactNode } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './dialog'
import { ScrollableContainer } from './scrollable-container'
import { cn } from '../../lib/utils'

interface ModalLayoutProps {
  isOpen: boolean
  onClose: () => void
  title: string | ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  className?: string
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl'
}

/**
 * DRY modal layout with consistent scrolling behavior
 * Header and footer are fixed, content scrolls
 */
export function ModalLayout({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = '2xl',
  className
}: ModalLayoutProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={cn(sizeClasses[size], "max-h-[90vh] flex flex-col", className)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <ScrollableContainer 
          className="flex-1 py-4" 
          maxHeight="calc(90vh - 200px)"
        >
          {children}
        </ScrollableContainer>
        
        {footer && (
          <DialogFooter className="pt-4 border-t">
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}