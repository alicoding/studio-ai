import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { 
  TeamTemplate, 
  CreateTeamRequest, 
  UpdateTeamRequest, 
  SpawnTeamResponse 
} from '../types/teams'

export function useTeams() {
  const [teams, setTeams] = useState<TeamTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch all teams
  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/teams')
      if (!response.ok) {
        throw new Error('Failed to fetch teams')
      }
      const data = await response.json()
      setTeams(data)
      setError(null)
    } catch (err) {
      console.error('Error fetching teams:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch teams')
      toast.error('Failed to load team templates')
    } finally {
      setLoading(false)
    }
  }, [])

  // Create a new team
  const createTeam = useCallback(async (team: CreateTeamRequest) => {
    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(team),
      })
      
      if (!response.ok) {
        throw new Error('Failed to create team')
      }
      
      const newTeam = await response.json()
      setTeams(prev => [...prev, newTeam])
      toast.success('Team template created successfully')
      return newTeam
    } catch (err) {
      console.error('Error creating team:', err)
      toast.error('Failed to create team template')
      throw err
    }
  }, [])

  // Update a team
  const updateTeam = useCallback(async (id: string, updates: UpdateTeamRequest) => {
    try {
      const response = await fetch(`/api/teams/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      
      if (!response.ok) {
        throw new Error('Failed to update team')
      }
      
      const updatedTeam = await response.json()
      setTeams(prev => prev.map(t => t.id === id ? updatedTeam : t))
      toast.success('Team template updated successfully')
      return updatedTeam
    } catch (err) {
      console.error('Error updating team:', err)
      toast.error('Failed to update team template')
      throw err
    }
  }, [])

  // Delete a team
  const deleteTeam = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/teams/${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete team')
      }
      
      setTeams(prev => prev.filter(t => t.id !== id))
      toast.success('Team template deleted successfully')
    } catch (err) {
      console.error('Error deleting team:', err)
      toast.error('Failed to delete team template')
      throw err
    }
  }, [])

  // Clone a team
  const cloneTeam = useCallback(async (id: string, name?: string) => {
    try {
      const response = await fetch(`/api/teams/${id}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to clone team')
      }
      
      const clonedTeam = await response.json()
      setTeams(prev => [...prev, clonedTeam])
      toast.success('Team template cloned successfully')
      return clonedTeam
    } catch (err) {
      console.error('Error cloning team:', err)
      toast.error('Failed to clone team template')
      throw err
    }
  }, [])

  // Spawn a team to a project
  const spawnTeam = useCallback(async (teamId: string, projectId: string): Promise<SpawnTeamResponse | null> => {
    try {
      const response = await fetch(`/api/teams/${teamId}/spawn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to spawn team')
      }
      
      const result = await response.json()
      toast.success('Team spawned successfully')
      return result
    } catch (err) {
      console.error('Error spawning team:', err)
      toast.error('Failed to spawn team')
      throw err
    }
  }, [])

  // Import a team from JSON
  const importTeam = useCallback(async (teamData: TeamTemplate) => {
    try {
      const response = await fetch('/api/teams/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team: teamData }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to import team')
      }
      
      const importedTeam = await response.json()
      setTeams(prev => [...prev, importedTeam])
      toast.success('Team template imported successfully')
      return importedTeam
    } catch (err) {
      console.error('Error importing team:', err)
      toast.error('Failed to import team template')
      throw err
    }
  }, [])

  // Export a team to JSON
  const exportTeam = useCallback((team: TeamTemplate) => {
    const json = JSON.stringify(team, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${team.id}-team.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Team template exported')
  }, [])

  // Fetch teams on mount
  useEffect(() => {
    fetchTeams()
  }, [fetchTeams])

  return {
    teams,
    loading,
    error,
    createTeam,
    updateTeam,
    deleteTeam,
    cloneTeam,
    spawnTeam,
    importTeam,
    exportTeam,
    refetch: fetchTeams,
  }
}