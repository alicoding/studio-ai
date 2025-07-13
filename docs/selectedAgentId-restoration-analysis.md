# SelectedAgentId Restoration Analysis & Fix

## Issues Identified

### 1. **Delayed Restoration**
- **Problem**: selectedAgentId was only restored inside `setAgents()`, which is called asynchronously after agents are loaded
- **Impact**: UI showed "No agent selected" until agents finished loading
- **Root Cause**: The store initialized with `selectedAgentId: null` instead of checking localStorage immediately

### 2. **Race Condition**
- **Problem**: Multiple calls to `setAgents()` during initialization could overwrite the restored selection
- **Impact**: Even if restoration worked, subsequent `setAgents([])` calls would clear it
- **Root Cause**: The useEffect in `index.tsx` calls `setAgents([])` when no agents are found, without preserving existing selection

### 3. **Poor UX**
- **Problem**: ViewControls showed raw agent ID instead of agent name
- **Impact**: Users saw cryptic IDs like "agent_123" instead of friendly names
- **Root Cause**: ViewControls didn't look up the agent object to get its name

### 4. **Incomplete Cleanup**
- **Problem**: When removing the selected agent, localStorage wasn't updated
- **Impact**: App would try to restore a deleted agent on next load
- **Root Cause**: `removeAgent()` cleared selectedAgentId in state but not in localStorage

## Solutions Applied

### 1. **Immediate Restoration**
```typescript
// Helper to restore selectedAgentId from localStorage
const getInitialSelectedAgentId = (): string | null => {
  try {
    return localStorage.getItem('claudeStudio:selectedAgentId') || null
  } catch (error) {
    console.warn('Failed to restore selectedAgentId from localStorage:', error)
    return null
  }
}

// In store initialization:
selectedAgentId: getInitialSelectedAgentId(),
```

### 2. **Smart Validation**
```typescript
setAgents: (agents) => {
  set((state) => {
    // ... order logic ...
    
    // Validate the current selectedAgentId
    const currentSelectedId = state.selectedAgentId
    const isSelectedAgentValid = currentSelectedId && 
      agents.some(agent => agent.id === currentSelectedId)
    
    return { 
      agents: agentsWithOrder,
      // Only clear if invalid AND we have agents
      selectedAgentId: agents.length > 0 && !isSelectedAgentValid 
        ? null 
        : currentSelectedId
    }
  })
}
```

### 3. **Improved UI**
```typescript
// In ViewControls:
const selectedAgent = useAgentStore(state => 
  selectedAgentId ? state.agents.find(a => a.id === selectedAgentId) : null
)

// Display:
{selectedAgent ? `→ ${selectedAgent.name}` : '→ No agent selected'}
```

### 4. **Complete Cleanup**
```typescript
removeAgent: (agentId) => {
  set((state) => {
    // ... removal logic ...
    
    // Clear localStorage if removing selected agent
    if (state.selectedAgentId === agentId) {
      try {
        localStorage.removeItem('claudeStudio:selectedAgentId')
      } catch (error) {
        console.warn('Failed to clear selectedAgentId from localStorage:', error)
      }
    }
    
    return newState
  })
}
```

## Benefits

1. **Instant Restoration**: Selected agent appears immediately on page load
2. **Consistent State**: No race conditions or unexpected clearing
3. **Better UX**: Users see agent names, not IDs
4. **Clean State**: No attempts to restore deleted agents

## Technical Notes

- The fix maintains backward compatibility with existing localStorage data
- Error handling prevents localStorage issues from breaking the app
- The validation logic ensures we don't clear valid selections unnecessarily
- The solution follows the existing patterns in the codebase