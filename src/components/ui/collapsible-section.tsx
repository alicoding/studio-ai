import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/utils'

interface CollapsibleSectionProps {
  title: string
  icon?: React.ReactNode
  badge?: string | number
  defaultOpen?: boolean
  className?: string
  headerClassName?: string
  contentClassName?: string
  children: React.ReactNode
  actions?: React.ReactNode
}

export function CollapsibleSection({
  title,
  icon,
  badge,
  defaultOpen = false,
  className,
  headerClassName,
  contentClassName,
  children,
  actions,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className={cn('border-b border-border/50', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full px-3 py-2 flex items-center gap-1 hover:bg-accent/50 transition-colors text-sm',
          headerClassName
        )}
      >
        {isOpen ? (
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
        )}
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <span className="font-medium uppercase text-xs tracking-wider text-muted-foreground">
          {title}
        </span>
        {badge !== undefined && (
          <span className="ml-auto text-xs text-muted-foreground">({badge})</span>
        )}
        {actions && (
          <div
            className="ml-auto"
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            {actions}
          </div>
        )}
      </button>
      {isOpen && <div className={cn('overflow-hidden', contentClassName)}>{children}</div>}
    </div>
  )
}
