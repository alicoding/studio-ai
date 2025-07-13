# SelectedAgentId Restoration Test Plan

## Overview
This test plan verifies that the selectedAgentId is properly restored when the app is refreshed or reloaded.

## Changes Made

1. **Immediate Restoration**: Modified `agents.ts` to restore selectedAgentId immediately on store creation using `getInitialSelectedAgentId()` helper function.

2. **Validation on Agent Load**: Updated `setAgents` to validate the restored selectedAgentId against the loaded agents, only clearing it if it's invalid AND agents have been loaded.

3. **Persistence on Removal**: Fixed `removeAgent` to clear localStorage when the selected agent is removed.

4. **UI Improvement**: Updated `ViewControls` to show the agent name instead of the agent ID.

## Test Cases

### Test 1: Initial Load with Saved Selection
1. Open the app with a project that has agents
2. Select an agent (verify name shows in ViewControls)
3. Note the agent name
4. Refresh the page (F5)
5. **Expected**: The same agent should be selected, showing its name in ViewControls

### Test 2: Load with Invalid Selection
1. Select an agent
2. Close the app
3. Delete the agent from the project (via file system or API)
4. Open the app
5. **Expected**: "No agent selected" should show (graceful fallback)

### Test 3: Agent Removal
1. Select an agent
2. Remove the selected agent via the UI
3. **Expected**: "No agent selected" should show
4. Refresh the page
5. **Expected**: "No agent selected" should persist (not restore deleted agent)

### Test 4: Project Switch
1. Open Project A with agents
2. Select an agent in Project A
3. Switch to Project B
4. Switch back to Project A
5. **Expected**: The previously selected agent in Project A should be restored

### Test 5: Empty Project
1. Open a project with no agents
2. Refresh the page
3. **Expected**: "No agent selected" should show (no errors)

## Implementation Details

### Key Changes:

1. **agents.ts**:
   - Added `getInitialSelectedAgentId()` helper
   - Initialize `selectedAgentId` with restored value
   - Validate selectedAgentId in `setAgents` without clearing valid selections
   - Clear localStorage in `removeAgent` when removing selected agent

2. **ViewControls.tsx**:
   - Import `useAgentStore`
   - Get selected agent object to display name
   - Show agent name instead of ID

### localStorage Keys:
- `claudeStudio:selectedAgentId` - Stores the ID of the selected agent
- `claudeStudio:agentOrder` - Stores agent ordering (existing functionality)

## Verification Steps

1. Check browser DevTools > Application > Local Storage
2. Verify `claudeStudio:selectedAgentId` is set when selecting an agent
3. Verify it's cleared when removing the selected agent
4. Verify it persists across page refreshes