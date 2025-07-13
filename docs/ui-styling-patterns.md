# UI Styling Patterns and Best Practices

## Overview
This document outlines the established UI styling patterns in Claude Studio to ensure consistency and maintainability across all components.

## Core Principles

### 1. Component-Based Architecture
- **UI Primitives**: Located in `src/components/ui/` (Badge, Button, Card, etc.)
- **Feature Components**: Compose primitives, avoid inline styling
- **Styling Method**: Use `class-variance-authority` (cva) for variant management

### 2. The cn() Utility Pattern
Always use the `cn()` utility from `lib/utils` for combining classes:

```typescript
import { cn } from '../../lib/utils'

// Good - using cn()
<div className={cn(
  "base-classes",
  condition && "conditional-classes",
  variant === 'error' && "error-classes"
)}>

// Bad - string concatenation
<div className={`base-classes ${condition ? 'conditional-classes' : ''}`}>
```

### 3. Color and Theme Management

#### Design Tokens (CSS Variables)
```css
/* Defined in globals.css */
--background, --foreground
--card, --card-foreground
--primary, --primary-foreground
--secondary, --secondary-foreground
--muted, --muted-foreground
--accent, --accent-foreground
--destructive, --destructive-foreground
```

#### Semantic Color Usage
- **Backgrounds**: `bg-background`, `bg-card`, `bg-secondary`
- **Text**: `text-foreground`, `text-muted-foreground`
- **Borders**: `border`, `border-input`
- **Interactive**: `hover:bg-accent`, `hover:bg-secondary`

### 4. Component Variant Patterns

#### Using cva (class-variance-authority)
```typescript
// Example from Button component
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline: "border border-input bg-background hover:bg-accent",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-10 px-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)
```

### 5. Diagnostic/Error Display Patterns

#### Status Indicators
```typescript
// Good - using semantic classes and cn()
const diagnosticStyles = cva(
  "p-3 rounded border-l-4 text-sm",
  {
    variants: {
      type: {
        error: "border-l-destructive bg-destructive/10 text-destructive-foreground",
        warning: "border-l-warning bg-warning/10 text-warning-foreground",
        info: "border-l-info bg-info/10 text-info-foreground",
      }
    }
  }
)

// Usage
<div className={cn(diagnosticStyles({ type: diagnostic.type }))}>
```

#### List Components
```typescript
// Standard list item pattern
<div className={cn(
  "flex items-center gap-2 p-2 rounded-md",
  "hover:bg-accent hover:text-accent-foreground",
  "transition-colors cursor-pointer"
)}>
```

### 6. Dark Mode Support
- Always provide dark mode variants: `dark:bg-gray-800`, `dark:text-gray-200`
- Use opacity modifiers for subtle backgrounds: `bg-red-500/10 dark:bg-red-500/20`
- Test both light and dark modes

### 7. Typography Hierarchy
```typescript
// Consistent text sizing
"text-lg font-semibold"    // Headings
"text-sm"                   // Body text
"text-xs text-muted-foreground"  // Supporting text
"font-mono text-xs"         // Code/technical text
```

### 8. Interactive Elements
```typescript
// Button patterns
<Button variant="ghost" size="sm" className={cn(
  "h-8 px-2",
  // Additional styles only if necessary
)}>

// Hover states
"hover:bg-accent hover:text-accent-foreground"
"hover:bg-secondary"
"hover:border-primary"
```

## Anti-Patterns to Avoid

### 1. Inline Styling Overload
```typescript
// Bad - too many inline classes
<div className="p-3 rounded border-l-4 text-sm border-l-red-500 bg-red-50 dark:bg-red-950/20 text-red-900 dark:text-red-100">

// Good - use component variants or extract to const
const errorStyle = cn(
  "p-3 rounded border-l-4 text-sm",
  "border-l-destructive bg-destructive/10",
  "text-destructive-foreground"
)
```

### 2. Hardcoded Colors
```typescript
// Bad
className="text-red-600 bg-red-50"

// Good
className="text-destructive bg-destructive/10"
```

### 3. Inconsistent Spacing
```typescript
// Bad - mixing spacing units
className="p-2 mb-4 mt-3 mx-5"

// Good - consistent spacing scale
className="p-2 m-4" // or "p-2 mb-4"
```

## Component Examples

### Panel Component Pattern
```typescript
export function ExamplePanel() {
  return (
    <div className={cn(
      "rounded-lg border bg-card",
      "p-4 space-y-4"
    )}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Panel Title</h3>
        <Badge variant="outline">Status</Badge>
      </div>
      {/* Content */}
    </div>
  )
}
```

### List with Actions Pattern
```typescript
export function ItemList({ items }: { items: Item[] }) {
  return (
    <div className="space-y-2">
      {items.map(item => (
        <div
          key={item.id}
          className={cn(
            "flex items-center justify-between",
            "p-3 rounded-md border",
            "hover:bg-accent transition-colors"
          )}
        >
          <div className="flex-1">
            <p className="text-sm font-medium">{item.title}</p>
            <p className="text-xs text-muted-foreground">{item.description}</p>
          </div>
          <Button variant="ghost" size="sm">
            Action
          </Button>
        </div>
      ))}
    </div>
  )
}
```

## File Organization
```
src/
├── components/
│   ├── ui/              # Primitive components (Badge, Button, etc.)
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   └── ...
│   ├── workspace/       # Feature components
│   │   ├── DiagnosticPanel.tsx
│   │   └── ...
│   └── ...
├── lib/
│   └── utils.ts        # cn() utility and other helpers
└── styles/
    └── globals.css     # CSS variables and base styles
```

## Tailwind v4 Configuration
The project uses Tailwind v4 with the `@theme` directive for custom design tokens:

```css
@import "tailwindcss";
@theme {
  --color-background: #ffffff;
  --color-foreground: #000000;
  /* ... other tokens */
}
```

## Testing Checklist
- [ ] Component works in light mode
- [ ] Component works in dark mode
- [ ] Hover/focus states are visible
- [ ] Text has sufficient contrast
- [ ] Responsive behavior is correct
- [ ] No hardcoded colors
- [ ] Uses design tokens appropriately
- [ ] Follows established patterns

## References
- Tailwind CSS v4 Documentation
- class-variance-authority (cva) Documentation
- Radix UI Primitives (used as base for UI components)