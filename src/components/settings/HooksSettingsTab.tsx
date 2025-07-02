/**
 * HooksSettingsTab - Multi-tier Hooks Configuration Component
 *
 * SOLID: Single Responsibility - handles hooks configuration UI
 * DRY: Reusable hook components organized by type and scope
 * KISS: Clean UI with clear organization
 */

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import {
  HelpCircle,
  Webhook,
  Plus,
  Edit2,
  Trash2,
  Terminal,
  Shield,
  Bell,
  Zap,
  ChevronRight,
} from 'lucide-react'
import { EnhancedHookModal } from '../modals/EnhancedHookModal'
import { Badge } from '../ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible'
import type { Hook, HookScope } from '../../types/hooks'

interface HooksSettingsTabProps {
  hooks: Hook[]
  onAddHook: (hook: Hook) => void
  onUpdateHook: (hook: Hook) => void
  onRemoveHook: (hookId: string) => void
  studioIntelligenceStatus?: {
    initialized: boolean
    activeHooks: string[]
  }
}

interface SecurityNoticeProps {}

function SecurityNotice({}: SecurityNoticeProps) {
  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-900/20 dark:border-yellow-800">
      <div className="flex items-start gap-2">
        <HelpCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
        <div className="space-y-2">
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            Security Notice
          </p>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            Hooks execute with full user permissions. Only configure hooks from trusted sources.
            Studio hooks can prevent completion theatre, provide real-time feedback, and coordinate
            multi-agent systems.
          </p>
        </div>
      </div>
    </div>
  )
}

interface HookCardProps {
  hook: Hook
  onEdit: (hook: Hook) => void
  onRemove: (hookId: string) => void
}

