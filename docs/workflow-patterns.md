# Workflow Patterns - Orchestration Success Guide

## Lint/Type Error Cleanup Pattern

Based on the lint analysis, we have **24 TypeScript 'any' type errors** and **5 React Hook warnings** that must be fixed.

### Pattern: Sequential Error Cleanup

```javascript
// Pattern for systematic error cleanup
{
  "workflow": [
    {
      "id": "analyze",
      "role": "dev",
      "task": "Run npm run lint and identify all TypeScript 'any' type errors. List each file and line number."
    },
    {
      "id": "fix-batch-1",
      "role": "dev",
      "task": "Fix 'any' type errors in these files: src/lib/ai/types.ts, src/lib/librechat/types.ts, src/lib/storage/client.ts. Replace 'any' with proper TypeScript types.",
      "deps": ["analyze"]
    },
    {
      "id": "fix-batch-2",
      "role": "dev",
      "task": "Fix 'any' type errors in these files: src/routes/projects/$projectId.tsx, src/routes/storage.tsx, src/services/UnifiedProjectService.ts. Use proper TypeScript interfaces.",
      "deps": ["analyze"]
    },
    {
      "id": "review-fixes",
      "role": "reviewer",
      "task": "Review the TypeScript fixes from {fix-batch-1.output} and {fix-batch-2.output}. Verify proper types are used and no 'any' remains. Run npm run typecheck to validate.",
      "deps": ["fix-batch-1", "fix-batch-2"]
    }
  ]
}
```

## Error Priority Matrix

### Critical (Must Fix First)

1. **TypeScript 'any' errors** - 24 errors violating mandatory principles
2. **Missing required lint fixes** - Blocks git commits

### High Priority

3. **React Hook warnings** - 5 warnings affecting code quality
4. **Fast refresh warnings** - 2 component export issues

### Files Requiring Immediate Attention

#### Batch 1: Core Types (High Impact)

- `src/lib/ai/types.ts` (1 error)
- `src/lib/librechat/types.ts` (4 errors)
- `src/lib/storage/client.ts` (1 error)

#### Batch 2: Routes & Services (Medium Impact)

- `src/routes/projects/$projectId.tsx` (1 error)
- `src/routes/storage.tsx` (1 error)
- `src/services/UnifiedProjectService.ts` (1 error)

#### Batch 3: API & Commands (Lower Impact)

- `src/services/api/agents.ts` (2 errors)
- `src/services/api/teams.ts` (3 errors)
- `src/services/commands/CleanupCommand.ts` (1 error)
- `src/services/commands/TeamCommand.ts` (1 error)

#### Batch 4: Stores & Hooks (Isolated Impact)

- `src/stores/agents.ts` (1 error)
- `src/stores/createPersistentStore.ts` (1 error)
- `src/types/hooks.ts` (4 errors)

## Atomic Task Templates

### Type Fix Template

```
"Fix TypeScript 'any' type error in {FILE} at line {LINE}. Replace with proper interface/type definition following existing codebase patterns. Ensure no functionality is lost."
```

### Review Template

```
"Review TypeScript fixes in {FILES}. Verify: 1) No 'any' types remain, 2) Proper interfaces used, 3) Code compiles without errors, 4) Follows SOLID principles."
```

### Validation Template

```
"Run `npm run lint` and `npm run typecheck` to verify all fixes. Report any remaining errors or confirm zero errors achieved."
```

## Success Metrics

### Before Starting

- 24 TypeScript errors
- 5 React Hook warnings
- Git commits blocked

### Target Achievement

- 0 TypeScript errors
- 0 lint warnings
- Clean git commits enabled
- All code follows SOLID/DRY/KISS principles

## Next Steps for Orchestrator

1. **Create reviewer role** ✅ DONE
2. **Test API coordination** ✅ DONE - Working
3. **Begin systematic error cleanup** 🔄 READY TO START
4. **Document process** ✅ DONE

Ready to proceed with coordinated error cleanup using proven workflow patterns.
