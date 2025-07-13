# TODOs and Placeholders Tracking Document

This document tracks all TODO/FIXME/placeholder items found in the codebase that are NOT part of the workflow builder implementation plan. These items need to be addressed to ensure the system is production-ready.

## 📋 WORKFLOW-RELATED TODOs (Being tracked in workflow-builder-todo.md)

### **ConditionalNode.tsx** - Line 24

```typescript
// TODO: Update store with new condition
```

**Status**: ✅ Completed - Fixed in Phase 2.1 of conditional nodes implementation
**Action**: Connected ConditionalNode to workflow store using useWorkflowBuilderStore hook

### **LoopNode.tsx** - Line 27

```typescript
// TODO: Update store with new loop settings
```

**Status**: ⏳ Future Feature - Loop nodes are not yet implemented
**Action**: Track in future workflow builder phases

### **WorkflowLibrary.tsx** - Lines 330, 340, 350

```typescript
// TODO: Implement copy functionality
// TODO: Implement export functionality
// TODO: Implement delete functionality
```

**Status**: ✅ Already Implemented - These features exist in WorkflowsPage
**Action**: Remove these TODOs - functionality exists in the dedicated workflows page

### **WorkflowLibraryModal.tsx** - Line 66

```typescript
// TODO: Implement workflow execution
```

**Status**: ✅ Already Implemented - Execution works from WorkflowsPage
**Action**: Remove this TODO - execution is working

### **VisualWorkflowBuilder.tsx** - Lines 253, 269

```typescript
// TODO: Show user-friendly error notification
```

**Status**: 🔧 UI Polish - Not critical for functionality
**Action**: Low priority - enhance error notifications

## 🚨 NON-WORKFLOW TODOs REQUIRING ATTENTION

### **1. Settings UI Components**

**PlaceholderTab.tsx**

- **Description**: Entire component is a placeholder
- **Priority**: 🟡 Medium - Affects user experience
- **Action**: Either implement or remove if not needed

### **2. UI Component TODOs**

**textarea.tsx, select.tsx, input.tsx**

- Various styling and functionality TODOs
- **Priority**: 🟢 Low - Components work but could be enhanced
- **Action**: UI polish phase

**model-selector.tsx**

- Model selection enhancements
- **Priority**: 🟡 Medium - Affects AI model selection
- **Action**: Enhance model selection UI

### **3. Chat and Messaging**

**TodoList.tsx**

- Todo list content block enhancements
- **Priority**: 🟢 Low - Feature works
- **Action**: UI enhancements

**MessageSearch.tsx, UserMessageSearch.tsx**

- Search functionality improvements
- **Priority**: 🟡 Medium - Improves usability
- **Action**: Enhance search capabilities

### **4. Agent and Team Management**

**TeamBuilder.tsx**

- Team building functionality
- **Priority**: 🟡 Medium - Part of multi-agent features
- **Action**: Complete team management features

**CreateAgentModal.tsx**

- Agent creation enhancements
- **Priority**: 🟡 Medium - Core feature
- **Action**: Polish agent creation flow

### **5. System and API**

**system.ts**

- System API endpoints
- **Priority**: 🔴 High - Core functionality
- **Action**: Review and complete system APIs

**messages.ts, messages-batch.ts**

- Message handling improvements
- **Priority**: 🟡 Medium - Core messaging
- **Action**: Enhance message handling

## 🎯 INTENTIONAL FEATURES (DO NOT REMOVE)

### **MockStepExecutor**

- **Location**: `web/server/services/executors/MockStepExecutor.ts`
- **Purpose**: Allows testing workflows without consuming Claude API quota
- **Status**: ✅ Intentional feature controlled by `USE_MOCK_AI` environment variable

### **Mock Claude SDK (in .env)**

- **Purpose**: Development and testing without API calls
- **Status**: ✅ Intentional feature for development

## 📊 SUMMARY

### **Immediate Actions Required**

1. **Remove outdated TODOs** in WorkflowLibrary components (functionality exists elsewhere)
2. **Fix ConditionalNode TODO** as part of Phase 2.1 implementation
3. **Review system.ts** for any critical missing APIs

### **Future Enhancements**

1. **Loop nodes** - Track as future workflow builder feature
2. **UI polish** - Error notifications, search improvements
3. **Settings tabs** - Complete or remove placeholder tabs

### **No Action Required**

1. **MockStepExecutor** - Intentional testing feature
2. **Mock Claude SDK** - Intentional development feature

## 🔍 VERIFICATION CHECKLIST

- [ ] All workflow-related TODOs are tracked in workflow-builder-todo.md
- [ ] Outdated TODOs in WorkflowLibrary are removed
- [ ] ConditionalNode TODO is being addressed in current implementation
- [ ] System APIs are reviewed for completeness
- [ ] Intentional mock features are documented and preserved

---

**Last Updated**: 2025-01-13  
**Next Review**: After Phase 2 conditional nodes implementation  
**Priority**: Focus on workflow builder completion first, then address high-priority system TODOs
