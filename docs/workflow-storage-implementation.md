# Workflow Storage Implementation Plan

Following SOLID, DRY, Library-First, and KISS principles based on existing patterns in Claude Studio.

## 🎯 Core Principle: Use What We Have

**LangGraph Research Results** (from latest documentation):

- ❌ **NO** built-in workflow definition storage
- ❌ **NO** graph serialization (StateGraph/CompiledGraph)
- ❌ **NO** JSON export/import for workflows
- ❌ **NO** template storage or management
- ✅ **ONLY** execution state and checkpoints

**Key Insight**: This is intentional - LangGraph focuses solely on execution runtime, not design-time storage. Users are expected to implement their own workflow definition persistence.

**Our Architecture**:

- SQLite with Drizzle ORM for all application data (agents, projects, etc.)
- PostgreSQL exclusively for LangGraph checkpoints
- This separation is correct and follows LangGraph's design philosophy

## 📋 Implementation Plan

### Phase 1: Database Schema (Library-First with SQLite/Drizzle)

**File**: `src/lib/storage/migrations/006_add_saved_workflows.ts`

```typescript
import type { Database } from 'better-sqlite3'

export function up(db: Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS saved_workflows (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      definition TEXT NOT NULL, -- JSON string of WorkflowDefinition
      created_by TEXT DEFAULT 'system',
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
      version INTEGER DEFAULT 1,
      tags TEXT DEFAULT '[]', -- JSON array
      is_template INTEGER DEFAULT 0,
      source TEXT CHECK(source IN ('ui', 'mcp', 'api')) DEFAULT 'ui',
      UNIQUE(project_id, name)
    );
    
    CREATE INDEX IF NOT EXISTS idx_saved_workflows_project 
      ON saved_workflows(project_id);
    CREATE INDEX IF NOT EXISTS idx_saved_workflows_template 
      ON saved_workflows(is_template);
    CREATE INDEX IF NOT EXISTS idx_saved_workflows_created 
      ON saved_workflows(created_at DESC);
  `)
}

