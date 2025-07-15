# Workflow Persistence Testing Guide

## 🎯 Overview

This document outlines the comprehensive testing strategy for the workflow persistence fix, covering auto-save, conflict resolution, and offline scenarios.

## 🏗️ Test Environment Setup

### Prerequisites

```bash
# Install testing dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom
npm install --save-dev msw cypress
npm install --save-dev @types/testing-library__jest-dom
```

### Mock Service Worker (MSW) Configuration

```typescript
// src/mocks/handlers.ts
import { rest } from 'msw'

export const handlers = [
  // Workflow save endpoint
  rest.post('/api/workflows/saved', (req, res, ctx) => {
    return res(
      ctx.delay(100), // Simulate network delay
      ctx.json({ success: true, version: '1.0.1' })
    )
  }),

  // Workflow load endpoint
  rest.get('/api/workflows/saved/:id', (req, res, ctx) => {
    return res(
      ctx.json({
        workflow: {
          id: req.params.id,
          name: 'Test Workflow',
          definition: {
            /* mock workflow data */
          },
        },
      })
    )
  }),

  // Conflict simulation
  rest.post('/api/workflows/saved', (req, res, ctx) => {
    return res(
      ctx.status(409), // Conflict
      ctx.json({
        error: 'Conflict detected',
        conflictData: {
          local: {
            /* local version */
          },
          remote: {
            /* server version */
          },
        },
      })
    )
  }),
]
```

### Cypress Configuration

```typescript
// cypress.config.ts
import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3457',
    setupNodeEvents(on, config) {
      // Network control for offline testing
      on('task', {
        setOffline: () => {
          // Simulate offline mode
          return null
        },
        setOnline: () => {
          // Restore online mode
          return null
        },
      })
    },
  },
})
```

## 🧪 Test Categories

### 1. Unit Tests (Jest + React Testing Library)

#### Auto-Save Hook Tests

```typescript
// src/hooks/__tests__/useAutoSave.test.ts
describe('useAutoSave', () => {
  it('should debounce saves to localStorage', async () => {
    // Test debounced local storage saves
  })

  it('should handle save errors gracefully', async () => {
    // Test error handling
  })

  it('should queue saves when offline', async () => {
    // Test offline queuing
  })
})
```

#### Conflict Resolution Tests

```typescript
// src/hooks/__tests__/useConflictResolver.test.ts
describe('useConflictResolver', () => {
  it('should detect version conflicts', () => {
    // Test conflict detection logic
  })

  it('should merge changes correctly', () => {
    // Test merge strategies
  })
})
```

### 2. Integration Tests (MSW)

#### Network Failure Scenarios

```typescript
// src/lib/workflow-sync/__tests__/syncManager.test.ts
describe('SyncManager', () => {
  it('should retry failed saves with exponential backoff', async () => {
    // Mock network failures and test retry logic
  })

  it('should handle partial saves correctly', async () => {
    // Test partial failure recovery
  })
})
```

#### Cache Invalidation Tests

```typescript
describe('Cache Invalidation', () => {
  it('should invalidate cache after successful save', async () => {
    // Test cache invalidation
  })

  it('should preserve cache during network failures', async () => {
    // Test cache preservation
  })
})
```

### 3. E2E Tests (Cypress)

#### Page Refresh Recovery

```typescript
// cypress/e2e/workflow-persistence.cy.ts
describe('Workflow Persistence', () => {
  it('should recover unsaved changes after page refresh', () => {
    cy.visit('/workflows/new')

    // Make changes to workflow
    cy.get('[data-testid="workflow-name"]').type('Test Workflow')
    cy.get('[data-testid="add-step"]').click()

    // Refresh page
    cy.reload()

    // Verify changes are recovered
    cy.get('[data-testid="workflow-name"]').should('have.value', 'Test Workflow')
    cy.get('[data-testid="step-1"]').should('exist')
  })
})
```

#### Offline/Online Transitions

```typescript
describe('Offline/Online Transitions', () => {
  it('should continue editing when offline', () => {
    cy.visit('/workflows/new')

    // Go offline
    cy.task('setOffline')

    // Make changes
    cy.get('[data-testid="workflow-name"]').type('Offline Edit')

    // Verify local save indicator
    cy.get('[data-testid="save-status"]').should('contain', 'Saved locally')

    // Go online
    cy.task('setOnline')

    // Verify sync
    cy.get('[data-testid="save-status"]').should('contain', 'Synced')
  })
})
```

## 📋 Critical Test Scenarios

### Scenario 1: Auto-Save Flow

**Test Steps:**

1. User opens workflow editor
2. User types in workflow name
3. Verify debounced save to localStorage (500ms)
4. Verify periodic sync to server (when online)
5. Verify save status indicators update correctly

**Expected Results:**

- ✅ Local save within 500ms of typing
- ✅ Server sync within 2s when online
- ✅ Clear save status indicators

### Scenario 2: Conflict Resolution

**Test Steps:**

1. User opens workflow A
2. Another user modifies workflow A on server
3. User saves workflow A
4. Verify conflict detection
5. User resolves conflict via UI
6. Verify successful merge

**Expected Results:**

- ✅ Conflict detected on save
- ✅ Clear conflict resolution UI
- ✅ Successful merge after resolution

### Scenario 3: Data Recovery

**Test Steps:**

1. User creates new workflow
2. User makes significant changes
3. User refreshes page (without saving)
4. Verify changes are recovered
5. Verify user can continue editing

