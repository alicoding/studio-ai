/**
 * ClaudeInstructionsEditor - Editor for CLAUDE.md files
 *
 * SOLID: Single Responsibility - only handles CLAUDE.md editing
 * DRY: Reusable for all three scopes (global/project/local)
 * KISS: Simple textarea with save functionality
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { Save, Loader2, FileText, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import ky from 'ky'

interface ClaudeInstructionsEditorProps {
  scope: 'global' | 'project' | 'local'
  projectPath?: string
  title: string
  description: string
  className?: string
}

export function ClaudeInstructionsEditor({
  scope,
  projectPath,
  title,
  description,
  className = '',
}: ClaudeInstructionsEditorProps) {
  const [content, setContent] = useState('')
  const [originalContent, setOriginalContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch current content
  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({ scope })
        if (projectPath) {
          params.append('projectPath', projectPath)
        }

        const response = await ky.get(`/api/settings/claude-instructions?${params}`).json<{
          global?: { content: string; path: string }
          project?: { content: string; path: string }
          local?: { content: string; path: string }
        }>()

        // Get content based on scope
        const data = response[scope]
        if (data) {
          setContent(data.content)
          setOriginalContent(data.content)
        } else {
          // File doesn't exist yet
          setContent('')
          setOriginalContent('')
        }
      } catch (err) {
        console.error('Failed to load CLAUDE.md:', err)
        setError('Failed to load instructions. The file may not exist yet.')
        setContent('')
        setOriginalContent('')
      } finally {
        setLoading(false)
      }
    }

    fetchContent()
  }, [scope, projectPath])

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      await ky.put('/api/settings/claude-instructions', {
        json: {
          scope,
          content,
          projectPath,
        },
      })

      setOriginalContent(content)
      toast.success(`Successfully updated ${scope} CLAUDE.md`)
    } catch (err) {
      console.error('Failed to save CLAUDE.md:', err)
      toast.error('Could not save instructions. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = content !== originalContent

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // If no title/description provided, render without Card wrapper (for modal use)
  if (!title && !description) {
    return (
      <div className={`space-y-4 ${className}`}>
        {error && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`Enter ${scope} instructions for Claude...`}
          className="min-h-[400px] font-mono text-sm resize-none"
          spellCheck={false}
        />

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{hasChanges && '• Unsaved changes'}</p>

          <Button onClick={handleSave} disabled={saving || !hasChanges} size="sm">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    )
  }

  // Original Card-based layout for settings page
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`Enter ${scope} instructions for Claude...`}
          className="min-h-[300px] font-mono text-sm"
          spellCheck={false}
        />

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {scope === 'global' && 'These instructions apply to all projects'}
            {scope === 'project' && 'These instructions are shared with your team'}
            {scope === 'local' && 'These are your personal instructions for this project'}
          </p>

          <Button onClick={handleSave} disabled={saving || !hasChanges} size="sm">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