export function down(db: Database) {
  db.exec(`DROP TABLE IF EXISTS saved_workflows`)
}
```

### Phase 2: Drizzle Schema (DRY - Follow Existing Pattern)

**File**: `src/lib/storage/schema.ts` (add to existing file)

```typescript
export const savedWorkflows = sqliteTable('saved_workflows', {
  id: text('id').primaryKey(),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  definition: text('definition').notNull(), // JSON WorkflowDefinition
  createdBy: text('created_by').default('system'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  version: integer('version').default(1),
  tags: text('tags').default('[]'), // JSON array
  isTemplate: integer('is_template', { mode: 'boolean' }).default(false),
  source: text('source', { enum: ['ui', 'mcp', 'api'] }).default('ui'),
})
```

### Phase 3: Service Layer (SOLID - Single Responsibility)

**File**: `web/server/services/WorkflowStorageService.ts`

```typescript
/**
 * Workflow Storage Service
 *
 * SOLID: Single responsibility for workflow definition persistence
 * DRY: Reuses patterns from UnifiedAgentConfigService
 * KISS: Simple CRUD operations, no complex logic
 * Library-First: Uses Drizzle ORM, no custom SQL
 */

import { getDb } from '../../../src/lib/storage/database'
import { savedWorkflows } from '../../../src/lib/storage/schema'
import { eq, and, desc } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import type { WorkflowDefinition } from '../schemas/workflow-builder'

export interface SavedWorkflow {
  id: string
  projectId: string
  name: string
  description?: string
  definition: WorkflowDefinition
  createdBy: string
  createdAt: string
  updatedAt: string
  version: number
  tags: string[]
  isTemplate: boolean
  source: 'ui' | 'mcp' | 'api'
}

export class WorkflowStorageService {
  private static instance: WorkflowStorageService

  static getInstance(): WorkflowStorageService {
    if (!this.instance) {
      this.instance = new WorkflowStorageService()
    }
    return this.instance
  }

  async create(data: {
    projectId: string
    name: string
    description?: string
    definition: WorkflowDefinition
    createdBy?: string
    tags?: string[]
    isTemplate?: boolean
    source?: 'ui' | 'mcp' | 'api'
  }): Promise<SavedWorkflow> {
    const db = getDb()
    const id = uuidv4()

    const workflow = {
      id,
      projectId: data.projectId,
      name: data.name,
      description: data.description,
      definition: JSON.stringify(data.definition),
      createdBy: data.createdBy || 'system',
      tags: JSON.stringify(data.tags || []),
      isTemplate: data.isTemplate || false,
      source: data.source || 'ui',
    }

    await db.insert(savedWorkflows).values(workflow)

    return this.getById(id)!
  }

  async getById(id: string): Promise<SavedWorkflow | null> {
    const db = getDb()
    const result = await db.select().from(savedWorkflows).where(eq(savedWorkflows.id, id)).limit(1)

    if (result.length === 0) return null

    return this.mapToSavedWorkflow(result[0])
  }

  async listByProject(projectId: string): Promise<SavedWorkflow[]> {
    const db = getDb()
    const results = await db
      .select()
      .from(savedWorkflows)
      .where(eq(savedWorkflows.projectId, projectId))
      .orderBy(desc(savedWorkflows.updatedAt))

    return results.map((row) => this.mapToSavedWorkflow(row))
  }

  async update(id: string, updates: Partial<SavedWorkflow>): Promise<SavedWorkflow | null> {
    const db = getDb()

    const updateData: any = {
      updatedAt: new Date().getTime() / 1000,
    }

    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.definition !== undefined) {
      updateData.definition = JSON.stringify(updates.definition)
      updateData.version = (await this.getById(id))?.version ?? 0 + 1
    }
    if (updates.tags !== undefined) updateData.tags = JSON.stringify(updates.tags)

    await db.update(savedWorkflows).set(updateData).where(eq(savedWorkflows.id, id))

    return this.getById(id)
  }

  async delete(id: string): Promise<boolean> {
    const db = getDb()
    const result = await db.delete(savedWorkflows).where(eq(savedWorkflows.id, id))
    return result.changes > 0
  }

  private mapToSavedWorkflow(row: any): SavedWorkflow {
    return {
      id: row.id,
      projectId: row.projectId,
      name: row.name,
      description: row.description,
      definition: JSON.parse(row.definition),
      createdBy: row.createdBy,
      createdAt: new Date(row.createdAt * 1000).toISOString(),
      updatedAt: new Date(row.updatedAt * 1000).toISOString(),
      version: row.version,
      tags: JSON.parse(row.tags),
      isTemplate: row.isTemplate,
      source: row.source,
    }
  }
}
```

### Phase 4: API Endpoints (DRY - Follow Existing Patterns)

**File**: `web/server/api/workflows.ts`

```typescript
/**
 * Workflow CRUD API Endpoints
 *
 * Following the exact pattern from agent-configs.ts
 */

import { Router } from 'express'
import { WorkflowStorageService } from '../services/WorkflowStorageService'

const router = Router()
const service = WorkflowStorageService.getInstance()

// List workflows for a project
router.get('/', async (req, res) => {
  try {
    const projectId = req.query.projectId as string
    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' })
    }

    const workflows = await service.listByProject(projectId)
    res.json(workflows)
  } catch (error) {
    console.error('Failed to list workflows:', error)
    res.status(500).json({ error: 'Failed to list workflows' })
  }
})

// Get single workflow
router.get('/:id', async (req, res) => {
  try {
    const workflow = await service.getById(req.params.id)
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' })
    }
    res.json(workflow)
  } catch (error) {
    console.error('Failed to get workflow:', error)
    res.status(500).json({ error: 'Failed to get workflow' })
  }
})

