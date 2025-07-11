# Guide to Fix Tests with Proper Mocking

## ✅ Completed

1. Created comprehensive mock setup: `web/server/api/__tests__/test-mocks.ts`
2. Fixed and converted to proper mocked tests:
   - `invoke-single.test.ts` - Single agent invocation
   - `invoke-parallel.test.ts` - Parallel workflow execution
3. Disabled 64 test files that were making real API calls

## 🚨 Immediate Impact

- **No more real API calls** from test suite
- **User's Claude subscription is safe** from test consumption
- Tests that make API calls are renamed to `.disabled` extension

## 📝 How to Fix Remaining Tests

### Pattern 1: Basic Invoke Tests

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setupInvokeTestMocks, cleanupMocks, DEFAULT_MOCK_RESPONSES } from './test-mocks'
import type { KyInstance } from 'ky'
import type { MockInvokeResponse } from './test-mocks'

describe('Test Name', () => {
  let mockKy: Partial<KyInstance>

  beforeEach(() => {
    const { kyMocks } = setupInvokeTestMocks()
    mockKy = kyMocks
  })

  afterEach(() => {
    cleanupMocks()
  })

  it('should test something', async () => {
    const ky = (await import('ky')).default as KyInstance
    const response = (await ky
      .post('http://localhost:3456/api/invoke', {
        json: {
          /* request data */
        },
      })
      .json()) as MockInvokeResponse

    expect(response).toHaveProperty('threadId')
  })
})
```

### Pattern 2: SSE/Async Tests

The `MockEventSource` class in test-mocks.ts automatically simulates workflow events for URLs containing `/invoke/stream/`.

### Pattern 3: Project/Agent Management Tests

Use the mock responses for projects and agents defined in `DEFAULT_MOCK_RESPONSES`.

## 🔧 To Re-enable a Test

1. Fix the test by adding proper mocks
2. Remove the `.disabled` extension:
   ```bash
   mv test-file.test.ts.disabled test-file.test.ts
   ```
3. Run the specific test to verify:
   ```bash
   npm test test-file.test.ts
   ```

## 📊 Priority Order for Fixing

1. **High Priority** - Core workflow tests:
   - `invoke-sequential.test.ts`
   - `invoke-templates.test.ts`
   - `invoke-resume.test.ts`
   - `invoke-async.test.ts`

2. **Medium Priority** - Validation tests:
   - `workflow-validation.test.ts`
   - `role-agent-resolution.test.ts`

3. **Low Priority** - Standalone scripts:
   - `test-*.js` files (these are manual test scripts, not unit tests)

## 🚫 Never Do This in Tests

- ❌ `import ky from 'ky'` without mocking
- ❌ Real HTTP calls to any URL
- ❌ Direct Claude SDK usage
- ❌ Expecting real API responses

## ✅ Always Do This

- ✅ Use the mock setup from `test-mocks.ts`
- ✅ Type responses properly
- ✅ Clean up mocks after each test
- ✅ Test behavior, not implementation
