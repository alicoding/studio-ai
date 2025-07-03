import { ReactNode, useEffect } from 'react'
import { useAgentStore } from '../stores/agents'
import { useProjectStore } from '../stores/projects'
import { DevModeIndicator } from './DevModeIndicator'

interface DevWrapperProps {
  children: ReactNode
}

/**
 * Development wrapper to preserve state during hot reloads
 * Only active in development mode
 */
export function DevWrapper({ children }: DevWrapperProps) {
  const selectedAgentId = useAgentStore((state) => state.selectedAgentId)
  const activeProjectId = useProjectStore((state) => state.activeProjectId)
  const setSelectedAgent = useAgentStore((state) => state.setSelectedAgent)
  const setActiveProject = useProjectStore((state) => state.setActiveProject)

  useEffect(() => {
    if (import.meta.env.DEV) {
      // Restore state from localStorage on mount
      const savedAgentId = localStorage.getItem('dev_selectedAgentId')
      const savedProjectId = localStorage.getItem('dev_activeProjectId')
      
      if (savedAgentId && !selectedAgentId) {
        setSelectedAgent(savedAgentId)
      }
      if (savedProjectId && !activeProjectId) {
        setActiveProject(savedProjectId)
      }
    }
  }, [])

  useEffect(() => {
    if (import.meta.env.DEV) {
      // Save state to localStorage when it changes
      if (selectedAgentId) {
        localStorage.setItem('dev_selectedAgentId', selectedAgentId)
      }
      if (activeProjectId) {
        localStorage.setItem('dev_activeProjectId', activeProjectId)
      }
    }
  }, [selectedAgentId, activeProjectId])

  return (
    <>
      {children}
      <DevModeIndicator />
    </>
  )
}