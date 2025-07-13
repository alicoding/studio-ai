# Studio Intelligence Hook System

Studio Intelligence provides smart default behaviors for Claude Studio through the native Claude Code hooks system. This document explains how to create and maintain hooks following DRY, SOLID, and KISS principles.

## Architecture Overview

Studio Intelligence hooks are:

- **Native Claude Code hooks** - Use the standard hooks system
- **System-wide defaults** - Installed in `~/.claude/settings.json`
- **Overridable** - Users can customize at project or local level
- **Library-First** - Use TypeScript API, not shell commands

## Hook Structure

### Base Hook Pattern (KISS)

All hooks follow this structure:

```javascript
#!/usr/bin/env node
// Studio Intelligence: [Hook Name]

// 1. Read input from stdin
let input = ''
process.stdin.on('data', (chunk) => (input += chunk))
process.stdin.on('end', () => {
  try {
    const hookData = JSON.parse(input)

    // 2. Early exit for irrelevant files
    if (!shouldProcess(hookData)) {
      process.exit(0)
    }

    // 3. Do the work
    const result = processHook(hookData)

    // 4. Handle output
    if (result.hasErrors) {
      console.error(result.message)
      process.exit(2) // Shows error to Claude
    }

    process.exit(0)
  } catch (error) {
    // Silent failure
    process.exit(0)
  }
})

// 5. Timeout protection
setTimeout(() => process.exit(0), 3000)
```

## Hook Types

### 1. TypeScript Checker (check-typescript.js)

- **Purpose**: Validate TypeScript on file save
- **Trigger**: PostToolUse on Write|Edit|MultiEdit
- **Library**: TypeScript Compiler API
- **Key Features**:
  - Per-file checking (fast)
  - Respects tsconfig.json
  - Shows errors to Claude

### 2. File Lock Manager (check-file-lock.js)

- **Purpose**: Warn about concurrent edits
- **Trigger**: PreToolUse on Write|Edit|MultiEdit
- **Library**: fs (native)
- **Key Features**:
  - Creates lock files
  - Auto-expires after 5 minutes
  - Non-blocking warnings

### 3. Mention Router (check-mentions.js)

- **Purpose**: Route @mentions between agents
- **Trigger**: Stop event
- **Library**: fs (native)
- **Key Features**:
  - Intercepts @mentions
  - Creates routing files
  - Returns block decision

## Creating New Hooks (DRY)

### 1. Use the Hook Factory Pattern

```javascript
// hook-factory.js
const createHook = (config) => {
  return `#!/usr/bin/env node
// Studio Intelligence: ${config.name}
${config.imports.map((i) => `const ${i.name} = require('${i.module}');`).join('\n')}

let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const hookData = JSON.parse(input);
    ${config.processor}
  } catch (error) {
    process.exit(0);
  }
});

setTimeout(() => process.exit(0), ${config.timeout || 3000});`
}
```

### 2. Hook Configuration (SOLID)

Each hook should have a single responsibility:

```javascript
// hooks/typescript/config.js
module.exports = {
  name: 'TypeScript Checker',
  event: 'PostToolUse',
  matcher: 'Write|Edit|MultiEdit',
  filePattern: /\.(ts|tsx)$/,
  skipPatterns: ['.d.ts', 'node_modules', '/dist/', '/build/'],
  timeout: 2000,
  dependencies: ['typescript'],
}
```

### 3. Shared Utilities (DRY)

```javascript
// utils/hook-utils.js
const getFilePath = (hookData) => {
  return (
    hookData.tool_input?.file_path || hookData.tool_input?.path || hookData.tool_input?.filePath
  )
}

const shouldSkipFile = (filePath, patterns) => {
  return patterns.some((pattern) =>
    pattern instanceof RegExp ? pattern.test(filePath) : filePath.includes(pattern)
  )
}

module.exports = { getFilePath, shouldSkipFile }
```

## Installation Process

1. **On Studio Startup**:

   ```javascript
   // StudioIntelligence.ts
   async ensureDefaultHooks() {
     // Check dependencies
     await this.ensureDependencies();

     // Only install if no hooks exist
     if (!hasExistingHooks()) {
       await this.installDefaultHooks();
     }
   }
   ```

