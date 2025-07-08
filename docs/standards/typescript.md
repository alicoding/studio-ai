# TypeScript Rules

## NO 'any' Policy

```typescript
// ✅ Proper types
interface User {
  id: string
  name: string
}
type Status = 'pending' | 'done'

// ❌ Never use any
const data: any = response
```

## Common Patterns

```typescript
// Event handlers
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {}
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {}

// API responses
interface ApiResponse<T> {
  data: T
  status: 'success' | 'error'
}
```
