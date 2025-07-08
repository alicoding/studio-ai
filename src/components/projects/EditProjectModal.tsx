import { useState, useEffect } from 'react'
import { X, FileText } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { ClaudeInstructionsEditor } from '../settings/ClaudeInstructionsEditor'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'

interface Project {
  id: string
  name: string
  description?: string
  path: string
  status: 'active' | 'archived' | 'draft'
  tags: string[]
  studioMetadata?: {
    notes: string
  }
}

interface EditProjectModalProps {
  isOpen: boolean
  onClose: () => void
  project: Project | null
  onSave: (
    projectId: string,
    metadata: {
      status?: 'active' | 'archived' | 'draft'
      tags?: string[]
      notes?: string
    }
  ) => Promise<void>
}

export function EditProjectModal({ isOpen, onClose, project, onSave }: EditProjectModalProps) {
  const [status, setStatus] = useState<'active' | 'archived' | 'draft'>('active')
  const [tags, setTags] = useState('')
  const [notes, setNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (project) {
      setStatus(project.status || 'active')
      setTags(project.tags?.join(', ') || '')
      setNotes(project.studioMetadata?.notes || '')
    }
  }, [project])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!project) return

    setIsSaving(true)
    try {
      await onSave(project.id, {
        status,
        tags: tags
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0),
        notes: notes.trim(),
      })
      onClose()
    } catch (error) {
      console.error('Failed to save project metadata:', error)
      alert('Failed to save changes. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen || !project) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="relative bg-background border border-border rounded-lg w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="p-6 pb-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>

          <h2 className="text-2xl font-bold mb-4">Edit Project</h2>
        </div>

        <Tabs defaultValue="metadata" className="flex-1 flex flex-col">
          <TabsList className="mx-6 mb-4">
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
            <TabsTrigger value="instructions" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Claude Instructions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="metadata" className="flex-1 overflow-y-auto px-6">
            <div className="mb-4 p-3 bg-muted/50 rounded">
              <h3 className="font-semibold">{project.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {project.description || 'No description'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Path: {project.path}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="status">Project Status</Label>
                <Select
                  value={status}
                  onValueChange={(value) => setStatus(value as 'active' | 'archived' | 'draft')}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Set the project status to organize your workflow
                </p>
              </div>

              <div>
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="react, nodejs, web-app"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Comma-separated tags to categorize this project
                </p>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes or context about this project..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Personal notes about this project (only stored in Claude Studio)
                </p>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="instructions" className="flex-1 overflow-y-auto">
            <div className="px-6 pb-6">
              <Tabs defaultValue="project" className="h-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="project">
                    <FileText className="w-4 h-4 mr-2" />
                    Project Instructions
                  </TabsTrigger>
                  <TabsTrigger value="local">
                    <FileText className="w-4 h-4 mr-2" />
                    Personal Instructions
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="project" className="mt-4">
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-sm font-medium mb-1">Project Claude Instructions</h3>
                      <p className="text-xs text-muted-foreground">
                        Shared instructions for this project (saved to CLAUDE.md in git)
                      </p>
                    </div>
                    <ClaudeInstructionsEditor
                      scope="project"
                      projectPath={project.path}
                      title=""
                      description=""
                      className="border-0 shadow-none p-0"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="local" className="mt-4">
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-sm font-medium mb-1">Personal Claude Instructions</h3>
                      <p className="text-xs text-muted-foreground">
                        Your personal instructions for this project (saved to CLAUDE.local.md, not
                        shared)
                      </p>
                    </div>
                    <ClaudeInstructionsEditor
                      scope="local"
                      projectPath={project.path}
                      title=""
                      description=""
                      className="border-0 shadow-none p-0"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 p-6 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving} onClick={handleSubmit}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}
