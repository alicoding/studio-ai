import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { TeamTemplateCard } from '../components/teams/TeamTemplateCard'
import { TeamBuilder } from '../components/teams/TeamBuilder'
import { TeamExportImport } from '../components/teams/TeamExportImport'
import { PageLayout } from '../components/layout/PageLayout'
// import { useAgentStore } from '../stores'

export const Route = createFileRoute('/teams')({
  component: TeamsPage,
})

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

// Test component that throws error during render
function ErrorTest() {
  throw new Error('Test Error Boundary - This error is intentional!')
  return null
}

const MOCK_TEMPLATES: TeamTemplate[] = [
  {
    id: 'prototype',
    name: 'Prototype Team',
    description: 'Quick UI/UX prototyping team with designer and developer',
    agents: [
      { role: 'ux', name: 'ux_designer', systemPrompt: 'You are a UX designer...' },
      { role: 'dev', name: 'frontend_dev', systemPrompt: 'You are a frontend developer...' },
    ],
    createdAt: '2024-01-15',
  },
  {
    id: 'backend',
    name: 'Backend Team',
    description: 'Full backend development team with architect and developers',
    agents: [
      {
        role: 'architect',
        name: 'system_architect',
        systemPrompt: 'You are a system architect...',
      },
      { role: 'dev', name: 'backend_dev', systemPrompt: 'You are a backend developer...' },
      { role: 'tester', name: 'qa_engineer', systemPrompt: 'You are a QA engineer...' },
    ],
    createdAt: '2024-01-10',
  },
  {
    id: 'fullstack',
    name: 'Full Stack Team',
    description: 'Complete development team for full-stack applications',
    agents: [
      { role: 'orchestrator', name: 'project_lead', systemPrompt: 'You are a project lead...' },
      {
        role: 'architect',
        name: 'tech_architect',
        systemPrompt: 'You are a technical architect...',
      },
      { role: 'dev', name: 'frontend_dev', systemPrompt: 'You are a frontend developer...' },
      { role: 'dev', name: 'backend_dev', systemPrompt: 'You are a backend developer...' },
      { role: 'tester', name: 'qa_specialist', systemPrompt: 'You are a QA specialist...' },
    ],
    createdAt: '2024-01-05',
  },
]

function TeamsPage() {
  const [templates, setTemplates] = useState(MOCK_TEMPLATES)
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<TeamTemplate | null>(null)
  const [showError, setShowError] = useState(false)

  const handleUseTemplate = (id: string) => {
    console.log('Using template:', id)
    // TODO: Spawn team from template
  }

  const handleCloneTemplate = (id: string) => {
    const template = templates.find((t) => t.id === id)
    if (template) {
      const cloned = {
        ...template,
        id: `${template.id}-copy-${Date.now()}`,
        name: `${template.name} (Copy)`,
        createdAt: new Date().toISOString(),
      }
      setTemplates([...templates, cloned])
    }
  }

  const handleEditTemplate = (id: string) => {
    const template = templates.find((t) => t.id === id)
    if (template) {
      setEditingTemplate(template)
      setShowBuilder(true)
    }
  }

  const handleExportTemplate = (id: string) => {
    const template = templates.find((t) => t.id === id)
    if (template) {
      const json = JSON.stringify(template, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${template.id}-team.json`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleSaveTemplate = (template: TeamTemplate) => {
    if (editingTemplate) {
      setTemplates(templates.map((t) => (t.id === editingTemplate.id ? template : t)))
    } else {
      setTemplates([...templates, template])
    }
    setShowBuilder(false)
    setEditingTemplate(null)
  }

  const handleImportTemplate = (template: TeamTemplate) => {
    setTemplates([...templates, template])
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto">
          {templates.map((template) => (
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
