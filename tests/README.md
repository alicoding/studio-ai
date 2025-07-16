# Playwright E2E Tests for Studio AI

This directory contains comprehensive end-to-end tests for Studio AI, with a focus on conditional workflow functionality.

## Test Structure

### Files

- `conditional-workflow.spec.ts` - Main conditional workflow test suite
- `utils/test-helpers.ts` - Reusable test utilities and page object models
- `conditional-workflow.config.ts` - Test configuration and constants
- `ui-check.spec.ts` - Basic UI validation tests

### Test Coverage

The conditional workflow tests cover:

1. **Workflow Creation**
   - Creating conditional workflows in the UI
   - Adding conditional nodes with expressions
   - Connecting true/false branches
   - Setting task node details

2. **Workflow Execution**
   - True branch execution scenarios
   - False branch execution scenarios
   - Template variable resolution
   - Complex multi-conditional workflows

3. **UI State Management**
   - Workflow persistence after page reload
   - Condition expression validation
   - Edge connection maintenance
   - Error handling for invalid conditions

4. **Performance Testing**
   - Mock AI execution performance
   - Workflow completion timing
   - Resource usage validation

## Prerequisites

### Environment Setup

1. **Servers Running**

   ```bash
   npm run env:start
   ```

   This starts both stable (3456) and dev (3457) servers.

2. **Mock Mode Enabled**
   Ensure `.env` contains:

   ```
   USE_MOCK_AI=true
   ```

3. **Dependencies Installed**
   ```bash
   npm install
   ```

### Project State

- At least one agent configuration should exist
- Development environment should be accessible
- No critical console errors in the UI

## Running Tests

### Run All E2E Tests

```bash
npx playwright test
```

### Run Conditional Workflow Tests Only

```bash
npx playwright test conditional-workflow.spec.ts
```

### Run with UI (Headed Mode)

```bash
npx playwright test --headed
```

### Run with Debug Mode

```bash
npx playwright test --debug
```

### Generate Test Report

```bash
npx playwright show-report
```

## Test Configuration

### Timeouts

- Individual test timeout: 60 seconds
- Workflow execution timeout: 30 seconds
- Page load timeout: 10 seconds

### Mock AI Mode

Tests are designed to run with `USE_MOCK_AI=true` for:

- Consistent, predictable results
- Fast execution without API costs
- Reliable test automation

### Performance Expectations

- Mock workflows should complete within 15 seconds
- Page loads should complete within 5 seconds
- No memory leaks or console errors

## Test Scenarios

### 1. True Branch Execution

Tests that conditional workflows correctly execute the true branch when conditions are met.

**Scenario:**

1. Create workflow with condition `{step1.output} === "success"`
2. First step returns "success"
3. Verify true branch executes, false branch skips

### 2. False Branch Execution

Tests that conditional workflows correctly execute the false branch when conditions are not met.

**Scenario:**

1. Create workflow with condition `{step1.output} === "success"`
2. First step returns "failure"
3. Verify false branch executes, true branch skips

### 3. State Persistence

Tests that workflow definitions persist correctly across page reloads.

**Scenario:**

1. Create conditional workflow
2. Save workflow
3. Reload page
4. Verify conditions and connections maintained

### 4. Template Variable Resolution

Tests complex template variable expressions in conditions.

**Scenario:**

1. Create multi-step workflow
2. Use conditions with multiple variables
3. Verify template resolution works correctly

### 5. Error Handling

Tests validation and error handling for invalid conditions.

**Scenario:**

1. Enter invalid JavaScript condition
2. Verify validation error appears
3. Fix condition and verify save succeeds

### 6. Complex Workflows

Tests workflows with multiple conditional branches and dependencies.

**Scenario:**

1. Create workflow with multiple conditions
2. Verify complex branching logic
3. Test persistence and editability

## Debugging Failed Tests

### Screenshots

Failed tests automatically capture screenshots in `tests/screenshots/`.

### Console Logs

Tests monitor console errors and report them in failure messages.

### Debug Mode

Run with `--debug` flag to step through tests interactively:

```bash
npx playwright test conditional-workflow.spec.ts --debug
```

### Manual Debugging

1. Start servers: `npm run env:start`
2. Open browser to `http://localhost:5175`
3. Navigate to `/workflows/new`
4. Manually test workflow creation and execution

## Known Issues and Workarounds

### Timing Issues

- Some tests may be flaky due to async operations
- Increase timeouts if needed for slower environments
- Use `waitForSelector` with generous timeouts

### Mock AI Responses

- Mock responses are deterministic but simplified
- Complex workflows may need custom mock scenarios
- Check `USE_MOCK_AI=true` is set in environment

### Element Selectors

- Tests use data-testid attributes where possible
- Some selectors may need updates if UI changes
- Verify element presence before interactions

## Contributing

### Adding New Tests

1. Follow existing test patterns in `conditional-workflow.spec.ts`
2. Use utilities from `test-helpers.ts`
3. Add new test data to `WorkflowTestDataFactory`
4. Ensure proper TypeScript typing (no `any` types)

### Test Utilities

- Add reusable functions to `test-helpers.ts`
- Follow SOLID/DRY/KISS principles
- Use TypeScript interfaces for type safety

### Performance Tests

- Use `PerformanceTestUtils` for timing measurements
- Set reasonable expectations for mock mode
- Test both success and failure scenarios

## Continuous Integration

These tests are designed to run in CI environments:

- Use headless mode by default
- Generate HTML reports
- Capture screenshots on failure
- Retry flaky tests automatically

For CI setup, ensure:

- Mock mode is enabled
- Servers start before tests
- Test artifacts are collected
- Proper timeout configuration
