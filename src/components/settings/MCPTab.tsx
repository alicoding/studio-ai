/**
 * MCP (Model Context Protocol) Settings Tab
 *
 * SOLID: Single responsibility - MCP server configuration
 * DRY: Reuses existing form components and validation
 * KISS: Simple UI for adding/managing MCP servers
 * Library-First: Uses React Hook Form and Zod
 */

import { useState, useRef } from 'react'
import { Plus, Trash2, Edit2, Save, X, Server, AlertCircle, Upload, Download } from 'lucide-react'
import { useForm, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useMCPSettings } from '../../hooks/useMCPSettings'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Alert } from '../ui/alert'

// MCP Server type is imported from hook
import type { MCPServer } from '../../hooks/useMCPSettings'

const MCPServerFormSchema = z.object({
  name: z.string().min(1, 'Server name is required'),
  command: z.string().min(1, 'Command is required'),
  args: z.string().default(''), // Comma-separated string for UI
  env: z.string().default(''), // Key=value pairs, one per line
  enabled: z.boolean().default(true),
})

type MCPServerForm = z.infer<typeof MCPServerFormSchema>

export function MCPTab() {
  const { servers, loading, error, addServer, updateServer, removeServer } = useMCPSettings()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<MCPServerForm>({
    // @ts-expect-error - Known issue with zod resolver types
    resolver: zodResolver(MCPServerFormSchema),
    defaultValues: {
      name: '',
      command: '',
      args: '',
      env: '',
      enabled: true,
    },
  })

  // Convert form data to server data
  const formToServer = (data: MCPServerForm): MCPServer => {
    return {
      name: data.name,
      command: data.command,
      args: data.args
        ? data.args
            .split(',')
            .map((arg) => arg.trim())
            .filter(Boolean)
        : [],
      env: data.env
        ? Object.fromEntries(
            data.env
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line) => {
                const [key, ...valueParts] = line.split('=')
                return [key, valueParts.join('=')]
              })
          )
        : undefined,
      enabled: data.enabled,
    }
  }

  // Convert server data to form data
  const serverToForm = (server: MCPServer): MCPServerForm => {
    return {
      name: server.name,
      command: server.command,
      args: server.args?.join(', ') || '',
      env: server.env
        ? Object.entries(server.env)
            .map(([key, value]) => `${key}=${value}`)
            .join('\n')
        : '',
      enabled: server.enabled,
    }
  }

  const onSubmit: SubmitHandler<MCPServerForm> = async (data) => {
    try {
      const server = formToServer(data)

      if (editingId) {
        await updateServer(editingId, server)
        toast.success('MCP server updated')
        setEditingId(null)
      } else {
        await addServer(server)
        toast.success('MCP server added')
        setIsAdding(false)
      }

      reset()
    } catch (error) {
      toast.error('Failed to save MCP server')
      console.error(error)
    }
  }

  const handleEdit = (id: string, server: MCPServer) => {
    setEditingId(id)
    setIsAdding(false)
    const formData = serverToForm(server)
    Object.entries(formData).forEach(([key, value]) => {
      setValue(key as keyof MCPServerForm, value)
    })
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this MCP server?')) {
      try {
        await removeServer(id)
        toast.success('MCP server removed')
      } catch (_error) {
        toast.error('Failed to remove MCP server')
      }
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setIsAdding(false)
    reset()
  }

  const handleImport = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const config = JSON.parse(text)

      const response = await fetch('/api/settings/mcp/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })

      if (!response.ok) {
        throw new Error('Failed to import configuration')
      }

      const result = await response.json()
      toast.success(`Imported ${result.imported} servers`)

      // Reload servers
      window.location.reload()
    } catch (error) {
      console.error('Import error:', error)
      toast.error('Failed to import configuration')
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleExport = async () => {
    try {
      const response = await fetch('/api/settings/mcp/export')
      if (!response.ok) {
        throw new Error('Failed to export configuration')
      }

      const config = await response.json()
      const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = 'mcp-config.json'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('Configuration exported')
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export configuration')
    }
  }

  if (loading) {
    return <div className="p-6">Loading MCP settings...</div>
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <span>Failed to load MCP settings: {error}</span>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-2">MCP Server Configuration</h2>
        <p className="text-sm text-muted-foreground">
          Configure Model Context Protocol (MCP) servers to extend Claude's capabilities with
          additional tools.
        </p>
      </div>

      {/* Server List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Configured Servers</h3>
          {!isAdding && !editingId && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleImport}>
                <Upload className="h-4 w-4 mr-1" />
                Import
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleExport}
                disabled={servers.length === 0}
              >
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setIsAdding(true)
                  reset()
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Server
              </Button>
            </div>
          )}
        </div>

        {servers.length === 0 && !isAdding && (
          <div className="text-center py-8 text-muted-foreground">
            <Server className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No MCP servers configured</p>
            <p className="text-sm mt-1">Add a server to extend Claude's capabilities</p>
          </div>
        )}

        {/* Add/Edit Form */}
        {(isAdding || editingId) && (
          <form
            // @ts-expect-error - Known issue with form submit types
            onSubmit={handleSubmit(onSubmit)}
            className="border rounded-lg p-4 space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Server Name</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="e.g., filesystem"
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <Label htmlFor="command">Command</Label>
                <Input
                  id="command"
                  {...register('command')}
                  placeholder="e.g., npx"
                  className={errors.command ? 'border-red-500' : ''}
                />
                {errors.command && (
                  <p className="text-xs text-red-500 mt-1">{errors.command.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="args">Arguments (comma-separated)</Label>
              <Input
                id="args"
                {...register('args')}
                placeholder="e.g., -y, @modelcontextprotocol/server-filesystem, /path/to/files"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Command arguments, separated by commas
              </p>
            </div>

            <div>
              <Label htmlFor="env">Environment Variables</Label>
              <textarea
                id="env"
                {...register('env')}
                className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-input bg-background"
                placeholder="KEY=value&#10;ANOTHER_KEY=another_value&#10;STUDIO_AI_PROJECT_ID={PROJECT_ID}"
              />
              <p className="text-xs text-muted-foreground mt-1">
                One per line, format: KEY=value. Available template variables:
              </p>
              <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                <div>
                  <code className="bg-muted px-1">{'{PROJECT_ID}'}</code> - Current project ID
                </div>
                <div>
                  <code className="bg-muted px-1">{'{PROJECT_NAME}'}</code> - Current project name
                </div>
                <div>
                  <code className="bg-muted px-1">{'{PROJECT_PATH}'}</code> - Project workspace path
                </div>
                <div>
                  <code className="bg-muted px-1">{'{STUDIO_AI_API}'}</code> - Studio API URL
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="enabled"
                {...register('enabled')}
                className="rounded border-gray-300"
              />
              <Label htmlFor="enabled" className="text-sm font-normal">
                Enable this server
              </Label>
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button type="submit" size="sm">
                <Save className="h-4 w-4 mr-1" />
                {editingId ? 'Update' : 'Add'} Server
              </Button>
            </div>
          </form>
        )}

        {/* Server List */}
        <div className="space-y-2">
          {servers.map((server: MCPServer) => (
            <div
              key={server.id}
              className={`border rounded-lg p-4 ${editingId === server.id ? 'border-primary' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium">{server.name}</h4>
                    {!server.enabled && (
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                        Disabled
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {server.command} {server.args?.join(' ')}
                  </p>
                  {server.env && Object.keys(server.env).length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Environment: {Object.keys(server.env).join(', ')}
                    </p>
                  )}
                </div>
                {!isAdding && editingId !== server.id && (
                  <div className="flex space-x-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(server.id!, server)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(server.id!)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Tool Names Preview */}
              <div className="mt-2 pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  Tools will be available as:{' '}
                  <code className="bg-muted px-1 py-0.5 rounded">mcp__{server.name}__toolName</code>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Usage Instructions */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <div className="ml-2">
          <p className="text-sm font-medium">How to use MCP servers:</p>
          <ol className="text-sm text-muted-foreground mt-2 space-y-1 list-decimal list-inside">
            <li>Add your MCP server configuration above</li>
            <li>
              In agent settings, add allowed MCP tools using the format:{' '}
              <code className="bg-muted px-1">mcp__serverName__toolName</code>
            </li>
            <li>
              Or allow all tools from a server:{' '}
              <code className="bg-muted px-1">mcp__serverName</code>
            </li>
            <li>Claude will have access to these tools when the agent is active</li>
          </ol>
        </div>
      </Alert>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileImport}
        className="hidden"
      />
    </div>
  )
}
