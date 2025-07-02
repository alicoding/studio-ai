import { useEffect } from 'react'
import { useProjectStore } from '../stores'

/**
 * DRY: Shared hook for fetching projects
 * Used by both workspace and projects pages
 */
export function useProjects() {
  const { projects, isLoading, error, fetchProjects } = useProjectStore()

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  return {
    projects,
    isLoading,
    error,
    refetch: fetchProjects,
  }
}