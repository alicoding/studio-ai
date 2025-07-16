# 🧹 Studio AI Open Source Cleanup Audit

Generated: July 16, 2025

## 🗑️ STALE FILES TO REMOVE

### Backup/Temporary Files

- `web/server/api/settings.ts.backup` - Old backup file, safe to remove

### Compiled TypeScript Files (Should be in .gitignore)

**Generated files that shouldn't be committed:**

- `web/server/schemas/workflow-builder.d.ts`
- `web/server/schemas/workflow-builder.d.ts.map`
- `web/server/schemas/workflow-builder.js`
- `web/server/schemas/workflow-builder.js.map`
- `web/server/services/StudioProjectService.d.ts`
- `web/server/services/StudioProjectService.d.ts.map`
- `web/server/services/StudioProjectService.js`
- `web/server/services/StudioProjectService.js.map`
- `web/server/services/UnifiedAgentConfigService.d.ts`
- `web/server/services/UnifiedAgentConfigService.d.ts.map`
- `web/server/services/UnifiedAgentConfigService.js`
- `web/server/services/UnifiedAgentConfigService.js.map`

### Deprecated Code (Marked for Removal)

- `web/server/services/BatchExecutor.ts` - **DEPRECATED** service, marked for removal
- Associated endpoints: `/api/messages` and `/api/messages/batch`

## 🔍 UNINTEGRATED/QUESTIONABLE FILES

### Empty Examples (Need Content or Removal)

- `examples/approval-workflows/` - Directory exists but is completely empty
- `examples/testing-automation/` - Directory exists but is completely empty

### Multiple Test Directories (Potential Consolidation)

**Frontend Test Locations:**

- `src/__tests__/` - Main frontend tests
- `src/test/` - Additional test setup (contains setup.ts)
- `tests/` - Playwright E2E tests

**Backend Test Locations:**

- `web/server/api/__tests__/` - API tests
- `web/server/services/__tests__/` - Service tests
- `web/server/services/executors/__tests__/` - Executor tests
- `web/server/test/` - Integration tests
- `web/server/tests/` - Additional tests

**Recommendation:** Consider if `src/test/` and `web/server/test/` vs `web/server/tests/` can be consolidated.

### Documentation Structure (Potential Duplication)

- `docs/testing/` - Testing documentation
- `tests/` - Actual test files
- Multiple similar docs in `docs/` that might be duplicates

## 🚨 CRITICAL FINDINGS

### 1. Large Compiled Files in Git

The `playwright-report/index.html` contains generated React code and is **2.9MB**. This shouldn't be in version control.

### 2. Potential Playwright Report Inclusion

- `playwright-report/` directory should be in `.gitignore`
- Contains generated test reports

### 3. Package Name Still References Claude

- `package.json` updated to "studio-ai" ✅
- Need to check for remaining "studio-ai" references in other files

## 📋 RECOMMENDATIONS

### Immediate Actions:

1. **Remove compiled TypeScript files** - Add to .gitignore
2. **Remove backup files** - Clean up .backup files
3. **Remove deprecated BatchExecutor** - After confirming endpoints aren't used
4. **Complete empty examples** - Add content or remove directories
5. **Add playwright-report to .gitignore**

### Medium Priority:

1. **Consolidate test directories** - Decide on structure
2. **Review documentation** - Remove duplicates
3. **Complete remaining renames** - Search for "studio-ai" references

### Low Priority:

1. **Optimize file structure** - Consider if current organization is optimal

## 🔍 NEXT STEPS

1. Remove the identified stale files
2. Update .gitignore to prevent future compiled file commits
3. Complete the empty example directories
4. Do final search for remaining "Studio AI" references
5. Test Docker build to ensure no missing dependencies

## ⚠️ BEFORE REMOVING

**ALWAYS VERIFY** these files aren't actively used:

- BatchExecutor.ts and its endpoints
- Empty example directories (check if referenced in documentation)
- Test directory consolidation (ensure no tests are lost)

---

_This audit ensures Studio AI is clean and professional for open source release._
