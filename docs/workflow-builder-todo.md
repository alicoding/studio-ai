# Workflow Builder Implementation Plan

This document tracks the implementation of the Workflow Builder feature for Claude Studio. We're following a **gradual evolution approach** - no big bang rewrites, just steady progress.

## 📍 DECISION: What to Do Next (Jan 2025)

**✅ APIs are READY** - All backend work is complete and tested. The flexible scope system supports future growth.

**🎯 NEXT ACTION: Wire up Save/Load buttons** (Step 1 below)

- This is the smallest valuable increment
- Makes the existing UI actually functional
- No new UI components needed
- Ali can test immediately

**❌ NOT YET:**

- Don't build workflow library page yet
- Don't add import UI yet
- Don't add cross-project features yet

Just make save/load work first!

## 🎯 Current Status (Jan 2025)

### What's DONE ✅

#### **API Level (Backend) - COMPLETE**

- ✅ **Workflow Storage System** - SQLite implementation with full CRUD
- ✅ **API Endpoints**:
  - `POST /api/workflows/validate` - Validate workflow structure
  - `POST /api/workflows/execute` - Execute workflows
  - `GET/POST/PUT/DELETE /api/workflows/saved` - Full CRUD for saved workflows
  - `POST /api/workflows/import/executed/:threadId` - Import single executed workflow
  - `GET /api/workflows/import/executed/available` - List importable workflows
- ✅ **Database Migration** - saved_workflows table created with scope field
- ✅ **Import System** - Convert executed workflows to editable definitions
- ✅ **MCP Tools** - Workflow creation/validation/execution via MCP
- ✅ **Flexible APIs** - Support for global, project, and cross-project workflows
  - Optional projectId for global workflows
  - Scope field: 'project' | 'global' | 'cross-project'
  - Query by scope: `?scope=global` or `?global=true`
  - Backward compatible: project queries include global workflows

#### **UI Level (Frontend) - PARTIALLY COMPLETE**

- ✅ **Visual Workflow Builder** - Canvas-based editor with React Flow
- ✅ **Workflow Builder Store** - State management with Zustand
- ✅ **Node Components** - WorkflowStep, Conditional, Loop nodes
- ✅ **Save/Load Buttons** - UI connected to API with full functionality
- ❌ **Workflow Library** - No UI to browse saved workflows
- ❌ **Import UI** - No UI to import executed workflows

### What Ali Has TESTED ✅

- ✅ Visual workflow builder opens and works
- ✅ Can create workflows visually
- ✅ Can execute workflows from builder
- ⏳ Can save workflows (needs testing)
- ⏳ Can load existing workflows (needs testing)
- ❌ Cannot see workflow library

### API Testing Status ✅

- ✅ CREATE - Works for both project and global workflows
- ✅ READ - Get by ID and list by project/scope working
- ✅ UPDATE - Workflow updates working correctly
- ✅ DELETE - Deletion working (tested earlier)
- ✅ VALIDATE - Validation endpoint working
- ✅ EXECUTE - Execution working from UI already
- ✅ Flexible queries - Scope, global, and backward compatibility all working

### API Documentation Status ✅

- ✅ **Swagger Documentation** - Auto-generated from code using swagger-autogen
- ✅ **API Health Check** - 226 API paths, 286 endpoints documented
- ✅ **Multiple Interfaces** - Swagger UI, ReDoc, and JSON export
- ✅ **Documentation Generation Script** - `npm run docs:generate`
- ✅ **Live Documentation** - Available at:
  - http://localhost:3456/api/api-docs (Stable server)
  - http://localhost:3457/api/api-docs (Dev server)
  - Health check: `/api/api-docs/health`
  - Raw JSON: `/api/api-docs/json`
  - Alternative UI: `/api/api-docs/redoc`

## 🚀 Immediate Next Steps (Gradual Evolution)

### **Step 1: Wire Up Save/Load** 🔧 ✅ COMPLETED

Save/Load functionality has been fully implemented:

1. **Save Button** ✅:
   - Integrated with workflow builder store
   - Calls `/api/workflows/saved` endpoint
   - Shows loading state and feedback
   - Supports both project and global scopes
   - Preserves workflow state after saving

2. **Load Functionality** ✅:
   - Modal-based workflow selection UI
   - Fetches workflows from `/api/workflows/saved`
   - Shows workflow details (name, description, step count, update date)
   - Loads selected workflow into builder
   - Handles both project-specific and global workflows

**Implementation Details**:

