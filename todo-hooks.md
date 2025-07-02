# Studio Intelligence System - Implementation Plan (UPDATED)

## Core Architecture: Leveraging Native Claude Code Hooks

```
Studio Intelligence (Default hooks in ~/.claude/settings.json)
    ↓ can be overridden by
Project Hooks (.claude/settings.json - native!)
    ↓ can be overridden by
User Custom Hooks (also in ~/.claude/settings.json)
```

**ALL using native Claude Code hook system!**

## Phase 1: Studio Intelligence Default Hooks

### What We've Already Built:

- [x] ProjectDetector.ts - Detects project types
- [x] StudioIntelligence.ts - Writes hooks to ~/.claude/settings.json
- [x] Hook scripts in ~/.claude-studio/scripts/
- [x] Integration with useSettings hook

### What Needs Adjustment:

- [ ] Move StudioIntelligence initialization to app startup (not per-project)
- [ ] Add metadata to identify "Studio default" hooks
- [ ] Only write defaults if they don't already exist
- [ ] Ensure hooks use native Claude Code format exactly

**Updated StudioIntelligence.ts approach:**

```typescript
class StudioIntelligence {
  // On Studio startup, ensure default hooks exist
  async ensureDefaultHooks(): Promise<void> {
    const settings = this.loadClaudeSettings()

    // Only add our defaults if hooks section is empty
    if (!settings.hooks || Object.keys(settings.hooks).length === 0) {
      settings.hooks = this.getDefaultHooks()
      this.saveClaudeSettings(settings)
    }
  }

  getDefaultHooks() {
    return {
      PostToolUse: [
        {
          matcher: 'Write|Edit|MultiEdit',
          hooks: [
            {
              type: 'command',
              command: 'node ~/.claude-studio/scripts/check-typescript.js',
            },
          ],
        },
      ],
      PreToolUse: [
        {
          matcher: 'Write|Edit|MultiEdit',
          hooks: [
            {
              type: 'command',
              command: 'node ~/.claude-studio/scripts/check-file-lock.js',
            },
          ],
        },
      ],
    }
  }
}
```

**🧪 TEST CHECKPOINT 1:**

- Start Claude Studio
- Check ~/.claude/settings.json has default hooks
- Start Claude Code - hooks work immediately!

---

## Phase 2: Safe Hook Management UI

### Update HooksSettingsTab to show ALL native hook locations:

- [ ] Read hooks from all three locations:
  - `~/.claude/settings.json` (user & studio defaults)
  - `.claude/settings.json` (project)
  - `.claude/settings.local.json` (local project)
- [ ] Show which location each hook comes from
- [ ] Mark Studio defaults as "Built-in" (read-only)
- [ ] Allow editing user and project hooks

### Add validation to prevent mistakes:

- [ ] Validate commands before saving
- [ ] Check for dangerous patterns (rm -rf, etc.)
- [ ] Warn about path traversal (..)
- [ ] Suggest using absolute paths

**🧪 TEST CHECKPOINT 2:**

- View all hooks in settings
- See "Built-in" badge on Studio defaults
- Edit a user hook safely
- Get warning for dangerous command

---

## Phase 3: Workspace Diagnostics Panel (VSCode-style Problems Panel)

**This is workspace-level intelligence, NOT agent-level or hook-related!**

Like VSCode's Problems panel, show project-wide diagnostics:

### ✅ Already Built:

- [x] DiagnosticPanel component with collapsible error list
- [x] DiagnosticsStore with Zustand state management
- [x] Server-side DiagnosticService with TypeScript/ESLint readers
- [x] API endpoints: GET /api/diagnostics, POST /api/diagnostics/start
- [x] ErrorMonitor client service with polling
- [x] Integration in main layout above content area

### 🎯 Current Task: Send-to-Agent Feature

- [ ] Add right-click context menu to diagnostic items
- [ ] "Send to Agent" option with agent dropdown
- [ ] Format diagnostic as message with file location context
- [ ] Send diagnostic details to selected agent's chat

**Context Menu Options:**

```
Right-click on diagnostic item:
├── 📍 Go to File
├── 📋 Copy Message
├── 🔧 Quick Fix (if available)
├── 📤 Send to Agent ▶️
    ├── Agent 7386247c
    ├── Frontend Specialist
    └── Backend Dev
```

