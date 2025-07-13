import { ReactNode } from 'react'

interface PageLayoutProps {
  children: ReactNode
}

export function PageLayout({ children }: PageLayoutProps) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6">{children}</div>
    </div>
  )
}
