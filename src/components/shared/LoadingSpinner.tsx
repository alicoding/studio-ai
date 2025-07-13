import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
}

export function LoadingSpinner({ size = 'md', text }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center justify-center gap-2 p-4">
      <Loader2 className={`animate-spin text-blue-500 ${sizeClasses[size]}`} />
      {text && <span className="text-muted-foreground text-sm">{text}</span>}
    </div>
  )
}
