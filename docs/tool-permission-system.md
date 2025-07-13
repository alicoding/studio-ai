# Tool Permission System Design

## Overview

This document outlines the design for a granular tool permission system for Claude Studio agents, allowing fine-grained control over what tools agents can access and how they can use them.

## Current State

- Tools are stored as JSON arrays in `agentConfigs.tools` and `agentRoleAssignments.customTools`
- Tools are simple strings like `'read'`, `'write'`, `'bash'`, etc.
- No granular permissions or restrictions

## Proposed Design

### 1. Tool Permission Structure

Instead of simple tool names, we'll use a more detailed structure:

```typescript
interface ToolPermission {
  name: string // Tool identifier (e.g., 'bash', 'read')
  enabled: boolean // Whether tool is available
  restrictions?: {
    // File system tools
    paths?: string[] // Allowed paths for read/write operations
    excludePaths?: string[] // Excluded paths
    readOnly?: boolean // For file operations

    // Bash tool
    commands?: string[] // Allowed commands (whitelist)
    blockedCommands?: string[] // Blocked commands (blacklist)
    sudo?: boolean // Allow sudo commands

    // Web tools
    domains?: string[] // Allowed domains for web operations
    blockedDomains?: string[] // Blocked domains

    // MCP tools
    servers?: string[] // Allowed MCP servers
    operations?: string[] // Allowed MCP operations
  }
  metadata?: {
    description?: string // Why this permission exists
    addedBy?: string // Who added this permission
    addedAt?: string // When it was added
  }
}
```

### 2. Tool Categories

Group tools into categories for easier management:

```typescript
enum ToolCategory {
  FILE_SYSTEM = 'file_system', // read, write, edit, multiedit
  SEARCH = 'search', // grep, glob, ls, semantic_search
  EXECUTION = 'execution', // bash, notebook operations
  WEB = 'web', // webfetch, websearch
  PLANNING = 'planning', // todoread, todowrite, exit_plan_mode
  MCP = 'mcp', // All MCP tools
  COLLABORATION = 'collaboration', // agent tool, messaging
}
```

### 3. Permission Presets

Common permission sets for different agent roles:

```typescript
const PERMISSION_PRESETS = {
  read_only: {
    file_system: { readOnly: true },
    search: { enabled: true },
    execution: { enabled: false },
    web: { enabled: true },
    planning: { enabled: true },
    mcp: { enabled: false },
    collaboration: { enabled: false },
  },

  developer: {
    file_system: {
      enabled: true,
      excludePaths: ['/etc', '/sys', '~/.ssh'],
    },
    search: { enabled: true },
    execution: {
      enabled: true,
      blockedCommands: ['rm -rf /', 'sudo'],
    },
    web: { enabled: true },
    planning: { enabled: true },
    mcp: {
      enabled: true,
      operations: ['read', 'list'],
    },
    collaboration: { enabled: true },
  },

  architect: {
    file_system: {
      enabled: true,
      readOnly: false,
      paths: ['./docs', './architecture'],
    },
    search: { enabled: true },
    execution: { enabled: false },
    web: { enabled: true },
    planning: { enabled: true },
    mcp: { enabled: true },
    collaboration: { enabled: true },
  },

  devops: {
    file_system: { enabled: true },
    search: { enabled: true },
    execution: {
      enabled: true,
      sudo: false,
    },
    web: { enabled: true },
    planning: { enabled: true },
    mcp: {
      enabled: true,
      operations: ['*'], // Full MCP access
    },
    collaboration: { enabled: true },
  },
}
```

### 4. Implementation Plan

1. **Update Schema** (if needed)
   - Modify tools field to support JSON object structure
   - Add tool_permissions table for granular control

2. **Update Agent Config Service**
   - Parse tool permissions when loading agents
   - Apply restrictions when tools are invoked

3. **Create Tool Permission UI**
   - Visual tool permission editor
   - Preset selection
   - Custom permission configuration

4. **Update MCP Tools**
   - Respect tool permissions in mcp\_\_studio-ai tools
   - Pass permissions to Claude SDK

5. **Audit & Logging**
   - Log tool usage with permissions
   - Track permission violations

### 5. Migration Strategy

1. Convert existing tool arrays to new format
2. Apply sensible defaults based on agent roles
3. Maintain backward compatibility

### 6. Example Usage

```json
{
  "tools": [
    {
      "name": "bash",
      "enabled": true,
      "restrictions": {
        "blockedCommands": ["rm -rf", "sudo", "shutdown"],
        "sudo": false
      }
    },
    {
      "name": "read",
      "enabled": true,
      "restrictions": {
        "excludePaths": ["/etc/passwd", "~/.ssh", "*.env"]
      }
    },
    {
      "name": "mcp__studio-ai__update_agent",
      "enabled": true,
      "restrictions": {
        "operations": ["update_own_config"]
      }
    }
  ]
}
```

## Benefits

1. **Security**: Prevent agents from accessing sensitive files or running dangerous commands
2. **Flexibility**: Different permission levels for different projects/contexts
3. **Auditability**: Track what tools are used and how
4. **User Control**: Give users fine-grained control over agent capabilities
5. **Safety**: Reduce risk of accidental damage from agent actions

## Next Steps

1. Review and refine the design
2. Implement schema updates
3. Build permission parsing system
4. Create UI for permission management
5. Test with different agent scenarios