// Create workflow
router.post('/', async (req, res) => {
  try {
    const workflow = await service.create(req.body)
    res.json(workflow)
  } catch (error) {
    console.error('Failed to create workflow:', error)
    res.status(500).json({ error: 'Failed to create workflow' })
  }
})

// Update workflow
router.put('/:id', async (req, res) => {
  try {
    const workflow = await service.update(req.params.id, req.body)
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' })
    }
    res.json(workflow)
  } catch (error) {
    console.error('Failed to update workflow:', error)
    res.status(500).json({ error: 'Failed to update workflow' })
  }
})

// Delete workflow
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await service.delete(req.params.id)
    if (!deleted) {
      return res.status(404).json({ error: 'Workflow not found' })
    }
    res.json({ success: true })
  } catch (error) {
    console.error('Failed to delete workflow:', error)
    res.status(500).json({ error: 'Failed to delete workflow' })
  }
})

export default router
```

### Phase 5: Store Integration (KISS - Minimal Changes)

**Update**: `src/stores/workflowBuilder.ts`

Add these methods to the existing store:

```typescript
// Add to WorkflowBuilderState interface:
saveWorkflow: () => Promise<SavedWorkflow>
loadWorkflow: (workflowId: string) => Promise<void>

// Add to store implementation:
saveWorkflow: async () => {
  const state = get()
  if (!state.workflow) throw new Error('No workflow to save')

  const projectId = 'current-project' // TODO: Get from project context

  try {
    const saved = await ky.post('/api/workflows', {
      json: {
        projectId,
        name: state.workflow.name,
        description: state.workflow.description,
        definition: state.workflow,
        source: 'ui',
      }
    }).json<SavedWorkflow>()

    set({ isDirty: false })
    return saved
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Save failed'
    set({ lastError: errorMessage })
    throw error
  }
},

loadWorkflow: async (workflowId: string) => {
  try {
    const saved = await ky.get(`/api/workflows/${workflowId}`).json<SavedWorkflow>()

    set({
      workflow: saved.definition,
      isDirty: false,
      selectedStepId: null,
      validationResult: null,
      lastError: null,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Load failed'
    set({ lastError: errorMessage })
    throw error
  }
},
```

### Phase 6: UI Integration (Minimal UI Changes)

1. **Add Save Button** to `VisualWorkflowBuilder.tsx`:
   - Only show when `isDirty === true`
   - Call `store.saveWorkflow()`

2. **Add Load Dialog** to workspace:
   - List workflows using `/api/workflows?projectId=X`
   - Load selected workflow into builder

3. **Update MCP Tools** to save workflows:
   - Add `save: boolean` parameter to `create_workflow` tool
   - Call WorkflowStorageService when save=true

## 🚀 Benefits of This Approach

**Research Validated**: After researching available libraries:

- ❌ No established libraries for workflow definition storage exist
- ❌ Most solutions are either too heavyweight (n8n, Temporal) or too general (lowdb)
- ✅ Building on existing Drizzle/SQLite is the most Library-First approach available

1. **Library-First**: Uses existing SQLite/Drizzle infrastructure (no new dependencies)
2. **DRY**: Follows exact patterns from agent configs in the codebase
3. **SOLID**: Each service has single responsibility
4. **KISS**: No complex custom solutions, just CRUD following existing patterns

## ⚠️ What NOT to Do (Research Confirmed)

- ❌ Don't try to extend LangGraph checkpoints for definitions (not designed for this)
- ❌ Don't create a separate database (against DRY principle)
- ❌ Don't add heavyweight libraries like n8n or Temporal for simple JSON storage
- ❌ Don't mix execution state with definition storage (violates separation of concerns)

## 📊 Database Architecture Summary

```
SQLite (Application Data)          PostgreSQL (LangGraph Only)
├── projects                       ├── checkpoints
├── agents                         ├── checkpoint_metadata
├── agent_configs                  ├── checkpoint_writes
├── saved_workflows (NEW)          └── checkpoint_channels
└── other app data
```

This separation is intentional and follows the Library-First principle by using each database for its intended purpose.
