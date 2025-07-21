# Workflow Nodes Developer Guide

## Overview

Studio AI uses a dynamic registry-based system for workflow nodes, making it easy to add new node types without modifying core files. This guide covers current node types, how to add new ones, and the extensibility roadmap.

## Current Node Types

### ✅ **Fully Implemented & Production Ready**

#### **Task Nodes (Agent-Based)**

- **Purpose**: Execute tasks using configured AI agents
- **Examples**: Developer, Architect, Reviewer, Tester, Security
- **Implementation**: Dynamically loaded from agent configurations
- **UX Pattern**: Drag from palette → drop on canvas → configure
- **Backend**: Full Claude/Mock execution support

#### **Control Flow Nodes**

- **Conditional Node**: If/else branching logic with structured conditions (v2.0)
- **Loop Node**: Iterate over arrays/collections
- **Parallel Node**: Execute multiple steps simultaneously
- **Human Node**: Human-in-the-loop approvals and input
- **UX Pattern**: Drag from palette → drop on canvas → configure
- **Backend**: Full LangGraph execution support

#### **Configuration Nodes (Auto-Add Pattern)**

- **AI Provider Node**: OpenAI, Anthropic, Azure, Google AI configurations
- **Memory Node**: Buffer, Vector, Summary, Entity memory systems
- **Tools Node**: Function, API, Code, MCP integrations
- **UX Pattern**: Click + sign → modal → select type → auto-add and connect
- **Backend**: Provider/Memory nodes have full execution, Tools pending

### ⚠️ **Partially Implemented (UI Complete, Backend Needs Work)**

#### **Tools Node Backend**

- **Status**: UI and auto-add workflow complete
- **Missing**: Actual function calling execution in backend
- **Files Needed**:
  - `web/server/services/executors/ToolsStepExecutor.ts`
  - Integration with LangChain tools system
- **Estimated Work**: 2-3 days

#### **Advanced Control Flow**

- **Status**: UI components exist but backend execution is mock-only
- **Missing**: Real LangGraph node execution for Loop and Parallel
- **Files**: `web/server/services/WorkflowNodeFactory.ts` (lines 197-202, 136-137)
- **Estimated Work**: 1-2 weeks for full LangGraph integration

### ❌ **Not Yet Implemented**

#### **Data Nodes**

- **Database Node**: SQL/NoSQL database connections
- **File Node**: File system operations (read/write/transform)
- **API Node**: REST/GraphQL API calls
- **Webhook Node**: HTTP webhook triggers and responses

#### **Integration Nodes**

- **Slack Node**: Slack notifications and interactions
- **Email Node**: Email sending and processing
- **GitHub Node**: Git operations and PR management
- **Calendar Node**: Calendar events and scheduling

#### **Specialized Nodes**

- **Monitoring Node**: Health checks and alerts
- **Retry Node**: Error handling and retry logic
- **Cache Node**: Data caching and invalidation
- **Transform Node**: Data transformation and mapping

## How to Add a New Node Type

### 1. **Choose Your Node Pattern**

#### **Task Node (Agent-Based)**

Use for nodes that execute AI agent tasks:

```typescript
// No code needed - automatically generated from agent configs
// Just add agent via Studio UI or API
```

#### **Control Flow Node (Drag-and-Drop)**

Use for workflow logic and control structures:

```typescript
// 1. Create component
src / components / workflow - builder / nodes / MyControlNode.tsx

// 2. Register in NodeRegistry
nodeRegistry.register('myControl', {
  componentName: 'MyControlNode',
  category: 'control',
  description: 'My control flow node',
})

// 3. Add to DraggableNodePalette arrays (if needed)
```

#### **Configuration Node (Auto-Add Pattern)**

Use for AI configurations that connect to other nodes:

```typescript
// 1. Create selection modal
src / components / workflow - builder / modals / MyConfigSelectionModal.tsx

// 2. Create node component
src / components / workflow - builder / nodes / MyConfigNode.tsx

// 3. Add handler to VisualWorkflowBuilder.tsx
const handleMyConfigSelect = (configType: string) => {
  // Follow handleProviderSelect pattern
}

// 4. Register everything
nodeRegistry.register('myConfig', {
  componentName: 'MyConfigNode',
  category: 'config',
  description: 'My configuration node',
})
```

### 2. **Step-by-Step Implementation**

#### **Step 1: Create Node Component**

```typescript
// src/components/workflow-builder/nodes/DatabaseNode.tsx
import { Handle, Position, NodeProps } from 'reactflow'
import { Database } from 'lucide-react'

interface DatabaseNodeData {
  label: string
  connectionString?: string
  databaseType?: 'mysql' | 'postgresql' | 'mongodb'
}

export default function DatabaseNode({ data }: NodeProps<DatabaseNodeData>) {
  return (
    <div className="bg-white border-2 border-blue-500 rounded-lg p-4 min-w-[200px]">
      <div className="flex items-center gap-2 mb-2">
        <div className="bg-blue-500 p-2 rounded text-white">
          <Database className="w-4 h-4" />
        </div>
        <span className="font-medium">{data.label}</span>
      </div>

      {data.connectionString && (
        <div className="text-xs text-gray-600 mb-2">
          {data.databaseType?.toUpperCase()} Database
        </div>
      )}

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="output"
        className="w-3 h-3 bg-blue-500"
      />
    </div>
  )
}
```

#### **Step 2: Create Backend Executor (if needed)**

