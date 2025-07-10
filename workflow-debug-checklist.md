# WorkflowList Debug Checklist

## Issue: WorkflowList component is empty despite browser logs showing data

### Quick Debug Steps (Run in Browser Console)

```javascript
// 1. Check Zustand store directly
const store = window.__ZUSTAND_DEVTOOLS__?.stores?.workflow || {}
console.log('Workflow Store:', store.getState())

// 2. Test API endpoint
fetch('/api/invoke-status/workflows')
  .then((r) => r.json())
  .then((data) => console.log('API Response:', data))

// 3. Check for React re-render issues
const originalLog = console.log
let renderCount = 0
console.log = (...args) => {
  if (args[0]?.includes?.('WorkflowList')) {
    renderCount++
    originalLog(`[RENDER ${renderCount}]`, ...args)
  } else {
    originalLog(...args)
  }
}
```

### Potential Issues & Solutions

#### 1. **Store Data Not Updating**

**Symptom:** API returns data but Zustand store remains empty

**Debug:**

```javascript
// Check if fetchWorkflows is working
const { fetchWorkflows } = useWorkflowStore.getState()
fetchWorkflows().then(() => {
  console.log('Store after fetch:', useWorkflowStore.getState())
})
```

**Possible Causes:**

- Network request failing silently
- Data transformation error in store
- Store not triggering re-renders

#### 2. **Component Not Re-rendering**

**Symptom:** Store has data but component doesn't update

**Debug:** Add to WorkflowList component:

```tsx
useEffect(() => {
  console.log('[WorkflowList] Render with workflows:', workflows.length)
}, [workflows])
```

**Possible Causes:**

- Zustand selector not triggering updates
- Component unmounting/remounting
- React strict mode double-rendering issues

#### 3. **Filtering Logic Hiding Workflows**

**Symptom:** Store has workflows but they're filtered out

**Debug:** Check workflow statuses:

```javascript
const workflows = useWorkflowStore.getState().workflowList
console.log(
  'Workflow statuses:',
  workflows.map((w) => ({
    id: w.threadId,
    status: w.status,
    stepsCount: w.steps.length,
  }))
)
```

**Possible Causes:**

- All workflows have unexpected status values
- Filtering logic is too restrictive
- Data format mismatch

#### 4. **SSE Connection Issues**

**Symptom:** Initial data loads but updates don't come through

**Debug:**

```javascript
// Check SSE connection
const eventSource = new EventSource('/api/invoke-status/events')
eventSource.onmessage = (event) => {
  console.log('SSE Event:', event.data)
}
eventSource.onerror = (error) => {
  console.log('SSE Error:', error)
}
```

#### 5. **Data Format Mismatch**

**Symptom:** API returns data but store transformation fails

**Common Issues:**

- `lastUpdate` field format issues
- Missing required fields
- Unexpected data types

### Step-by-Step Debugging Process

1. **Verify API Data:**

   ```javascript
   fetch('/api/invoke-status/workflows')
     .then((r) => r.json())
     .then((data) => {
       console.log('Raw API data:', data)
       console.log('Workflows count:', data.workflows?.length || 0)
       if (data.workflows?.[0]) {
         console.log('First workflow structure:', Object.keys(data.workflows[0]))
       }
     })
   ```

2. **Check Store Update:**

   ```javascript
   const { fetchWorkflows } = useWorkflowStore.getState()
   console.log('Before fetch:', useWorkflowStore.getState().workflowList.length)
   await fetchWorkflows()
   console.log('After fetch:', useWorkflowStore.getState().workflowList.length)
   ```

3. **Monitor Component Renders:**
   Add debug logging to WorkflowList component:

   ```tsx
   console.log('[WorkflowList] Rendering with:', {
     workflowsLength: workflows.length,
     allWorkflowsLength: allWorkflows.length,
     activeCount: activeWorkflows.length,
     completedCount: completedWorkflows.length,
   })
   ```

4. **Test Store Subscription:**
   ```javascript
   const unsubscribe = useWorkflowStore.subscribe((state) => {
     console.log('Store updated:', state.workflowList.length, 'workflows')
   })
   // Remember to call unsubscribe() when done testing
   ```

### Quick Fixes to Try

1. **Force Re-render:**

   ```tsx
   const [, forceUpdate] = useReducer((x) => x + 1, 0)
   // Add button: <button onClick={forceUpdate}>Force Update</button>
   ```

2. **Bypass Memoization:**

   ```tsx
   // Temporarily remove useMemo to see if it's causing issues
   const activeWorkflows = workflows.filter((w) => w.status === 'running')
   const completedWorkflows = workflows.filter((w) => w.status !== 'running')
   const allWorkflows = [...activeWorkflows, ...completedWorkflows]
   ```

3. **Add Debugging to Original Component:**
   Replace the workflows selector with:
   ```tsx
   const workflows = useWorkflowStore((state) => {
     console.log('[WorkflowList] Store selector called:', {
       workflowsObject: Object.keys(state.workflows).length,
       workflowList: state.workflowList.length,
     })
     return state.workflowList
   })
   ```

### Expected Data Structure

Verify your workflow data matches this structure:

```typescript
interface WorkflowInfo {
  threadId: string
  status: 'running' | 'completed' | 'failed' | 'aborted'
  startedBy: string
  invocation: string
  projectId: string
  projectName?: string
  currentStep?: string
  steps: WorkflowStep[]
  lastUpdate: string // ISO date string
  sessionIds: Record<string, string>
}
```

### Browser Console Test Commands

Run these in your browser console to diagnose:

```javascript
// Complete diagnostic
console.log('=== WORKFLOW DEBUG ===')
console.log('1. Store state:', useWorkflowStore.getState())
console.log('2. API test:')
fetch('/api/invoke-status/workflows')
  .then((r) => r.json())
  .then(console.log)
console.log('3. SSE test:')
const es = new EventSource('/api/invoke-status/events')
es.onmessage = (e) => console.log('SSE:', e.data)
setTimeout(() => es.close(), 5000)
```
