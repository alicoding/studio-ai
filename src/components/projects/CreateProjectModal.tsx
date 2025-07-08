import { useState, useEffect, useMemo } from 'react'
import { Modal } from '../shared/Modal'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Card } from '../ui/card'
import { Checkbox } from '../ui/checkbox'
import { FolderOpen, GitBranch, FileText, Users, User } from 'lucide-react'
import { getClaudeTemplate } from '../../lib/claude-templates'
import { useAgentStore } from '../../stores/agents'
import { useTeams } from '../../hooks/useTeams'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'

interface CreateProjectData {
  name: string
  description: string
  thumbnail?: string
  path?: string
  template?: string
  gitInit?: boolean
  claudeInstructions?: string
  agents?: Array<{ configId: string; role: string }> // Agent assignments with roles
  teamId?: string // Team ID to spawn
}

interface CreateProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (project: CreateProjectData) => void
}

const PROJECT_TEMPLATES = [
  {
    id: 'blank',
    name: 'Blank Project',
    description: 'Start with an empty project',
    thumbnail: '📄',
  },
  {
    id: 'webapp',
    name: 'Web Application',
    description: 'Full-stack web app with frontend and backend',
    thumbnail: '🌐',
  },
  {
    id: 'mobile',
    name: 'Mobile App',
    description: 'React Native or Flutter mobile application',
    thumbnail: '📱',
  },
  {
    id: 'data-science',
    name: 'Data Science',
    description: 'Python data analysis and ML project',
    thumbnail: '📊',
  },
  {
    id: 'api',
    name: 'API Project',
    description: 'Backend API with database integration',
    thumbnail: '🔌',
  },
]

