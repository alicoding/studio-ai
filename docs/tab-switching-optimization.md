# Tab Switching Optimization

## Problem
User reported that switching tabs in the settings page causes config reloads that shouldn't happen.

## Root Cause Analysis
1. The `useSettings` hook was being called at the page level
2. Every component re-render could potentially trigger the settings load
3. No caching mechanism was in place

## Implemented Optimizations

### 1. Settings Cache (useSettings.ts)
- Added a module-level cache for settings with 5-minute TTL
- Cache prevents unnecessary API calls when switching tabs
- Initial state uses cached values if available
- `loadSystemSettings` now accepts `forceReload` parameter

```typescript
// Cache implementation
let settingsCache: { config: SystemConfig; hooks: Hook[]; timestamp: number } | null = null
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
```

### 2. Memoized Settings Page
- Wrapped SettingsPage component with React.memo
- Prevents unnecessary re-renders from parent components

### 3. Lazy Tab Content Rendering
- Only render tab content when the tab is active
- Uses conditional rendering: `{activeTab === 'system' && <SystemSettingsTab />}`
- Prevents hidden tabs from executing hooks or effects

### 4. Stable Callbacks
- Used useCallback for tab change handler
- Prevents function recreation on every render

## Benefits
1. **Performance**: Settings are loaded once and cached
2. **Efficiency**: Hidden tabs don't render or execute logic
3. **Stability**: No unnecessary re-renders or API calls
4. **User Experience**: Instant tab switching without delays

## Testing
1. Open settings page - should see "[useSettings] Loading system settings..." once
2. Switch tabs - should only see "[SettingsPage] Tab changed to: X"
3. No additional settings loads should occur
4. Settings persist correctly across tab switches

## Side Effects
None - all optimizations maintain existing functionality while improving performance.

## Future Improvements
1. Consider implementing React Query for more sophisticated caching
2. Add cache invalidation on settings save
3. Implement partial updates instead of full reloads