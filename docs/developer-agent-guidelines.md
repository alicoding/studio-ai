# Developer Agent Guidelines for Claude Studio

## Mandatory Development Principles

### Core Principles (MUST follow)

- **SOLID**: Apply all five principles in every implementation
- **DRY**: Never duplicate code - centralize common logic immediately
- **KISS**: Choose the simplest solution that works
- **Library-First**: Always use existing libraries before custom implementations

### TypeScript Requirements

- **NO 'any' types** - Use proper TypeScript types
- Define interfaces for all data structures
- Use type inference where appropriate
- Strict mode must be enabled

## Project-Specific Patterns

### API Communication

- Use `ky` for HTTP requests, NOT fetch
- Example:
  ```typescript
  import ky from 'ky'
  const response = await ky.post('/api/endpoint', { json: data })
  ```

### State Management

- Use Zustand for global state
- Create focused stores in `src/stores/`
- Use React hooks for local component state

### Component Structure

- Keep components under 200 lines
- Place reusable UI in `src/components/ui/`
- Organize features by domain

### File Organization

```
src/
├── components/     # React components
├── hooks/         # Custom React hooks
├── stores/        # Zustand stores
├── services/      # API client services
└── routes/        # TanStack Router pages

web/server/
├── api/           # Express API endpoints
├── services/      # Business logic
└── mcp/           # MCP integrations
```

## Development Workflow

### Before Starting

1. Check existing patterns in codebase
2. Search for similar implementations
3. Verify no duplicate functionality exists

### During Development

1. Write TypeScript interfaces first
2. Implement with proper error handling
3. Add JSDoc comments for complex logic
4. Keep functions focused and testable

### Before Completion

1. Run `npm run lint` - Must pass
2. Run `npm run typecheck` - Must pass
3. Test all edge cases manually
4. Verify no console errors

## API Development

### Endpoint Structure

```typescript
// web/server/api/example.ts
export const exampleRouter = Router()

exampleRouter.post('/action', async (req, res) => {
  try {
    // Validate input
    const validated = schema.parse(req.body)

    // Business logic in service
    const result = await exampleService.process(validated)

    res.json({ success: true, data: result })
  } catch (error) {
    handleError(error, res)
  }
})
```

### Service Layer

- Keep business logic in `web/server/services/`
- Services should be framework-agnostic
- Use dependency injection for testability

## UI Development

### Component Guidelines

```typescript
// Use proper TypeScript interfaces
interface Props {
  data: DataType
  onAction: (id: string) => void
}

// Functional components with hooks
export function Component({ data, onAction }: Props) {
  // Local state with useState
  // Global state with Zustand hooks
  // Side effects with useEffect

  return <div>...</div>
}
```

### Styling

- Use Tailwind CSS classes
- Follow existing color schemes
- Maintain consistent spacing

## Common Pitfalls to Avoid

1. **Creating new files unnecessarily** - Edit existing files when possible
2. **Ignoring TypeScript errors** - Fix them, don't suppress
3. **Skipping validation** - Always run lint and typecheck
4. **Duplicating logic** - Extract to shared utilities
5. **Using 'any' type** - Define proper interfaces
6. **Complex solutions** - Keep it simple (KISS)

## Testing Requirements

- Write integration tests for API endpoints
- Test error cases and edge conditions
- Manually verify UI changes
- Check browser console for errors

## Final Checklist

- [ ] No TypeScript errors
- [ ] No lint errors
- [ ] No duplicate code
- [ ] Used existing libraries
- [ ] Followed SOLID principles
- [ ] Components under 200 lines
- [ ] Proper error handling
- [ ] Manual testing complete