```typescript
// web/server/services/executors/DatabaseStepExecutor.ts
import type { StepExecutor, WorkflowContext } from './StepExecutor'
import type { StepResult } from '../../schemas/invoke'

export class DatabaseStepExecutor implements StepExecutor {
  canHandle(step: WorkflowStep): boolean {
    return step.type === 'database'
  }

  async execute(step: WorkflowStep, context: WorkflowContext): Promise<StepResult> {
    // Implement database operations
    const result = await this.connectAndQuery(step.task, step.connectionString)

    return {
      id: step.id!,
      status: 'success',
      response: result,
      sessionId: `db-${step.id}`,
      duration: Date.now() - startTime,
    }
  }

  private async connectAndQuery(query: string, connectionString: string) {
    // Database connection and query logic
  }
}
```

#### **Step 3: Register Node Type**

```typescript
// In NodeRegistry.ts or during app initialization
import DatabaseNode from './nodes/DatabaseNode'
import { DatabaseStepExecutor } from '../../../web/server/services/executors/DatabaseStepExecutor'

// Register with unified pattern
nodeRegistry.registerNode('database', {
  componentName: 'DatabaseNode',
  category: 'config', // or 'control' for control flow
  description: 'Database connection and query execution',
  executor: new DatabaseStepExecutor(), // Optional
})
```

#### **Step 4: Add to Palette (Optional)**

```typescript
// If it should appear in DraggableNodePalette
// Add to appropriate array in getControlNodes() or getConfigNodes()
const configTypes = ['memory', 'tools', 'provider', 'database']
```

### 3. **Node Component Patterns**

#### **Basic Node Structure**

```typescript
interface NodeData {
  label: string
  // Add your custom properties
}

export default function MyNode({ data, id }: NodeProps<NodeData>) {
  return (
    <div className="bg-white border-2 border-primary rounded-lg p-4">
      {/* Icon + Label */}
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" />
        <span className="font-medium">{data.label}</span>
      </div>

      {/* Content */}
      <div className="text-xs text-gray-600">
        {/* Node-specific content */}
      </div>

      {/* Handles */}
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}
```

#### **Configuration Node with Auto-Add**

```typescript
// For nodes that should use + sign pattern
export default function MyConfigNode({ data }: NodeProps) {
  return (
    <div className="relative bg-white border-2 border-green-500 rounded-lg p-4">
      {/* Standard node content */}

      {/* Configuration handles for auto-connection */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="output"
        className="w-3 h-3 bg-green-500"
      />

      {/* Target nodes will have config-specific handles */}
      <Handle
        type="target"
        position={Position.Top}
        id="myconfig"
        className="w-3 h-3 bg-green-500"
      />
    </div>
  )
}
```

## Extension Points

### 1. **Modal System**

The modal system supports any configuration node type:

```typescript
// Add to useCanvasModals hook
const openMyConfigModal = (targetNodeId: string) => {
  setModalState({
    isMyConfigModalOpen: true,
    targetNodeId,
  })
}
```

### 2. **Edge Types and Colors**

Add custom edge types and colors:

```typescript
// In WorkflowGraph.tsx registries
const edgeColorRegistry = new Map([
  ['myconfig', '#ff6b6b'], // Custom color
  // ...
])
```

### 3. **Validation Rules**

Add custom validation:

```typescript
// In workflow validation logic
if (step.type === 'database' && !step.connectionString) {
  errors.push({
    stepId: step.id,
    message: 'Database connection string is required',
  })
}
```

## Architecture Benefits

### ✅ **Current System Advantages**

- **Zero Hardcoding**: All node types use registry pattern
- **One-Line Registration**: Adding nodes requires minimal code
- **Type Safety**: Full TypeScript support throughout
- **Performance**: Map-based O(1) lookups
- **Consistency**: Unified patterns for all node types
- **Extensibility**: Plugin-ready architecture

### 🚀 **Future Enhancements (When Needed)**

- **Plugin System**: Load nodes from external packages
- **Security**: Role-based node access control
- **Distribution**: Community node marketplace
- **Versioning**: Node version compatibility system
- **Hot Reload**: Dynamic node loading in development

## Common Patterns

### **Icons and Colors**

```typescript
// Use consistent icon and color patterns
const NODE_THEMES = {
  data: { icon: Database, color: 'bg-blue-500' },
  integration: { icon: Plug, color: 'bg-purple-500' },
  control: { icon: GitBranch, color: 'bg-amber-500' },
  config: { icon: Settings, color: 'bg-green-500' },
}
```

### **Handle Positioning**

```typescript
// Standard handle layout
<Handle type="target" position={Position.Top} id="input" />      // Dependencies
<Handle type="source" position={Position.Bottom} id="output" />  // Main output
<Handle type="target" position={Position.Left} id="config" />    // Configuration input
```

### **Error Handling**

```typescript
// Graceful error handling in executors
try {
  const result = await this.executeOperation(step)
  return { status: 'success', response: result }
} catch (error) {
  return {
    status: 'failed',
    response: `Error: ${error.message}`,
    error: error.stack,
  }
}
```

## Getting Started

### **For Simple Nodes**

1. Copy an existing node component and modify
2. Register with `nodeRegistry.register()`
3. Test in workflow builder

### **For Complex Nodes**

1. Plan the data flow and dependencies
2. Create modal for configuration (if needed)
3. Implement backend executor
4. Add comprehensive error handling
5. Write tests for both UI and backend

### **Best Practices**

- Follow existing naming conventions
- Use TypeScript strictly (no `any` types)
- Implement proper error handling
- Add comprehensive logging
- Follow SOLID/DRY/KISS principles
- Test both success and failure scenarios

The registry system makes adding new nodes straightforward while maintaining consistency and extensibility across the entire workflow builder system.
