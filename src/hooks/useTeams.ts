import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { studioApi } from '../services/api'
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
      const data = await studioApi.teams.getAll()
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
      const newTeam = await studioApi.teams.create(team)
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
      const updatedTeam = await studioApi.teams.update(id, updates)
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
      await studioApi.teams.delete(id)
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
      const clonedTeam = await studioApi.teams.clone(id, name)
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
      const result = await studioApi.teams.spawn(teamId, projectId)
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
      const importedTeam = await studioApi.teams.import(teamData)
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