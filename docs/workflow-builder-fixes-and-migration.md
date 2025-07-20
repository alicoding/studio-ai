# Workflow Builder: Critical Fixes & LangGraph Migration

**Created**: 2025-07-20  
**Status**: In Progress  
**Context**: Provider node corruption bugs and architecture evaluation for LangGraph integration

## 📋 Task Overview

This document tracks the resolution of critical workflow builder bugs and evaluation of LangGraph migration to eliminate "reinventing the wheel" problems.

### Core Issues Identified

1. **Data Corruption**: Provider nodes save as `type: 'task'` instead of `type: 'provider'`
2. **Missing Features**: Keyboard shortcuts accidentally removed during React Flow fixes
3. **Schema Gaps**: Missing node types in WorkflowStepDefinition union
4. **Architecture Debt**: Dual representation (React Flow + Custom) creates translation bugs

---

## 🚨 CRITICAL FIXES (Phase 1)

### Task A: Fix Provider Schema Corruption

**Todo ID**: `fix-provider-schema-corruption`  
**Priority**: HIGH  
**Status**: Pending

**Problem**: `web/server/schemas/workflow-builder.ts:38` missing 'provider' type

```typescript
// CURRENT (BROKEN)
type: 'task' | 'parallel' | 'conditional' | 'loop' | 'human' | 'ai_evaluation'

// REQUIRED FIX
type: 'task' |
  'parallel' |
  'conditional' |
  'loop' |
  'human' |
  'ai_evaluation' |
  'provider' |
  'memory' |
  'tools'
```

**Files to Modify**:

- `web/server/schemas/workflow-builder.ts` - Add types to union
- Test save/load cycle to verify fix

**Library Research**: None needed - pure schema fix

---

### Task B: Restore Keyboard Shortcuts

**Todo ID**: `restore-keyboard-shortcuts`  
**Priority**: HIGH  
**Status**: COMPLETED ✅

**Problem**: Functions `selectAllSteps` and `deleteSelectedSteps` removed from VisualWorkflowBuilder.tsx

**Research Required**:

- Use research MCP to find React Flow keyboard handling best practices
- Find library solutions for keyboard shortcuts that don't conflict with input fields

**Implementation**:

1. Research keyboard handling libraries compatible with React Flow
2. Restore functions without breaking provider node input fields
3. Test Cmd+A (select all) and Delete key functionality

---

### Task C: Fix Node Type Mapping

**Todo ID**: `fix-steps-to-nodes-mapping`  
**Priority**: HIGH  
**Status**: COMPLETED ✅

**Problem**: `stepsToNodes` function doesn't handle provider/memory/tools types

**Solution Implemented**:

- Added `provider`, `memory`, `tools` cases to stepsToNodes switch statement
- Registered placeholder node types in nodeTypes object for memory/tools
- Provider node type mapping now works correctly

**Research Required**:

- Use research MCP to find React Flow node type registration patterns
- Look for libraries that handle dynamic node type mapping

**Files to Investigate**:

- Find `stepsToNodes` function location
- Update node type mappings
- Add proper component registration

---

## 🏗️ STRATEGIC MIGRATION (Phase 2)

### Task D: LangGraph Migration Evaluation

**Todo ID**: `langgraph-migration-analysis`  
**Priority**: HIGH  
**Status**: COMPLETED

**Analysis Complete**: Hybrid approach recommended

- Keep React Flow for visual editing
- Use LangGraph StateGraph for execution
- Eliminate translation layer bugs
- Leverage existing MemorySaver infrastructure

### Task E: Memory & Tools Node Creation

**Todo ID**: `create-memory-node`, `create-tools-node`  
**Priority**: MEDIUM  
**Status**: Pending

**Research Required**:

- Use research MCP to find memory management patterns for AI workflows
- Research tool integration libraries for AI agents
- Find React component patterns for configuration nodes

**Node Types Needed**:

- **Memory**: Buffer, Vector, Summary, Entity
- **Tools**: Function, API, Retriever, Code, MCP

---

## 📚 RESEARCH REQUIREMENTS

**MANDATORY**: Use `mcp__studio-ai__execute_research` for ALL library research before writing custom code.

### Research Topics Queue

1. **React Flow Keyboard Handling**: Best practices for input fields in nodes
2. **Memory Management Libraries**: Vector stores, buffer management for AI
3. **Tool Integration Patterns**: Function calling, API integration libraries
4. **LangGraph Node Types**: Built-in node types we can leverage
5. **Workflow Validation Libraries**: Schema validation for complex workflows

### Research Template

```javascript
mcp__studio -
  ai__execute_research({
    input:
      'Best React Flow keyboard handling libraries that work with input fields in custom nodes 2025',
  })
```

---

## 🔄 PROGRESS TRACKING

### Completed ✅

- Provider node visual implementation (n8n-style canvas pattern)
- Auto-connection logic for AI nodes
- Custom modal system (no shadcn conflicts)
- HTML input/select replacements for React Flow compatibility
- LangGraph architecture analysis

### In Progress 🔄

- Critical schema fixes
- Keyboard shortcut restoration
- Node type mapping fixes

### Pending ⏳

- Memory/Tools node implementation
- LangGraph hybrid integration
- Bug prevention system implementation

---

## 🎯 SUCCESS CRITERIA

### Phase 1 Complete When:

- [x] Provider nodes save/load correctly as `type: 'provider'`
- [x] Keyboard shortcuts (Cmd+A, Delete) work without breaking input fields
- [x] All node types properly mapped in stepsToNodes function
- [x] No data corruption on workflow save/reload cycle

### Phase 2 Complete When:

- [ ] Memory and Tools nodes implemented with library-based solutions
- [ ] LangGraph hybrid execution working
- [ ] Translation layer eliminated
- [ ] All workflow management using proven libraries (no custom code)

---

## 📝 NOTES & DECISIONS

### Architecture Decision: Hybrid LangGraph Approach

- **Rationale**: Eliminates translation bugs while keeping React Flow UI
- **Implementation**: React Flow → LangGraph StateGraph → MemorySaver
- **Benefits**: Proven orchestration, built-in persistence, no custom workflow engine

### Library-First Mandate

- **Rule**: MUST use research MCP before any custom implementation
- **Goal**: Eliminate reinventing wheel problems
- **Focus**: Proven solutions over custom code

---

**Last Updated**: 2025-07-20 - ALL CRITICAL FIXES COMPLETED ✅

## 🎉 PHASE 1 STATUS: COMPLETE

### Fixed Issues:

1. ✅ **Schema Corruption**: Added 'provider'|'memory'|'tools' types + providerConfig field
2. ✅ **Data Creation Bug**: Fixed addStep() to create type:'provider' instead of type:'task'
3. ✅ **Data Mapping**: Provider nodes now properly pass providerType/config to components
4. ✅ **Keyboard Shortcuts**: Cmd+A/Delete work without breaking input fields
5. ✅ **Node Type Mapping**: All node types handled in stepsToNodes function

### Root Cause Resolution:

- **ACTUAL BUG**: Line 879 in VisualWorkflowBuilder.tsx was calling addStep() with type:'task'
- **ACTUAL FIX**: Changed to type:'provider' + added providerType/providerConfig data
- **Result**: Provider nodes now save, load, and display correctly

### Result:

- Provider nodes save/load correctly as `type: 'provider'`
- No more data corruption on workflow persistence
- Proper provider configuration display (OpenAI, model info, etc.)
- Full keyboard shortcut functionality restored

**Next Update**: Ready for Phase 2 - Memory/Tools nodes + LangGraph migration
