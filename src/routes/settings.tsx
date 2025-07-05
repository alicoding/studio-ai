import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Settings, Globe, FolderOpen, Users, Webhook, Keyboard, HardDrive, Brain, Network } from 'lucide-react'
import { PageLayout } from '../components/ui/page-layout'
import { SystemSettingsTab } from '../components/settings/SystemSettingsTab'
import { HooksSettingsTab } from '../components/settings/HooksSettingsTab'
import { KeyboardShortcutsTab } from '../components/settings/KeyboardShortcutsTab'
import { PlaceholderTab } from '../components/settings/PlaceholderTab'
import { StorageManagement } from '../components/settings/StorageManagement'
import { AICapabilitiesTab } from '../components/settings/AICapabilitiesTab'
import { OrchestrationTab } from '../components/settings/OrchestrationTab'
import { MCPTab } from '../components/settings/MCPTab'
import { useSettings } from '../hooks/useSettings'
import { memo, useCallback } from 'react'

const SettingsPage = memo(() => {
  const navigate = useNavigate()
  const { tab } = Route.useSearch()
  const activeTab = tab || 'system'
  
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

  const handleTabChange = useCallback((value: string) => {
    navigate({ to: '/settings', search: { tab: value } })
  }, [navigate])

  return (
    <PageLayout
      title="Settings"
      description="Configure Claude Studio at system, project, team, and agent levels"
    >
      <Tabs 
        value={activeTab}
        className="space-y-4"
        onValueChange={handleTabChange}
      >
        <TabsList className="flex flex-wrap gap-1 h-auto p-1 bg-muted/50">
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            System
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            AI
          </TabsTrigger>
          <TabsTrigger value="orchestration" className="flex items-center gap-2">
            <Network className="w-4 h-4" />
            Orchestration
          </TabsTrigger>
          <TabsTrigger value="shortcuts" className="flex items-center gap-2">
            <Keyboard className="w-4 h-4" />
            Shortcuts
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
          <TabsTrigger value="storage" className="flex items-center gap-2">
            <HardDrive className="w-4 h-4" />
            Storage
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

        <TabsContent value="ai" className="space-y-6">
          <AICapabilitiesTab />
        </TabsContent>

        <TabsContent value="orchestration" className="space-y-6">
          <OrchestrationTab />
        </TabsContent>

        <TabsContent value="shortcuts" className="space-y-6">
          <KeyboardShortcutsTab />
        </TabsContent>

        <TabsContent value="hooks" className="space-y-6">
          <HooksSettingsTab
            hooks={hooks}
            onAddHook={addHook}
            onUpdateHook={updateHook}
            onRemoveHook={removeHook}
            onSave={saveSystemSettings}
            saving={saving}
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
          <MCPTab />
        </TabsContent>

        <TabsContent value="storage" className="space-y-6">
          <StorageManagement />
        </TabsContent>
      </Tabs>
    </PageLayout>
  )
})

SettingsPage.displayName = 'SettingsPage'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      tab: (search.tab as string) || 'system'
    }
  }
})