**Expected Results:**

- ✅ All changes restored from localStorage
- ✅ Immediate restore (< 1s)
- ✅ Seamless editing continuation

### Scenario 4: Network Failures

**Test Steps:**

1. User creates workflow
2. Network goes offline
3. User continues editing
4. User attempts to save
5. Network comes back online
6. Verify queued saves are processed

**Expected Results:**

- ✅ Continued editing while offline
- ✅ Clear offline indicators
- ✅ Automatic sync when online

### Scenario 5: Race Conditions

**Test Steps:**

1. User makes rapid changes
2. Multiple auto-saves trigger
3. User manually saves
4. Verify no duplicate saves
5. Verify correct final state

**Expected Results:**

- ✅ No duplicate API calls
- ✅ Correct final state
- ✅ No data corruption

## 🔧 Test Utilities

### Mock Network Conditions

```typescript
// src/test-utils/networkMocks.ts
export const createNetworkMock = (delay: number = 0, shouldFail: boolean = false) => {
  return rest.post('/api/workflows/saved', (req, res, ctx) => {
    if (shouldFail) {
      return res(ctx.delay(delay), ctx.status(500), ctx.json({ error: 'Network error' }))
    }

    return res(ctx.delay(delay), ctx.json({ success: true, version: '1.0.1' }))
  })
}
```

### Local Storage Helpers

```typescript
// src/test-utils/storageHelpers.ts
export const mockLocalStorage = () => {
  const store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => (store[key] = value),
    removeItem: (key: string) => delete store[key],
    clear: () => Object.keys(store).forEach((key) => delete store[key]),
  }
}
```

### Conflict Simulation

```typescript
// src/test-utils/conflictSimulator.ts
export const createConflictScenario = (
  localVersion: WorkflowDefinition,
  remoteVersion: WorkflowDefinition
) => {
  return {
    local: localVersion,
    remote: remoteVersion,
    timestamp: new Date().toISOString(),
  }
}
```

## 📊 Performance Benchmarks

### Auto-Save Performance

- **Target**: < 100ms for local saves
- **Measurement**: Time from user input to localStorage update
- **Test**: Automated performance tests with large workflows

### Sync Performance

- **Target**: < 2s for server sync
- **Measurement**: Time from save trigger to server confirmation
- **Test**: Network simulation with various conditions

### Memory Usage

- **Target**: No memory leaks during long sessions
- **Measurement**: Memory usage over 1-hour editing session
- **Test**: Automated memory profiling

### Storage Efficiency

- **Target**: < 10MB local storage per workflow
- **Measurement**: localStorage size after various operations
- **Test**: Storage usage monitoring

## 🐛 Common Issues & Debugging

### Debug Checklist

1. **Auto-save not triggering**
   - Check debounce timing
   - Verify event listeners
   - Check localStorage permissions

2. **Conflicts not detected**
   - Verify version comparison logic
   - Check server-side conflict detection
   - Validate timestamp accuracy

3. **Data not recovering**
   - Check localStorage content
   - Verify serialization/deserialization
   - Check store rehydration

4. **Performance issues**
   - Profile debounce effectiveness
   - Check for memory leaks
   - Monitor API call frequency

### Debugging Tools

```typescript
// Enable debug logging
localStorage.setItem('debug-workflow-persistence', 'true')

// View auto-save queue
console.log(window.__workflowPersistence.autoSaveQueue)

// Monitor conflict resolution
console.log(window.__workflowPersistence.conflictHistory)
```

## 📈 Test Metrics

### Coverage Requirements

- **Unit Tests**: > 90% code coverage
- **Integration Tests**: All API endpoints covered
- **E2E Tests**: All user flows covered

### Success Criteria

- ✅ All tests pass consistently
- ✅ No flaky tests
- ✅ Performance benchmarks met
- ✅ Zero data loss scenarios

### Continuous Integration

```yaml
# .github/workflows/test.yml
name: Test Workflow Persistence
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit

      - name: Run integration tests
        run: npm run test:integration

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Performance benchmarks
        run: npm run test:performance
```

## 🔄 Test Execution Plan

### Phase 1: Unit Tests

1. Implement auto-save hook tests
2. Create conflict resolution tests
3. Add storage manager tests
4. Verify 90% coverage

### Phase 2: Integration Tests

1. Set up MSW for API mocking
2. Create network failure scenarios
3. Test cache invalidation
4. Verify error handling

### Phase 3: E2E Tests

1. Set up Cypress environment
2. Create user flow tests
3. Add offline/online scenarios
4. Test cross-browser compatibility

### Phase 4: Performance Tests

1. Set up performance monitoring
2. Create load testing scenarios
3. Memory leak detection
4. Storage efficiency tests

---

## ✅ Verification Requirements

**IMPORTANT**: Each test category must be verified working before marking complete:

1. ✅ **Unit Tests**: All tests pass, coverage > 90%
2. ✅ **Integration Tests**: All API scenarios covered
3. ✅ **E2E Tests**: All user flows working in browser
4. ✅ **Performance Tests**: All benchmarks met
5. ✅ **Manual Testing**: Human verification of critical scenarios

**Test Status Legend**:

- ⏳ **Pending**: Test not implemented
- 🔄 **In Progress**: Test being written
- ✅ **Passing**: Test implemented and verified
- ❌ **Failing**: Test needs attention
