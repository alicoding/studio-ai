import { createFileRoute } from '@tanstack/react-router'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Settings, Globe, FolderOpen, Users, Webhook } from 'lucide-react'
import { PageLayout } from '../components/ui/page-layout'
import { SystemSettingsTab } from '../components/settings/SystemSettingsTab'
import { HooksSettingsTab } from '../components/settings/HooksSettingsTab'
import { PlaceholderTab } from '../components/settings/PlaceholderTab'
import { useSettings } from '../hooks/useSettings'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const {
    systemConfig,
    hooks,
    loading,
    saving,
    detectedPaths,
    detectingPath,
    updateSystemConfig,
    saveSystemSettings,
    detectClaudePath,
    addHook,
    updateHook,
    removeHook,
    studioIntelligenceStatus,
  } = useSettings()

  return (
    <PageLayout
      title="Settings"
      description="Configure Claude Studio at system, project, team, and agent levels"
    >
      <Tabs defaultValue="system" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            System
          </TabsTrigger>
          <TabsTrigger value="hooks" className="flex items-center gap-2">
            <Webhook className="w-4 h-4" />
            Hooks
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
          <SystemSettingsTab
            systemConfig={systemConfig}
            loading={loading}
            saving={saving}
            detectedPaths={detectedPaths}
            detectingPath={detectingPath}
            onConfigChange={updateSystemConfig}
            onSave={saveSystemSettings}
            onDetectPath={detectClaudePath}
          />
        </TabsContent>

        <TabsContent value="hooks" className="space-y-6">
          <HooksSettingsTab
            hooks={hooks}
            onAddHook={addHook}
            onUpdateHook={updateHook}
            onRemoveHook={removeHook}
            studioIntelligenceStatus={studioIntelligenceStatus}
          />
        </TabsContent>

        <TabsContent value="project" className="space-y-6">
          <PlaceholderTab
            title="Project Configuration"
            description="Settings that apply to specific projects"
            icon={FolderOpen}
            placeholderText="Select a project to configure its settings"
            subText="Project settings include environment variables, disabled tools, and project-specific MCP servers"
          />
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <PlaceholderTab
            title="Team Templates"
            description="Pre-configured templates for groups of agents working together"
            icon={Users}
            placeholderText="No team templates configured"
            buttonText="Create Team Template"
            onButtonClick={() => console.log('Create team template')}
          />
        </TabsContent>

        <TabsContent value="mcp" className="space-y-6">
          <PlaceholderTab
            title="MCP Server Configuration"
            description="Configure Model Context Protocol servers for enhanced capabilities"
            icon={Globe}
            placeholderText="MCP server configuration coming soon"
            subText="Connect to databases, APIs, and other services through MCP"
          />
        </TabsContent>
      </Tabs>
    </PageLayout>
  )
}
