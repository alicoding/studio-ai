import { useState } from 'react'
import { Modal } from '../shared/Modal'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Card } from '../ui/card'
import { Checkbox } from '../ui/checkbox'
import { FolderOpen, GitBranch } from 'lucide-react'

interface Project {
  name: string
  description: string
  thumbnail?: string
  directory?: string
  template?: string
  gitInit?: boolean
}

interface CreateProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (project: Project) => void
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
      directory: directory.trim() || defaultDirectory,
      template: selectedTemplate,
      gitInit,
    })

    // Reset form
    setName('')
    setDescription('')
    setSelectedTemplate('blank')
    setDirectory('')
    setGitInit(true)
  }

  const handleClose = () => {
    setName('')
    setDescription('')
    setSelectedTemplate('blank')
    setDirectory('')
    setGitInit(true)
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