### 🎯 Enhanced Features:

- [ ] Click diagnostic to open file at line/column
- [ ] Group diagnostics by file or by type
- [ ] Filter by error/warning/info
- [ ] Auto-refresh when files change
- [ ] Show test results and coverage in same panel

**🧪 TEST CHECKPOINT 3:**

- See workspace TypeScript/ESLint errors in collapsible panel
- Right-click error → Send to Agent → Select agent
- Agent receives formatted message with file context
- Click error to navigate to file location

---

## Phase 4: Recipe System for Common Hooks

### Create Recipe UI:

- [ ] Pre-configured hook sets for common scenarios
- [ ] Each recipe generates native Claude Code hooks
- [ ] Safe, tested configurations

**Example Recipes:**

```typescript
const RECIPES = [
  {
    id: 'strict-typescript',
    name: 'Strict TypeScript',
    description: 'Block edits if TypeScript errors exist',
    hooks: {
      PreToolUse: [
        {
          matcher: 'Write|Edit|MultiEdit',
          hooks: [
            {
              type: 'command',
              command: 'node ~/.claude-studio/scripts/strict-typescript.js',
            },
          ],
        },
      ],
    },
  },
  {
    id: 'auto-format',
    name: 'Auto-Format on Save',
    description: 'Run prettier after every file edit',
    hooks: {
      PostToolUse: [
        {
          matcher: 'Write|Edit|MultiEdit',
          hooks: [
            {
              type: 'command',
              command: 'prettier --write ${FILE_PATH}',
            },
          ],
        },
      ],
    },
  },
]
```

**🧪 TEST CHECKPOINT 4:**

- Click "Enable Strict TypeScript" recipe
- See hooks added to ~/.claude/settings.json
- Test works in Claude Code immediately

---

## Phase 5: Visual Hook Builder

### Safe UI for creating custom hooks:

- [ ] Dropdown for hook events (PreToolUse, PostToolUse, etc.)
- [ ] Tool matcher builder with common patterns
- [ ] Command builder with variable hints
- [ ] Preview generated JSON
- [ ] Test hook before saving

**Example UI:**

```
Event: [PostToolUse ▼]
Matcher: [Write|Edit|MultiEdit]
Command: [________________________]
         Available variables: ${FILE_PATH}, ${TOOL_NAME}, etc.

[Preview JSON] [Test Hook] [Save]
```

**🧪 TEST CHECKPOINT 5:**

- Build a custom hook visually
- Test it safely
- Save to desired location
- Works in Claude Code

---

## Phase 6: @mention Routing (Studio Feature, not a hook)

This is a Studio-specific feature for multi-agent coordination:

- [ ] Detect @mentions in messages
- [ ] Route to appropriate agent
- [ ] Show visual feedback
- [ ] This is NOT a hook - it's Studio behavior

---

## Phase 7: File Lock Coordination

The file lock hook warns about concurrent edits:

### Already built:

- [x] check-file-lock.js script
- [x] PreToolUse hook configuration

### Need to add:

- [ ] Visual indicators in Studio UI
- [ ] Show which agent has lock
- [ ] Auto-unlock after timeout

---

## Success Metrics

1. **Zero Config**: Studio provides smart defaults via native hooks
2. **Native Compatibility**: Everything works in vanilla Claude Code
3. **Safe Editing**: UI prevents dangerous hook configurations
4. **No Custom Format**: Uses Claude Code's native hook system
5. **Progressive**: Defaults → Recipes → Custom hooks

## Implementation Order

1. ✅ Phase 1 Core (mostly done, needs startup init)
2. Phase 2: Safe Hook UI (2 days)
3. Phase 3: Error display in Studio (1 day)
4. Phase 4: Recipe system (1 day)
5. Phase 5: Visual builder (2 days)
6. Phase 6: @mention routing (few hours)
7. Phase 7: File lock UI (few hours)

Total: ~1 week

## Key Principles

- **Use native hooks** - Don't invent new formats
- **Studio Intelligence = Default hooks** - Not a separate system
- **Safe UI** - Prevent mistakes, validate commands
- **Works everywhere** - Studio hooks work in Claude Code
- **Progressive enhancement** - Start simple, add power
