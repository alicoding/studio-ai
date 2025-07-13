# Configurable Workspace Layout Architecture

## Overview
A flexible layout system that allows users to configure their workspace like VSCode, with customizable sidebars and split canvas areas.

## Core Concepts

### 1. Panel Registry Pattern (SOLID - Open/Closed)
```typescript
// All available panel types
interface PanelDefinition {
  id: string
  title: string
  icon: React.ComponentType
  component: React.ComponentType<PanelProps>
  defaultPosition: 'sidebar' | 'main' | 'bottom'
  singleton?: boolean  // Only one instance allowed
  requiresProject?: boolean
}

// Central registry
class PanelRegistry {
  private panels = new Map<string, PanelDefinition>()
  
  register(panel: PanelDefinition) {
    this.panels.set(panel.id, panel)
  }
  
  get(id: string): PanelDefinition | undefined {
    return this.panels.get(id)
  }
  
  getByPosition(position: string): PanelDefinition[] {
    return Array.from(this.panels.values())
      .filter(p => p.defaultPosition === position)
  }
}

// Register all panels at startup
panelRegistry.register({
  id: 'file-explorer',
  title: 'Explorer',
  icon: FolderIcon,
  component: FileExplorer,
  defaultPosition: 'sidebar'
})

panelRegistry.register({
  id: 'search',
  title: 'Search',
  icon: SearchIcon,
  component: SemanticSearch,
  defaultPosition: 'sidebar'
})

panelRegistry.register({
  id: 'git',
  title: 'Source Control',
  icon: GitIcon,
  component: GitPanel,
  defaultPosition: 'sidebar'
})

panelRegistry.register({
  id: 'terminal',
  title: 'Terminal',
  icon: TerminalIcon,
  component: Terminal,
  defaultPosition: 'bottom'
})
```

### 2. Layout Configuration (Per-Project)
```typescript
interface WorkspaceLayout {
  version: string
  sidebar: {
    visible: boolean
    width: number
    position: 'left' | 'right'
    panels: string[]  // Panel IDs in order
    activePanel: string
    collapsed: Record<string, boolean>
  }
  main: {
    layout: LayoutType
    panels: PanelInstance[]
  }
  bottom: {
    visible: boolean
    height: number
    panels: string[]
    activePanel: string
  }
}

type LayoutType = 
  | { type: 'single' }
  | { type: 'split'; orientation: 'horizontal' | 'vertical'; sizes: number[] }
  | { type: 'grid'; rows: number; cols: number }

interface PanelInstance {
  id: string  // Unique instance ID
  panelId: string  // References panel type from registry
  state?: Record<string, unknown>  // Panel-specific state
  position?: { row: number; col: number; rowSpan?: number; colSpan?: number }
}
```

### 3. Layout Engine (Library-First)
```typescript
// Use allotment for split panes (what VSCode uses)
import { Allotment } from 'allotment'
import 'allotment/dist/style.css'

// Main workspace component
export function Workspace({ projectId }: { projectId: string }) {
  const layout = useWorkspaceLayout(projectId)
  const { updateLayout } = useLayoutActions(projectId)
  
  return (
    <div className="workspace">
      <Allotment>
        {/* Sidebar */}
        {layout.sidebar.visible && (
          <Allotment.Pane minSize={200} maxSize={600} preferredSize={layout.sidebar.width}>
            <Sidebar layout={layout.sidebar} />
          </Allotment.Pane>
        )}
        
        {/* Main Canvas */}
        <Allotment.Pane>
          <MainCanvas layout={layout.main} />
        </Allotment.Pane>
      </Allotment>
      
      {/* Bottom Panel */}
      {layout.bottom.visible && (
        <BottomPanel layout={layout.bottom} />
      )}
    </div>
  )
}
```

### 4. Sidebar Implementation
```typescript
function Sidebar({ layout }: { layout: SidebarLayout }) {
  const [activePanel, setActivePanel] = useState(layout.activePanel)
  const registry = usePanelRegistry()
  
  return (
    <div className="sidebar">
      {/* Tab Bar */}
      <div className="sidebar-tabs">
        {layout.panels.map(panelId => {
          const panel = registry.get(panelId)
          if (!panel) return null
          
          return (
            <button
              key={panelId}
              className={activePanel === panelId ? 'active' : ''}
              onClick={() => setActivePanel(panelId)}
              title={panel.title}
            >
              <panel.icon />
            </button>
          )
        })}
      </div>
      
      {/* Active Panel */}
      <div className="sidebar-content">
        {layout.panels.map(panelId => {
          const panel = registry.get(panelId)
          if (!panel || activePanel !== panelId) return null
          
          return <panel.component key={panelId} />
        })}
      </div>
    </div>
  )
}
```

