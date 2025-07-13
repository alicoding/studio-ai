import { ReactNode } from 'react'
import { DevModeIndicator } from './DevModeIndicator'

interface DevWrapperProps {
  children: ReactNode
}

/**
 * Development wrapper - our stores now persist automatically
 * so we don't need manual localStorage handling
 */
export function DevWrapper({ children }: DevWrapperProps) {
  return (
    <>
      {children}
      <DevModeIndicator />
    </>
  )
}