function HookCard({ hook, onEdit, onRemove }: HookCardProps) {
  const getIcon = () => {
    switch (hook.type) {
      case 'command':
        return Terminal
      case 'validation':
        return Shield
      case 'notification':
        return Bell
      case 'studio':
        return Zap
    }
  }

  const getTypeColor = () => {
    switch (hook.type) {
      case 'command':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'validation':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'notification':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'studio':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
    }
  }

  const getScopeColor = () => {
    switch (hook.scope) {
      case 'studio':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
      case 'project':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
      case 'system':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    }
  }

  const Icon = getIcon()

  return (
    <div className={`border rounded-lg p-4 ${!hook.enabled ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4" />
            <span className="font-medium">{hook.event}</span>
            <Badge className={getTypeColor()}>{hook.type}</Badge>
            <Badge className={getScopeColor()}>{hook.scope}</Badge>
            {hook.matcher && hook.matcher !== '*' && (
              <Badge variant="secondary">{hook.matcher}</Badge>
            )}
            {!hook.enabled && <Badge variant="outline">Disabled</Badge>}
            {hook.source === 'Studio Intelligence' && (
              <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                Built-in
              </Badge>
            )}
            {hook.source && hook.source !== 'Studio Intelligence' && (
              <Badge variant="outline" className="text-xs">
                {hook.source}
              </Badge>
            )}
          </div>

          {hook.description && <p className="text-sm text-muted-foreground">{hook.description}</p>}

          <div className="text-sm font-mono text-muted-foreground">
            {hook.type === 'command' && hook.command}
            {hook.type === 'validation' && `Validator: ${hook.validator}`}
            {hook.type === 'notification' && `${hook.channel}: ${hook.template}`}
            {hook.type === 'studio' && `Action: ${hook.action}`}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-4">
          {hook.source !== 'Studio Intelligence' && (
            <>
              <Button variant="ghost" size="sm" onClick={() => onEdit(hook)}>
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onRemove(hook.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

interface HooksByTypeProps {
  hooks: Hook[]
  scope: HookScope
  onEdit: (hook: Hook) => void
  onRemove: (hookId: string) => void
  onAdd: (scope: HookScope) => void
}

function HooksByType({ hooks, scope, onEdit, onRemove, onAdd }: HooksByTypeProps) {
  const hooksByType = useMemo(() => {
    const filtered = hooks.filter((h) => h.scope === scope)
    return {
      command: filtered.filter((h) => h.type === 'command'),
      validation: filtered.filter((h) => h.type === 'validation'),
      notification: filtered.filter((h) => h.type === 'notification'),
      studio: filtered.filter((h) => h.type === 'studio'),
    }
  }, [hooks, scope])

  const isEmpty = Object.values(hooksByType).every((arr) => arr.length === 0)

  if (isEmpty) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Webhook className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No {scope} hooks configured</p>
        <p className="text-sm mt-2">
          {scope === 'studio' && 'Add hooks for multi-agent coordination and real-time feedback'}
          {scope === 'project' && 'Add project-specific hooks for custom workflows'}
          {scope === 'system' && 'Add global hooks that apply to all Claude Code operations'}
        </p>
        <Button className="mt-4" onClick={() => onAdd(scope)}>
          <Plus className="w-4 h-4 mr-2" />
          Add {scope} Hook
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {Object.entries(hooksByType).map(([type, typeHooks]) => {
        if (typeHooks.length === 0) return null

        const typeIcons = {
          command: Terminal,
          validation: Shield,
          notification: Bell,
          studio: Zap,
        }

        const Icon = typeIcons[type as keyof typeof typeIcons]

        return (
          <Collapsible key={type} defaultOpen>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
              <ChevronRight className="w-4 h-4 transition-transform data-[state=open]:rotate-90" />
              <Icon className="w-4 h-4" />
              <span className="capitalize">{type} Hooks</span>
              <Badge variant="secondary" className="ml-1">
                {typeHooks.length}
              </Badge>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 mt-3">
              {typeHooks.map((hook) => (
                <HookCard key={hook.id} hook={hook} onEdit={onEdit} onRemove={onRemove} />
              ))}
            </CollapsibleContent>
          </Collapsible>
        )
      })}
    </div>
  )
}

export function HooksSettingsTab({
  hooks,
  onAddHook,
  onUpdateHook,
  onRemoveHook,
  studioIntelligenceStatus,
}: HooksSettingsTabProps) {
  const [editingHook, setEditingHook] = useState<Hook | null>(null)
  const [showHookModal, setShowHookModal] = useState(false)
  const [defaultScope, setDefaultScope] = useState<HookScope>('studio')

  const handleAddHook = (scope: HookScope) => {
    setDefaultScope(scope)
    setEditingHook(null)
    setShowHookModal(true)
  }

  const handleEditHook = (hook: Hook) => {
    setEditingHook(hook)
    setShowHookModal(true)
  }

  const handleSaveHook = (hook: Hook) => {
    if (editingHook) {
      onUpdateHook(hook)
    } else {
      onAddHook(hook)
    }
    setShowHookModal(false)
    setEditingHook(null)
  }

  const handleCloseModal = () => {
    setShowHookModal(false)
    setEditingHook(null)
  }

  const hookCounts = useMemo(
    () => ({
      studio: hooks.filter((h) => h.scope === 'studio').length,
      project: hooks.filter((h) => h.scope === 'project').length,
      system: hooks.filter((h) => h.scope === 'system').length,
    }),
    [hooks]
  )

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Multi-tier Hook System</CardTitle>
          <CardDescription>
            Configure hooks for Claude Studio coordination, project-specific rules, and system-wide
            policies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <SecurityNotice />

          {studioIntelligenceStatus && (
            <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg dark:from-purple-900/20 dark:to-pink-900/20 dark:border-purple-800">
              <div className="flex items-start gap-2">
                <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
                    Studio Intelligence{' '}
                    {studioIntelligenceStatus.initialized ? 'Active' : 'Available'}
                  </p>
                  <p className="text-sm text-purple-700 dark:text-purple-300">
                    {studioIntelligenceStatus.initialized
                      ? `${studioIntelligenceStatus.activeHooks.length} built-in behaviors active: ${studioIntelligenceStatus.activeHooks.join(', ')}`
                      : 'Initialize Studio Intelligence from a project to enable TypeScript checking, file locks, and @mention routing'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <Tabs defaultValue="studio" className="space-y-4">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="studio" className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Studio
                  {hookCounts.studio > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {hookCounts.studio}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="project" className="flex items-center gap-2">
                  <Webhook className="w-4 h-4" />
                  Project
                  {hookCounts.project > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {hookCounts.project}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="system" className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  System
                  {hookCounts.system > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {hookCounts.system}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <Button onClick={() => handleAddHook('studio')}>
                <Plus className="w-4 h-4 mr-2" />
                Add Hook
              </Button>
            </div>

            <TabsContent value="studio" className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Studio hooks help prevent completion theatre, provide real-time feedback for
                type/lint errors, and coordinate multi-agent workflows.
              </div>
              <HooksByType
                hooks={hooks}
                scope="studio"
                onEdit={handleEditHook}
                onRemove={onRemoveHook}
                onAdd={handleAddHook}
              />
            </TabsContent>

            <TabsContent value="project" className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Project hooks apply to specific projects, enabling custom workflows,
                project-specific validation rules, and specialized tooling.
              </div>
              <HooksByType
                hooks={hooks}
                scope="project"
                onEdit={handleEditHook}
                onRemove={onRemoveHook}
                onAdd={handleAddHook}
              />
            </TabsContent>

            <TabsContent value="system" className="space-y-4">
              <div className="text-sm text-muted-foreground">
                System hooks apply globally to all Claude Code operations, enforcing security
                policies, logging, and system-wide behaviors.
              </div>
              <HooksByType
                hooks={hooks}
                scope="system"
                onEdit={handleEditHook}
                onRemove={onRemoveHook}
                onAdd={handleAddHook}
              />
            </TabsContent>
          </Tabs>

          <div className="border-t pt-4 space-y-4">
            <div>
              <h4 className="font-medium mb-2 text-sm">Hook Locations</h4>
              <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground">
                <div>
                  <strong className="text-foreground">~/.claude/settings.json</strong>
                  <p className="mt-1">
                    User-level hooks and Studio defaults. Applied to all Claude Code sessions.
                  </p>
                </div>
                <div>
                  <strong className="text-foreground">.claude/settings.json</strong>
                  <p className="mt-1">
                    Project-specific hooks. Overrides user settings for this project.
                  </p>
                </div>
                <div>
                  <strong className="text-foreground">.claude/settings.local.json</strong>
                  <p className="mt-1">Local project hooks. Not committed to version control.</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2 text-sm">Hook Event Reference</h4>
              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div>
                  <strong className="text-foreground">Claude Code Events:</strong>
                  <ul className="mt-1 space-y-1">
                    <li>• PreToolUse - Before tool execution</li>
                    <li>• PostToolUse - After tool completion</li>
                    <li>• Notification - During notifications</li>
                    <li>• Stop - When Claude Code finishes</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-foreground">Studio Events:</strong>
                  <ul className="mt-1 space-y-1">
                    <li>• TypeCheckFailed - TypeScript errors</li>
                    <li>• LintError - ESLint violations</li>
                    <li>• FileConflict - Multi-agent conflicts</li>
                    <li>• AgentHandoff - Agent switching</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <EnhancedHookModal
        isOpen={showHookModal}
        onClose={handleCloseModal}
        onSave={handleSaveHook}
        hook={editingHook}
        defaultScope={defaultScope}
      />
    </>
  )
}
