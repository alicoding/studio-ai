# AI Chat Session Design

## Problem
Claude Code needs to:
1. Start new conversations for new tasks
2. Continue existing conversations when refining/following up
3. Not mix unrelated contexts

## Simple Solution

### Command Format
```
#search [session:id] query
#debug [session:new] issue description  
#think [session:abc123] follow-up question
```

### Session Rules
1. **No session specified** → Create new session with auto ID
2. **session:new** → Explicitly create new session
3. **session:<id>** → Continue existing session
4. **session:end** → Close current session

### Examples

#### New Search Task
```
Claude: #search latest React patterns
System: [Created session: search-1234]
AI: Here are the latest React patterns...

Claude: #search session:search-1234 what about hooks?
AI: Regarding hooks specifically...
```

#### New Debug Task (different context)
```
Claude: #debug session:new TypeError in login function
System: [Created session: debug-5678]
AI: Let me analyze this error...
```

### Session Management
- Sessions expire after 30 minutes of inactivity
- Each session maintains its own context
- File paths are extracted and loaded per session
- Model/prompts from UI config at session start

### Storage
```typescript
interface ChatSession {
  id: string
  capability: string // search, debug, think
  model: string
  turns: Turn[]
  context: {
    files?: string[]
    fileContents?: Record<string, string>
  }
  created: Date
  lastActive: Date
  status: 'active' | 'expired' | 'closed'
}
```

## Benefits
- Simple to understand
- Explicit control
- No context pollution
- Easy to implement