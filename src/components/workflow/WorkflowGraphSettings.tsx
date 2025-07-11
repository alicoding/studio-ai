/**
 * Workflow Graph Settings Panel
 * Configuration panel for workflow graph layout and appearance
 *
 * SOLID: Single responsibility - graph configuration
 * DRY: Reuses existing UI components
 * KISS: Simple settings interface
 * Library-First: Uses Radix UI components
 */

import { Settings, ChevronDown, RotateCw, Layers } from 'lucide-react'
import * as Popover from '@radix-ui/react-popover'

export interface GraphLayoutConfig {
  direction: 'TB' | 'LR' | 'RL' | 'BT' // Top-Bottom, Left-Right, Right-Left, Bottom-Top
  layoutAlgorithm: 'hierarchical' | 'force' | 'circular' | 'manual'
  nodeSpacing: number
  levelSpacing: number
  nodeWidth: number
  enableDragging: boolean
  enableMinimap: boolean
  enableBackground: boolean
}

interface WorkflowGraphSettingsProps {
  config: GraphLayoutConfig
  onChange: (config: GraphLayoutConfig) => void
}

export function WorkflowGraphSettings({ config, onChange }: WorkflowGraphSettingsProps) {
  const updateConfig = (updates: Partial<GraphLayoutConfig>) => {
    onChange({ ...config, ...updates })
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          className="flex items-center gap-2 px-3 py-2 text-sm bg-secondary hover:bg-secondary/80 rounded-md border border-border transition-colors"
          title="Graph Layout Settings"
        >
          <Settings className="w-4 h-4" />
          Layout
          <ChevronDown className="w-3 h-3" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="w-80 p-4 bg-background border border-border rounded-lg shadow-lg z-50"
          side="bottom"
          align="end"
          sideOffset={5}
        >
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Graph Layout Settings
            </h3>

            {/* Direction */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Direction</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'LR', label: 'Left → Right', icon: '→' },
                  { value: 'TB', label: 'Top ↓ Bottom', icon: '↓' },
                  { value: 'RL', label: 'Right ← Left', icon: '←' },
                  { value: 'BT', label: 'Bottom ↑ Top', icon: '↑' },
                ].map((dir) => (
                  <button
                    key={dir.value}
                    onClick={() =>
                      updateConfig({ direction: dir.value as GraphLayoutConfig['direction'] })
                    }
                    className={`p-2 text-xs rounded border transition-colors ${
                      config.direction === dir.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-secondary hover:bg-secondary/80 border-border'
                    }`}
                  >
                    <div className="font-mono text-lg">{dir.icon}</div>
                    <div>{dir.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Layout Algorithm */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Layout Algorithm</label>
              <select
                value={config.layoutAlgorithm}
                onChange={(e) =>
                  updateConfig({
                    layoutAlgorithm: e.target.value as GraphLayoutConfig['layoutAlgorithm'],
                  })
                }
                className="w-full p-2 text-sm bg-background border border-border rounded"
              >
                <option value="hierarchical">Hierarchical (Dependencies)</option>
                <option value="force">Force-directed (Organic)</option>
                <option value="circular">Circular Layout</option>
                <option value="manual">Manual Positioning</option>
              </select>
            </div>

            {/* Spacing Controls */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Node Spacing</label>
                <input
                  type="range"
                  min="100"
                  max="400"
                  step="50"
                  value={config.nodeSpacing}
                  onChange={(e) => updateConfig({ nodeSpacing: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="text-xs text-center text-muted-foreground">
                  {config.nodeSpacing}px
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Level Spacing</label>
                <input
                  type="range"
                  min="200"
                  max="600"
                  step="50"
                  value={config.levelSpacing}
                  onChange={(e) => updateConfig({ levelSpacing: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="text-xs text-center text-muted-foreground">
                  {config.levelSpacing}px
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Node Width</label>
              <input
                type="range"
                min="200"
                max="400"
                step="20"
                value={config.nodeWidth}
                onChange={(e) => updateConfig({ nodeWidth: parseInt(e.target.value) })}
                className="w-full"
              />
              <div className="text-xs text-center text-muted-foreground">{config.nodeWidth}px</div>
            </div>

            {/* Feature Toggles */}
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium">Enable Node Dragging</label>
                <button
                  onClick={() => updateConfig({ enableDragging: !config.enableDragging })}
                  className={`w-10 h-5 rounded-full transition-colors ${
                    config.enableDragging ? 'bg-primary' : 'bg-secondary'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      config.enableDragging ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-medium">Show Minimap</label>
                <button
                  onClick={() => updateConfig({ enableMinimap: !config.enableMinimap })}
                  className={`w-10 h-5 rounded-full transition-colors ${
                    config.enableMinimap ? 'bg-primary' : 'bg-secondary'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      config.enableMinimap ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-medium">Show Background</label>
                <button
                  onClick={() => updateConfig({ enableBackground: !config.enableBackground })}
                  className={`w-10 h-5 rounded-full transition-colors ${
                    config.enableBackground ? 'bg-primary' : 'bg-secondary'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      config.enableBackground ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="space-y-2 pt-2 border-t border-border">
              <label className="text-xs font-medium text-muted-foreground">Quick Presets</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() =>
                    updateConfig({
                      direction: 'LR',
                      layoutAlgorithm: 'hierarchical',
                      nodeSpacing: 200,
                      levelSpacing: 350,
                      nodeWidth: 280,
                    })
                  }
                  className="p-2 text-xs bg-secondary hover:bg-secondary/80 rounded border border-border"
                >
                  <RotateCw className="w-3 h-3 mx-auto mb-1" />
                  Compact
                </button>
                <button
                  onClick={() =>
                    updateConfig({
                      direction: 'TB',
                      layoutAlgorithm: 'hierarchical',
                      nodeSpacing: 300,
                      levelSpacing: 400,
                      nodeWidth: 320,
                    })
                  }
                  className="p-2 text-xs bg-secondary hover:bg-secondary/80 rounded border border-border"
                >
                  <Layers className="w-3 h-3 mx-auto mb-1" />
                  Spacious
                </button>
              </div>
            </div>
          </div>

          <Popover.Arrow className="fill-border" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