export function CreateProjectModal({ isOpen, onClose, onCreate }: CreateProjectModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('blank')
  const [directory, setDirectory] = useState('')
  const [gitInit, setGitInit] = useState(true)
  const [claudeInstructions, setClaudeInstructions] = useState('')
  const [showClaudeEditor, setShowClaudeEditor] = useState(false)
  const [agentAssignmentMode, setAgentAssignmentMode] = useState<'none' | 'individual' | 'team'>(
    'none'
  )
  const [selectedAgents, setSelectedAgents] = useState<Array<{ configId: string; role: string }>>(
    []
  )
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)

  const { configs } = useAgentStore()
  const { teams } = useTeams()

  // Memoize teams and configs to prevent infinite re-renders
  const memoizedTeams = useMemo(() => teams, [teams])
  const memoizedConfigs = useMemo(() => configs, [configs])

  // Update CLAUDE.md template when project template changes
  useEffect(() => {
    const template = getClaudeTemplate(selectedTemplate)
    setClaudeInstructions(template)
  }, [selectedTemplate])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const template = PROJECT_TEMPLATES.find((t) => t.id === selectedTemplate)
    const projectName = name.trim()
    const defaultDirectory = `~/projects/${projectName.toLowerCase().replace(/\s+/g, '-')}`

    onCreate({
      name: projectName,
      description: description.trim() || template?.description || '',
      thumbnail: template?.thumbnail,
      path: directory.trim() || defaultDirectory,
      template: selectedTemplate,
      gitInit,
      claudeInstructions,
      agents: agentAssignmentMode === 'individual' ? selectedAgents : undefined,
      teamId: agentAssignmentMode === 'team' ? selectedTeam || undefined : undefined,
    })

    // Reset form
    setName('')
    setDescription('')
    setSelectedTemplate('blank')
    setDirectory('')
    setGitInit(true)
    setAgentAssignmentMode('none')
    setSelectedAgents([])
    setSelectedTeam(null)
  }

  const handleClose = () => {
    setName('')
    setDescription('')
    setSelectedTemplate('blank')
    setDirectory('')
    setGitInit(true)
    setAgentAssignmentMode('none')
    setSelectedAgents([])
    setSelectedTeam(null)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create New Project">
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="project-name">Project Name</Label>
          <Input
            id="project-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., My Awesome Project"
            required
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="project-description">Description</Label>
          <Textarea
            id="project-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this project is about..."
            rows={3}
            className="resize-none"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="project-directory">Project Directory</Label>
          <div className="relative">
            <FolderOpen className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="project-directory"
              type="text"
              value={directory}
              onChange={(e) => setDirectory(e.target.value)}
              placeholder={`~/projects/${name.toLowerCase().replace(/\s+/g, '-') || 'my-project'}`}
              className="pl-10"
            />
          </div>
          <p className="text-xs text-muted-foreground">Leave empty to use default location</p>
        </div>

        <div className="space-y-2">
          <Label>Project Template</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PROJECT_TEMPLATES.map((template) => (
              <Card
                key={template.id}
                className={`p-3 cursor-pointer transition-colors hover:bg-accent ${
                  selectedTemplate === template.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedTemplate(template.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{template.thumbnail}</div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm">{template.name}</h4>
                    <p className="text-muted-foreground text-xs mt-1">{template.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="git-init"
            checked={gitInit}
            onCheckedChange={(checked) => setGitInit(checked as boolean)}
          />
          <Label
            htmlFor="git-init"
            className="flex items-center gap-2 text-sm font-normal cursor-pointer"
          >
            <GitBranch className="h-4 w-4" />
            Initialize Git repository
          </Label>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Claude Instructions (CLAUDE.md)
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowClaudeEditor(!showClaudeEditor)}
            >
              {showClaudeEditor ? 'Hide' : 'Edit'}
            </Button>
          </div>
          {showClaudeEditor && (
            <>
              <Textarea
                value={claudeInstructions}
                onChange={(e) => setClaudeInstructions(e.target.value)}
                placeholder="Instructions for Claude when working with this project..."
                rows={10}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                These instructions will be saved as CLAUDE.md in your project root
              </p>
            </>
          )}
        </div>

        <div className="space-y-2">
          <Label>Agent Assignment</Label>
          <Tabs
            value={agentAssignmentMode}
            onValueChange={(value) =>
              setAgentAssignmentMode(value as 'none' | 'individual' | 'team')
            }
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="none">No Agents</TabsTrigger>
              <TabsTrigger value="individual">
                <User className="h-4 w-4 mr-1" />
                Individual
              </TabsTrigger>
              <TabsTrigger value="team">
                <Users className="h-4 w-4 mr-1" />
                Team
              </TabsTrigger>
            </TabsList>

            <TabsContent value="none" className="mt-3">
              <p className="text-sm text-muted-foreground">
                Start with an empty project. You can add agents later.
              </p>
            </TabsContent>

            <TabsContent value="individual" className="mt-3">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Select individual agents to add to this project:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {memoizedConfigs.map((config) => (
                    <Card
                      key={config.id}
                      className={`p-3 cursor-pointer transition-colors hover:bg-accent ${
                        selectedAgents.some((a) => a.configId === config.id)
                          ? 'ring-2 ring-primary'
                          : ''
                      }`}
                      onClick={() => {
                        setSelectedAgents((prev) => {
                          const existing = prev.find((a) => a.configId === config.id)
                          if (existing) {
                            return prev.filter((a) => a.configId !== config.id)
                          } else {
                            return [...prev, { configId: config.id, role: config.role }]
                          }
                        })
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedAgents.some((a) => a.configId === config.id)}
                          onCheckedChange={() => {}} // Handled by Card onClick
                          className="pointer-events-none"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{config.name}</h4>
                          <p className="text-muted-foreground text-xs truncate">{config.role}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
                {memoizedConfigs.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No agent configurations available. Create agents first.
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="team" className="mt-3">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Select a team template to spawn all its agents:
                </p>
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                  {memoizedTeams.map((team) => (
                    <Card
                      key={team.id}
                      className={`p-3 cursor-pointer transition-colors hover:bg-accent ${
                        selectedTeam === team.id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => setSelectedTeam(team.id)}
                    >
                      <div className="flex items-start gap-3">
                        <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm">{team.name}</h4>
                          <p className="text-muted-foreground text-xs mt-1">
                            {team.description || 'No description'}
                          </p>
                          <p className="text-muted-foreground text-xs mt-1">
                            {team.agents.length} agent{team.agents.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
                {memoizedTeams.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No team templates available. Create teams first.
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </form>

      <div className="flex items-center justify-end gap-3 p-4 border-t">
        <Button variant="ghost" onClick={handleClose}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={!name.trim()}>
          Create Project
        </Button>
      </div>
    </Modal>
  )
}