2. **Dependency Management**:
   ```javascript
   private async ensureDependencies() {
     const required = ['typescript', 'eslint'];
     for (const dep of required) {
       if (!isInstalled(dep)) {
         await installGlobally(dep);
       }
     }
   }
   ```

## Hook Communication

### Input Format

```typescript
interface HookInput {
  session_id: string
  transcript_path: string
  tool_name: string
  tool_input: Record<string, any>
  tool_response?: Record<string, any> // PostToolUse only
}
```

### Output Options

1. **Exit Codes**:
   - `0`: Success (silent)
   - `2`: Show error to Claude
   - Other: Show to user only

2. **JSON Output** (Advanced):
   ```json
   {
     "decision": "block",
     "reason": "TypeScript errors found",
     "continue": true,
     "suppressOutput": false
   }
   ```

## Best Practices

### KISS (Keep It Simple)

- One hook = one responsibility
- Exit early for irrelevant files
- Silent failure is better than crashes
- Use timeouts to prevent hangs

### DRY (Don't Repeat Yourself)

- Share utilities between hooks
- Use configuration objects
- Create factory functions
- Centralize dependency checks

### SOLID (Single Responsibility)

- TypeScript hook only checks TypeScript
- File lock only manages locks
- Each hook is independent

### Library-First

- Use TypeScript API, not `tsc` command
- Use ESLint API, not `eslint` command
- Use native fs, not shell commands
- Require dependencies properly

## Testing Hooks

```javascript
// test-hook.js
const { spawn } = require('child_process')

const testHook = (hookPath, input) => {
  const hook = spawn('node', [hookPath])

  hook.stdin.write(JSON.stringify(input))
  hook.stdin.end()

  hook.on('exit', (code) => {
    console.log(`Exit code: ${code}`)
  })

  hook.stderr.on('data', (data) => {
    console.log(`Error output: ${data}`)
  })
}

// Test TypeScript hook
testHook('./check-typescript.js', {
  tool_name: 'Write',
  tool_input: {
    file_path: '/path/to/test.ts',
  },
})
```

## Troubleshooting

### Common Issues

1. **EPIPE Errors**: Hook output too large or malformed
   - Solution: Limit output size, use proper JSON
   - Fixed in TypeScript hook by truncating messages to 80 chars
   - Limit errors shown to 3 maximum

2. **Missing Dependencies**: Required module not found
   - Solution: Check and install in ensureDependencies()
   - TypeScript hook has fallback to use `tsc` command
   - Graceful degradation when libraries unavailable

3. **Timeout**: Hook takes too long
   - Solution: Optimize processing, increase timeout
   - TypeScript hook uses 2-second timeout
   - Per-file checking is much faster

4. **Silent Failures**: Hook exits without feedback
   - Solution: Add debug logging when needed
   - All catch blocks exit with code 0 (silent)

### Debug Mode

```javascript
const DEBUG = process.env.STUDIO_DEBUG === 'true'

if (DEBUG) {
  console.error('[DEBUG] Processing file:', filePath)
}
```

## Future Hooks

Planned hooks following the same patterns:

1. **ESLint Checker**
   - Similar to TypeScript checker
   - Uses ESLint API
   - Per-file checking

2. **Prettier Formatter**
   - PostToolUse hook
   - Auto-formats on save
   - Respects .prettierrc

3. **Import Organizer**
   - Sorts and groups imports
   - Removes unused imports
   - Maintains consistency

4. **Test Runner**
   - Runs tests for changed files
   - Shows failures to Claude
   - Suggests fixes

## Summary

Studio Intelligence hooks are:

- **Simple**: One purpose each
- **Robust**: Handle errors gracefully
- **Fast**: Per-file operations
- **Smart**: Use libraries, not shells
- **Maintainable**: Shared patterns and utilities

Follow these patterns to ensure consistent, reliable hooks that enhance Claude Studio without causing crashes or confusion.
