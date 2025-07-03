import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { TeamTemplateCard } from '../components/teams/TeamTemplateCard'
import { TeamBuilder } from '../components/teams/TeamBuilder'
import { TeamExportImport } from '../components/teams/TeamExportImport'
import { PageLayout } from '../components/layout/PageLayout'
import { useTeams } from '../hooks/useTeams'
import { TeamTemplate } from '../types/teams'
import { useProjectStore, useAgentStore } from '../stores'
import { toast } from 'sonner'

export const Route = createFileRoute('/teams')({
  component: TeamsPage,
})

// Test component that throws error during render
function ErrorTest() {
  throw new Error('Test Error Boundary - This error is intentional!')
  return null
}

function TeamsPage() {
  const { teams, loading, createTeam, updateTeam, cloneTeam, exportTeam, importTeam, spawnTeam } = useTeams()
  const { activeProjectId } = useProjectStore()
  const { configs, setAgentConfigs } = useAgentStore()
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<TeamTemplate | null>(null)
  const [showError, setShowError] = useState(false)
  
  // Load agent configs if not already loaded
  useEffect(() => {
    if (configs.length === 0) {
      fetch('/api/agents')
        .then(res => res.json())
        .then(data => {
          setAgentConfigs(data)
        })
        .catch(err => console.error('Failed to load agents:', err))
    }
  }, [configs.length, setAgentConfigs])

  const handleUseTemplate = async (id: string) => {
    if (!activeProjectId) {
      toast.error('Please select a project first')
      return
    }
    
    try {
      const result = await spawnTeam(id, activeProjectId)
      if (result) {
        toast.success(`Team spawned successfully with ${result.agents.length} agents`)
      }
    } catch (error) {
      console.error('Failed to spawn team:', error)
      toast.error('Failed to spawn team')
    }
  }

  const handleCloneTemplate = async (id: string) => {
    await cloneTeam(id)
  }

  const handleEditTemplate = (id: string) => {
    const template = teams.find((t) => t.id === id)
    if (template) {
      setEditingTemplate(template)
      setShowBuilder(true)
    }
  }

  const handleExportTemplate = (id: string) => {
    const template = teams.find((t) => t.id === id)
    if (template) {
      exportTeam(template)
    }
  }

  const handleSaveTemplate = async (template: Omit<TeamTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingTemplate) {
      await updateTeam(editingTemplate.id, template)
    } else {
      await createTeam(template)
    }
    setShowBuilder(false)
    setEditingTemplate(null)
  }

  const handleImportTemplate = async (template: TeamTemplate) => {
    await importTeam(template)
  }

  return (
    <PageLayout>
      <div className="flex flex-col space-y-6 bg-background">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Team Templates</h1>
          <button
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            onClick={() => {
              setEditingTemplate(null)
              setShowBuilder(true)
            }}
          >
            Create New Team
          </button>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <TeamExportImport onImport={handleImportTemplate} />
          <button
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
            onClick={() => setShowError(true)}
          >
            Test Error Boundary
          </button>
        </div>

        {showError && <ErrorTest />}

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Loading team templates...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto">
            {teams.map((template) => (
              <TeamTemplateCard
                key={template.id}
                template={template}
                onUse={handleUseTemplate}
                onClone={handleCloneTemplate}
                onEdit={handleEditTemplate}
                onExport={handleExportTemplate}
              />
            ))}
          </div>
        )}

        <TeamBuilder
          isOpen={showBuilder}
          template={editingTemplate}
          onSave={handleSaveTemplate}
          onCancel={() => {
            setShowBuilder(false)
            setEditingTemplate(null)
          }}
        />
      </div>
    </PageLayout>
  )
}
