# Dependencies Analysis - Removal Safety Assessment

## Summary
After comprehensive search, **only html2canvas can be safely removed**. The other dependencies are actively used.

## Detailed Findings

### 1. XTerm Dependencies ❌ **DO NOT REMOVE**

**Dependencies:**
- `@xterm/xterm` (v5.5.0)
- `@xterm/addon-fit` (v0.10.0)  
- `@xterm/addon-web-links` (v0.11.0)

**Status:** ✅ **ACTIVELY USED**

**Evidence:**
- **`src/components/terminal/Terminal.tsx`**: Complete terminal implementation
  - Lines 2-5: Imports all xterm dependencies
  - Lines 21-60: Creates XTerm instance with theme, addons, event handlers
  - Lines 91-95: Exports `writeToTerminal` utility function

- **`src/components/projects/views/DevelopView.tsx`**: 
  - Line 2: Imports Terminal component
  - Uses Terminal in development workspace view

- **`src/routes/index.tsx`**:
  - Line 35: Imports DevelopView  
  - Lines 415-423: Renders DevelopView when `layout.isDevelopView` is true

- **`src/hooks/useWorkspaceLayout.ts`**:
  - Line 13: Defines 'develop' as valid ViewMode
  - Line 70: `isDevelopView` boolean check
  - Feature is accessible via ViewControls in main UI

**Impact:** Terminal is a core feature of the develop workspace mode.

### 2. html2canvas Dependencies ✅ **SAFE TO REMOVE**

**Dependencies:**
- `html2canvas` (v1.4.1)
- `@types/html2canvas` (v0.5.35)

**Status:** ❌ **UNUSED** 

**Evidence:**
- Only mentioned in package.json and documentation
- No imports found in any TypeScript/React files
- No usage in actual application code
- Likely leftover from planned screenshot/export feature that was never implemented

**Action:** Safe to remove both dependencies

### 3. Playwright Dependencies ❌ **DO NOT REMOVE** 

**Dependencies:**
- `@playwright/test` (v1.53.1) - devDependency

**Status:** ✅ **ACTIVELY USED FOR TESTING**

**Evidence:**
- **`tests/ui-check.spec.ts`**: Complete test suite
  - Lines 1-85: UI tests for home, agents, teams pages
  - Screenshot generation, modal testing, console error checking
  - 5 comprehensive test cases

- **`playwright.config.ts`**: 
  - Lines 1-25: Full Playwright configuration
  - Test directory, browser setup, web server integration
  - Configured for CI/CD with retries and parallel execution

- **Testing Infrastructure:**
  - `playwright-report/` directory exists with generated reports
  - Integration with npm scripts for automated testing
  - Part of quality assurance workflow

**Impact:** Removing would break testing infrastructure.

## Architecture Alignment

### SOLID Principles
- **Single Responsibility**: Each dependency serves one clear purpose
- **Dependencies** correctly separated (testing vs runtime)

### DRY/KISS
- No duplicate terminal implementations
- Simple, focused dependency usage

### Library-First
- ✅ Using established libraries (xterm.js, Playwright) instead of custom solutions
- ❌ html2canvas unused - violates library-first principle by including unused code

## Recommended Actions

### 1. Remove html2canvas (Safe)
```bash
npm uninstall html2canvas @types/html2canvas
```

### 2. Keep xterm (Required)
- Terminal is core development workspace feature
- Fully integrated with UI layout system
- Would break develop mode if removed

### 3. Keep Playwright (Required) 
- Essential for testing infrastructure
- DevDependency - doesn't affect bundle size
- Supports CI/CD and quality assurance

## Bundle Impact
- **Removing html2canvas**: Reduces bundle size (~500KB)
- **Keeping xterm**: Required for functionality (~800KB)
- **Keeping Playwright**: No runtime impact (devDependency)

## Verification Steps
1. Remove only html2canvas dependencies
2. Run `npm run build` - should succeed
3. Run `npm run type-check` - should pass
4. Test develop workspace mode - should work
5. Run `npm test` (if Playwright tests exist) - should pass