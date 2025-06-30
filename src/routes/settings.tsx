import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Checkbox } from '../components/ui/checkbox'
import { Settings, Globe, FolderOpen, Users, Bot, Save, HelpCircle, Loader2 } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip'
import { PageLayout } from '../components/ui/page-layout'
import { toast } from 'sonner'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})


function SettingsPage() {
  // System settings
  const [systemConfig, setSystemConfig] = useState({
    claudeCodePath: '',
    defaultWorkspacePath: '~/projects',
    apiEndpoint: window.location.origin,
    enableTelemetry: false
  })
  const [detectedPaths, setDetectedPaths] = useState<string[]>([])
  const [detectingPath, setDetectingPath] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  // Load saved settings on mount
  useEffect(() => {
    loadSystemSettings()
  }, [])

  const loadSystemSettings = async () => {
    try {
      const response = await fetch('/api/settings/system')
      if (response.ok) {
        const savedConfig = await response.json()
        // Merge saved config with defaults
        setSystemConfig(prev => ({
          ...prev,
          ...savedConfig,
          // Ensure apiEndpoint has a default if not saved
          apiEndpoint: savedConfig.apiEndpoint || window.location.origin
        }))
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
      toast.error('Failed to load saved settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSystemSave = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/settings/system', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(systemConfig)
      })
      if (response.ok) {
        toast.success('System settings saved successfully!')
      } else {
        toast.error('Failed to save settings. Please try again.')
      }
    } catch (error) {
      console.error('Failed to save system settings:', error)
      toast.error('An error occurred while saving settings.')
    } finally {
      setSaving(false)
    }
  }


  // Detect Claude installation paths
  const detectClaudePath = async () => {
    setDetectingPath(true)
    try {
      const checkPaths: string[] = []
      
      // Check common command names using system 'which' command
      const commands = ['claude', 'claude-code', 'claude-cli']
      for (const cmd of commands) {
        try {
          const response = await fetch('/api/system/detect-command', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: cmd })
          })
          if (response.ok) {
            const { path } = await response.json()
            if (path) checkPaths.push(path)
          }
        } catch (error) {
          console.error(`Failed to detect ${cmd}:`, error)
        }
      }
      
      const uniquePaths = [...new Set(checkPaths)]
      setDetectedPaths(uniquePaths)
      
      // Auto-select first found path if none is set
      if (uniquePaths.length > 0 && !systemConfig.claudeCodePath) {
        const newConfig = { ...systemConfig, claudeCodePath: uniquePaths[0] }
        setSystemConfig(newConfig)
        
        // Auto-save the detected path
        try {
          const response = await fetch('/api/settings/system', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newConfig)
          })
          if (response.ok) {
            toast.success(`Found and saved Claude at: ${uniquePaths[0]}`)
          } else {
            toast.success(`Found Claude at: ${uniquePaths[0]}`)
          }
        } catch (error) {
          console.error('Failed to auto-save detected path:', error)
          toast.success(`Found Claude at: ${uniquePaths[0]}`)
        }
      } else if (uniquePaths.length === 0) {
        toast.error('Claude Code not found. Please enter the path manually.')
      }
    } catch (error) {
      console.error('Failed to detect Claude path:', error)
      toast.error('Failed to detect Claude installation.')
    } finally {
      setDetectingPath(false)
    }
  }

  return (
    <PageLayout
      title="Settings"
      description="Configure Claude Studio at system, project, team, and agent levels"
    >
      <Tabs defaultValue="system" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            System
          </TabsTrigger>
          <TabsTrigger value="project" className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4" />
            Project
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Teams
          </TabsTrigger>
          <TabsTrigger value="mcp" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            MCP Servers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Configuration</CardTitle>
              <CardDescription>
                Global settings that apply to all projects and agents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              )}
              {!loading && (<>
              {/* Detect Claude Installation */}
              <div className="p-4 bg-muted rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Detect Claude Code Installation</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={detectClaudePath}
                    disabled={detectingPath}
                  >
                    {detectingPath ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Detecting...
                      </>
                    ) : (
                      'Auto-detect'
                    )}
                  </Button>
                </div>
                {detectedPaths.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Found installations:</p>
                    {detectedPaths.map(path => {
                      const isProjectLocal = path.includes('node_modules')
                      return (
                        <Button
                          key={path}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-left font-mono text-xs"
                          onClick={() => setSystemConfig(prev => ({ ...prev, claudeCodePath: path }))}
                        >
                          <span className={isProjectLocal ? 'opacity-50' : ''}>
                            {path}
                          </span>
                          {isProjectLocal && (
                            <span className="ml-2 text-xs text-muted-foreground">(project local)</span>
                          )}
                        </Button>
                      )
                    })}
                  </div>
                )}
              </div>
              {/* Claude Code Path */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="claude-path">Claude Code Installation Path</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="w-4 h-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Path to your Claude Code executable.</p>
                        <p>Click "Auto-detect" to find it automatically</p>
                        <p>or enter the path manually.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="claude-path"
                  type="text"
                  value={systemConfig.claudeCodePath}
                  onChange={(e) => setSystemConfig(prev => ({ ...prev, claudeCodePath: e.target.value }))}
                  placeholder="e.g., /usr/local/bin/claude"
                />
              </div>

              {/* Default Workspace Path */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="workspace-path">Default Workspace Path</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="w-4 h-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Default directory where new projects</p>
                        <p>will be created</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="workspace-path"
                  type="text"
                  value={systemConfig.defaultWorkspacePath}
                  onChange={(e) => setSystemConfig(prev => ({ ...prev, defaultWorkspacePath: e.target.value }))}
                  placeholder="~/projects"
                />
              </div>

              {/* API Settings */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="api-endpoint">API Endpoint</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="w-4 h-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Backend API server URL.</p>
                        <p>Useful when running backend separately</p>
                        <p>or on a different machine/port</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="api-endpoint"
                  type="text"
                  value={systemConfig.apiEndpoint}
                  onChange={(e) => setSystemConfig(prev => ({ ...prev, apiEndpoint: e.target.value }))}
                  placeholder="http://localhost:3000"
                />
              </div>

              {/* Telemetry */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="telemetry"
                    checked={systemConfig.enableTelemetry}
                    onCheckedChange={(checked) => 
                      setSystemConfig(prev => ({ ...prev, enableTelemetry: !!checked }))
                    }
                  />
                  <Label htmlFor="telemetry" className="font-normal cursor-pointer">
                    Enable anonymous usage analytics
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  Help improve Claude Studio by sharing anonymous usage data
                </p>
              </div>


              <div className="pt-4">
                <Button 
                  onClick={handleSystemSave}
                  disabled={saving}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save System Settings'}
                </Button>
              </div>
              </>)}
            </CardContent>
          </Card>

          {/* Platform Support Note */}
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <p className="text-sm font-medium">Multi-Platform Support</p>
                <p className="text-xs text-muted-foreground">
                  Claude Studio is designed to work across web, desktop, and mobile platforms.
                  Additional platform-specific features will be available as we expand support.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="project" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Configuration</CardTitle>
              <CardDescription>
                Settings that apply to specific projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a project to configure its settings</p>
                <p className="text-sm mt-2">
                  Project settings include environment variables, disabled tools, 
                  and project-specific MCP servers
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Templates</CardTitle>
              <CardDescription>
                Pre-configured templates for groups of agents working together
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No team templates configured</p>
                <Button className="mt-4" variant="outline">
                  <Bot className="w-4 h-4 mr-2" />
                  Create Team Template
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mcp" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>MCP Server Configuration</CardTitle>
              <CardDescription>
                Configure Model Context Protocol servers for enhanced capabilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>MCP server configuration coming soon</p>
                <p className="text-sm mt-2">
                  Connect to databases, APIs, and other services through MCP
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageLayout>
  )
}