### 5. Main Canvas Layouts
```typescript
function MainCanvas({ layout }: { layout: MainLayout }) {
  const registry = usePanelRegistry()
  
  switch (layout.layout.type) {
    case 'single':
      return <SingleLayout panels={layout.panels} />
      
    case 'split':
      return (
        <Allotment vertical={layout.layout.orientation === 'vertical'}>
          {layout.panels.map((panel, i) => (
            <Allotment.Pane key={panel.id} preferredSize={layout.layout.sizes?.[i]}>
              <PanelRenderer panel={panel} />
            </Allotment.Pane>
          ))}
        </Allotment>
      )
      
    case 'grid':
      return <GridLayout layout={layout.layout} panels={layout.panels} />
  }
}
```

### 6. Configuration UI
```typescript
function LayoutSettings({ projectId }: { projectId: string }) {
  const layout = useWorkspaceLayout(projectId)
  const { updateLayout, resetLayout } = useLayoutActions(projectId)
  const registry = usePanelRegistry()
  
  return (
    <SettingsSection title="Workspace Layout">
      {/* Sidebar Configuration */}
      <Card title="Sidebar">
        <Switch
          label="Show sidebar"
          checked={layout.sidebar.visible}
          onChange={(visible) => updateLayout({ sidebar: { ...layout.sidebar, visible } })}
        />
        
        <Select
          label="Position"
          value={layout.sidebar.position}
          options={[
            { value: 'left', label: 'Left' },
            { value: 'right', label: 'Right' }
          ]}
          onChange={(position) => updateLayout({ sidebar: { ...layout.sidebar, position } })}
        />
        
        <DraggableList
          label="Panels"
          items={layout.sidebar.panels}
          onChange={(panels) => updateLayout({ sidebar: { ...layout.sidebar, panels } })}
          renderItem={(panelId) => registry.get(panelId)?.title || panelId}
        />
      </Card>
      
      {/* Main Canvas Configuration */}
      <Card title="Main Area">
        <RadioGroup
          label="Layout"
          value={layout.main.layout.type}
          options={[
            { value: 'single', label: 'Single Panel' },
            { value: 'split', label: 'Split View' },
            { value: 'grid', label: 'Grid Layout' }
          ]}
          onChange={(type) => updateLayout({ main: { ...layout.main, layout: { type } } })}
        />
      </Card>
      
      <Button onClick={resetLayout}>Reset to Default</Button>
    </SettingsSection>
  )
}
```

### 7. Storage & Persistence
```typescript
// Store layouts in UnifiedStorage
class LayoutService {
  private storage = new UnifiedStorage({
    namespace: 'workspace-layouts',
    type: 'config'
  })
  
  async getLayout(projectId: string): Promise<WorkspaceLayout> {
    const stored = await this.storage.get(`project:${projectId}:layout`)
    return stored || this.getDefaultLayout()
  }
  
  async saveLayout(projectId: string, layout: WorkspaceLayout): Promise<void> {
    await this.storage.set(`project:${projectId}:layout`, layout)
  }
  
  getDefaultLayout(): WorkspaceLayout {
    return {
      version: '1.0.0',
      sidebar: {
        visible: true,
        width: 300,
        position: 'left',
        panels: ['file-explorer', 'search', 'git'],
        activePanel: 'file-explorer',
        collapsed: {}
      },
      main: {
        layout: { type: 'single' },
        panels: [{
          id: 'main-editor',
          panelId: 'editor',
          state: {}
        }]
      },
      bottom: {
        visible: false,
        height: 200,
        panels: ['terminal', 'problems'],
        activePanel: 'terminal'
      }
    }
  }
}
```

## Adding New Panels

To add a new panel type:

```typescript
// 1. Create the panel component
function MyNewPanel({ projectId }: PanelProps) {
  return <div>My Panel Content</div>
}

// 2. Register it
panelRegistry.register({
  id: 'my-panel',
  title: 'My Panel',
  icon: MyIcon,
  component: MyNewPanel,
  defaultPosition: 'sidebar'
})

// That's it! Users can now add it to their layout
```

## Benefits

1. **Flexible**: Users can arrange workspace however they want
2. **Extensible**: Easy to add new panel types
3. **Per-Project**: Each project can have different layouts
4. **Familiar**: Similar to VSCode's layout system
5. **KISS**: Simple implementation using proven libraries
6. **DRY**: Panel logic separated from layout logic

## Implementation Phases

1. **Phase 1**: Basic sidebar with fixed panels
2. **Phase 2**: Configurable sidebar panels
3. **Phase 3**: Split main canvas
4. **Phase 4**: Full grid layout support
5. **Phase 5**: Drag-and-drop customization