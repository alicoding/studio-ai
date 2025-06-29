import { useState, useEffect } from 'react'
import { useWebSocket } from './useWebSocket'

interface TeamTemplate {
  id: string
  name: string
  description: string
  agents: Array<{
    role: string
    name: string
    systemPrompt: string
  }>
  createdAt: string
}

interface ActiveTeam {
  projectId: string
  teamId: string
  agents: string[]
}

export function useTeams() {
  const [templates, setTemplates] = useState<TeamTemplate[]>([])
  const [activeTeams, setActiveTeams] = useState<ActiveTeam[]>([])
  const { on, off, emit } = useWebSocket()

  useEffect(() => {
    const handleInitialState = (data: { templates: TeamTemplate[]; activeTeams: ActiveTeam[] }) => {
      setTemplates(data.templates)
      setActiveTeams(data.activeTeams)
    }

    const handleTemplateCreated = (template: TeamTemplate) => {
      setTemplates((prev) => [...prev, template])
    }

    const handleTemplateUpdated = (template: TeamTemplate) => {
      setTemplates((prev) => prev.map((t) => (t.id === template.id ? template : t)))
    }

    const handleTemplateDeleted = (templateId: string) => {
      setTemplates((prev) => prev.filter((t) => t.id !== templateId))
    }

    const handleTeamSpawned = (team: ActiveTeam) => {
      setActiveTeams((prev) => [...prev, team])
    }

    on('teams:initial-state', handleInitialState)
    on('team:template-created', handleTemplateCreated)
    on('team:template-updated', handleTemplateUpdated)
    on('team:template-deleted', handleTemplateDeleted)
    on('team:spawned', handleTeamSpawned)

    return () => {
      off('teams:initial-state', handleInitialState)
      off('team:template-created', handleTemplateCreated)
      off('team:template-updated', handleTemplateUpdated)
      off('team:template-deleted', handleTemplateDeleted)
      off('team:spawned', handleTeamSpawned)
    }
  }, [on, off])

  const createTemplate = (template: Omit<TeamTemplate, 'id' | 'createdAt'>) => {
    emit('team:create-template', template)
  }

  const updateTemplate = (id: string, updates: Partial<TeamTemplate>) => {
    emit('team:update-template', { id, ...updates })
  }

  const deleteTemplate = (id: string) => {
    emit('team:delete-template', id)
  }

  const spawnTeam = (templateId: string, projectId: string) => {
    emit('team:spawn', { templateId, projectId })
  }

  return {
    templates,
    activeTeams,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    spawnTeam,
  }
}
