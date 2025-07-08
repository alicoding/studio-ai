# API Patterns

## HTTP Client

```typescript
// ✅ Always use ky
import ky from 'ky'
await ky.post('/api/endpoint', { json: data })

// ❌ Never use fetch
```

## Error Handling

```typescript
try {
  await ky.post('/api/endpoint', { json: data })
  await refetchData() // Refresh after success
} catch (error) {
  console.error('Operation failed:', error)
  alert('Operation failed. Please try again.')
}
```

## Path Expansion

```typescript
function expandPath(filePath: string): string {
  if (filePath.startsWith('~/')) {
    return path.join(os.homedir(), filePath.slice(2))
  }
  return filePath
}
```