- Added `saveWorkflow()` and `fetchSavedWorkflows()` to store
- Added `isSaving` state for UI feedback
- Created workflow selection modal with proper TypeScript types
- Integrated with existing ModalLayout component
- All TypeScript/ESLint checks passing

**Ready for Testing**:

- ✅ API: Already tested with curl
- ⏳ UI: Ali needs to test save/load flow

### **Step 2: Dedicated Workflows Page** 📄

Create `/workflows` route for workflow management:

```
/workflows
├── List all saved workflows (table/cards)
├── Actions: Edit, Clone, Delete, Execute
├── "New Workflow" → Opens builder
└── Search/filter functionality
```

**Testing**:

- Can navigate to /workflows ⏳
- Can see saved workflows ⏳
- Can perform CRUD operations ⏳

### **Step 3: Basic Execution History** 📊

Track where workflows were executed:

```
Workflow Details:
├── Definition (name, steps, etc.)
├── Execution History
│   ├── Timestamp
│   ├── Status (success/failed)
│   └── Thread ID (link to details)
```

**Testing**:

- Executions are tracked ⏳
- Can see history per workflow ⏳

## 🎯 What We're NOT Building Yet

### **Defer for Later:**

- ❌ Cross-project workflows (keep projectId required for now)
- ❌ Global workflow templates
- ❌ Advanced node types (stick with current 3)
- ❌ Complex activity reorganization
- ❌ Workflow marketplace

### **Use What We Have:**

- ✅ LangGraph for execution (no custom engine)
- ✅ Current node types (task, conditional, loop)
- ✅ Existing agent system (no new abstractions)

## 📋 Testing Checklist

### **For Claude (Before Handoff)**

- [ ] Save button stores workflow to database
- [ ] Load modal shows saved workflows
- [ ] Selected workflow loads into builder
- [ ] /workflows page lists all workflows
- [ ] CRUD operations work from UI
- [ ] TypeScript/ESLint passing
- [ ] No console errors

### **For Ali (UI/UX Testing)**

- [ ] Save workflow → See success message
- [ ] Load workflow → Builder populated correctly
- [ ] /workflows page is intuitive
- [ ] Edit/Clone/Delete actions work
- [ ] Visual feedback for all actions
- [ ] No confusing error states
- [ ] Mobile responsive (if needed)

## 🔄 Evolution Path (Future)

Once the basics work perfectly, we can evolve:

1. **Phase 1**: Current (project-specific workflows)
2. **Phase 2**: Optional projectId (global workflows)
3. **Phase 3**: Better activity tracking
4. **Phase 4**: Cross-project execution
5. **Phase 5**: LangGraph advanced features
6. **Phase 6**: External integrations (maybe)

## 📊 Progress Tracking

### **Completed Tasks** ✅

- [x] Database schema and migration
- [x] Workflow storage service (SQLite)
- [x] CRUD API endpoints
- [x] Import executed workflows API
- [x] Workflow validation endpoint
- [x] Workflow execution endpoint
- [x] MCP workflow tools
- [x] Visual workflow builder UI
- [x] Workflow builder store
- [x] Node components

### **In Progress** 🔧

- [ ] Wire save button to API
- [ ] Wire load functionality
- [ ] Create /workflows page

### **Blocked/Waiting** ⏳

- [ ] Workflow library UI (needs save/load first)
- [ ] Import UI (needs library first)
- [ ] Execution history UI (needs basic tracking)

## 🎯 Success Criteria

**Immediate Success** = When Ali can:

1. Create a workflow in the builder
2. Save it with a name
3. See it in /workflows page
4. Load it back into builder
5. Edit and save changes
6. Execute it multiple times

**No Need For:**

- Complex cross-project features
- Advanced node types
- Perfect UI polish
- 100% feature parity with n8n

## 📝 Key Decisions Made

1. **Storage**: SQLite with Drizzle ORM (done)
2. **Import**: API complete, UI pending
3. **Architecture**: Gradual evolution, not big bang
4. **Scope**: Project-specific first, global later
5. **Focus**: Make basics work perfectly

## 🚨 Current Blockers

**None!** We have everything needed at API level. Just need to:

1. Wire up the UI buttons
2. Create the /workflows page
3. Test with Ali

---

**Last Updated**: Jan 2025
**Next Review**: After Step 1 (Save/Load) is complete

## 🎓 Key Insight: API-First Approach Working!

Your vision of building flexible APIs first is paying off:

- ✅ APIs support global/project/cross-project workflows
- ✅ No UI constraints limiting the API design
- ✅ Can evolve UI gradually without API changes
- ✅ Ready for future n8n-like capabilities

The foundation is solid. Now we just need to connect the wires!
