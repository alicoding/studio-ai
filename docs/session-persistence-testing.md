# Session Persistence Testing Guide

This guide helps verify that state persistence is working correctly across all stores.

## What's Persisted

1. **Agents Store** (`claude-studio-agents`)
   - Selected agent ID
   - Agent list and configurations
   - Agent ordering
   - Clearing agent state

2. **Projects Store** (`claude-studio-projects`)
   - Open projects list
   - Active project ID
   - View mode (single/split/grid/develop)
   - Sidebar collapsed state
   - Chat collapsed state

3. **Diagnostics Store** (`claude-studio-diagnostics`)
   - Monitoring preference (isMonitoring)
   - Note: Actual diagnostics are re-fetched on reload

4. **Collapsible Store** (`claude-studio-collapsible`)
   - All UI collapsible states

5. **Shortcuts Store** (`claude-studio-shortcuts`)
   - Custom keyboard shortcuts

## Testing Steps

### 1. Test Agent Persistence
1. Select an agent in the UI
2. Reorder agents if possible
3. Refresh the page (F5)
4. Verify:
   - Same agent is selected
   - Agent order is preserved

### 2. Test Project Persistence
1. Open multiple projects
2. Select one as active
3. Change view mode (split/grid)
4. Collapse/expand sidebar
5. Refresh the page
6. Verify:
   - Same projects are open
   - Active project is maintained
   - View mode is preserved
   - Sidebar state is preserved

### 3. Test UI State Persistence
1. Expand/collapse various UI sections
2. Refresh the page
3. Verify all collapsible states are maintained

### 4. Test Keyboard Shortcuts
1. Go to Settings > Shortcuts
2. Record a new shortcut for any action
3. Save changes
4. Refresh the page
5. Verify custom shortcuts are preserved

### 5. Test Cross-Browser Persistence
1. Open the app in Chrome
2. Make some state changes (select agent, open projects)
3. Open the app in another browser profile or incognito
4. Verify state is NOT shared (localStorage is domain + browser specific)

### 6. Test Storage Management
1. Go to Settings > Storage
2. View current storage usage
3. Export data
4. Clear specific stores
5. Verify cleared data is gone
6. Import previously exported data
7. Verify data is restored

## Debugging

### Check localStorage
Open browser DevTools Console and run:
```javascript
// View all persisted stores
Object.keys(localStorage).filter(k => k.startsWith('claude-studio-')).forEach(key => {
  console.log(key, JSON.parse(localStorage.getItem(key)))
})
```

### Clear Specific Store
```javascript
// Clear agents store only
localStorage.removeItem('claude-studio-agents')
```

### Clear All Claude Studio Data
```javascript
// Clear all Claude Studio data
Object.keys(localStorage).filter(k => k.startsWith('claude-studio-')).forEach(key => {
  localStorage.removeItem(key)
})
```

## Architecture Notes

- All persistence uses Zustand's persist middleware
- Data is stored in localStorage with `claude-studio-` prefix
- Each store can define what to persist via `partialize`
- Migrations are supported via version numbers
- Failed hydration is handled gracefully (falls back to initial state)

## Common Issues

1. **State not persisting**: Check browser localStorage quota
2. **Old state loading**: Clear localStorage and refresh
3. **Partial state**: Check `partialize` function in store definition