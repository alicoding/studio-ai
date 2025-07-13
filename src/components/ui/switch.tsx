import * as React from 'react'

import { cn } from '@/lib/utils'

interface SwitchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

function Switch({ className, checked = false, onCheckedChange, ...props }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      data-slot="switch"
      data-state={checked ? 'checked' : 'unchecked'}
      className={cn(
        'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-xs transition-colors',
        'bg-gray-200 data-[state=checked]:bg-primary',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:ring-destructive/20 aria-invalid:border-destructive',
        className
      )}
      onClick={() => onCheckedChange?.(!checked)}
      {...props}
    >
      <div
        data-slot="switch-thumb"
        className={cn(
          'pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0'
        )}
      />
    </button>
  )
}

export { Switch }