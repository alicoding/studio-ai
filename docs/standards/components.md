# Component Patterns

## Modal Standard

```typescript
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  onSave?: (data: T) => Promise<void>
  loading?: boolean
}
```

## Form Reset Pattern

```typescript
const handleClose = () => {
  setName('')
  setEmail('')
  onClose()
}
```

## Memoization

```typescript
const memoizedData = useMemo(() => data, [data])
const handleClick = useCallback((id: string) => onClick(id), [onClick])
```
