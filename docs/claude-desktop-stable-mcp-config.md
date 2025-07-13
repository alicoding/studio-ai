# Claude Desktop MCP Configuration Guide

This guide explains how to configure Claude Desktop to use the stable MCP server instead of the development server.

## Overview

By default, Claude Desktop can be configured to use MCP servers. The stable MCP server runs on port 3100 (not 3457 as mentioned - based on the script review) and provides a persistent instance that won't be affected by hot reload during development.

## Configuration Steps

### 1. Locate Claude Desktop Configuration

The Claude Desktop configuration file is located at:

```
~/Library/Application Support/Claude/claude_desktop_config.json
```

### 2. Add Studio AI MCP Server Configuration

Open the configuration file and add the `studio-ai` server configuration to the `mcpServers` section:

```json
{
  "mcpServers": {
    // ... existing servers ...
    "studio-ai": {
      "command": "node",
      "args": [
        "/Users/[your-username]/claude-swarm/claude-team/claude-studio/.mcp-stable/dist/index.js"
      ],
      "env": {
        "MCP_STABLE_MODE": "true",
        "MCP_STABLE_PORT": "3100"
      }
    }
  }
}
```

**Important**: Replace `[your-username]` with your actual macOS username.

### 3. Build the Stable MCP Server

Before using the stable configuration, you need to build it:

```bash
cd /path/to/claude-studio
npm run mcp:stable:build
```

This creates the stable build in the `.mcp-stable` directory.

### 4. Restart Claude Desktop

After modifying the configuration:

1. Quit Claude Desktop completely (Cmd+Q)
2. Restart Claude Desktop
3. The studio-ai MCP server should now be available

## Switching Between Dev and Stable

### Using Stable Server (Production)

The configuration above points to the stable build at:

```
.mcp-stable/dist/index.js
```

This version:

- Won't be affected by hot reload
- Runs independently of the development server
- Requires manual rebuild to update

### Using Dev Server (Development)

To switch back to the development server, modify the configuration:

```json
{
  "mcpServers": {
    "studio-ai": {
      "command": "tsx",
      "args": [
        "watch",
        "/Users/[your-username]/claude-swarm/claude-team/claude-studio/web/server/mcp/studio-ai/src/index.ts"
      ],
      "cwd": "/Users/[your-username]/claude-swarm/claude-team/claude-studio/web/server/mcp/studio-ai"
    }
  }
}
```

This version:

- Uses TypeScript directly with tsx
- Automatically reloads on code changes
- Good for developing MCP features

## Verification

### 1. Check MCP Server Availability

In Claude Desktop, you can verify the MCP server is available by:

1. Opening a new conversation
2. Looking for the MCP server icon/indicator
3. The studio-ai server should be listed

### 2. Test Basic Functionality

Try using a capability tool:

```
Use the list_capabilities tool
```

This should return the available AI capabilities if the server is running correctly.

### 3. Check Server Logs

The MCP server logs to stderr. You can view logs by running the server manually:

```bash
cd /path/to/claude-studio
node .mcp-stable/dist/index.js
```

## Troubleshooting

### Server Not Appearing in Claude Desktop

1. **Check the path**: Ensure the path in the configuration matches your actual project location
2. **Verify build**: Make sure `.mcp-stable/dist/index.js` exists
3. **Check permissions**: The file should be executable

### Build Errors

If the stable build fails:

```bash
npm run mcp:stable:clean
npm run mcp:stable:build
```

### Connection Issues

1. Restart Claude Desktop
2. Check for conflicting MCP servers
3. Verify no other process is using port 3100

## Best Practices

1. **For Testing**: Use the stable server to avoid interruptions
2. **For MCP Development**: Use the dev server for immediate feedback
3. **Regular Updates**: Rebuild stable server after significant changes:
   ```bash
   npm run mcp:stable:stop
   npm run mcp:stable:build
   ```

## Automated Configuration Helper

A helper script is available to automate the configuration process:

### Using the Helper Script

```bash
# Interactive menu
./scripts/configure-claude-desktop-mcp.sh

# Direct commands
./scripts/configure-claude-desktop-mcp.sh stable   # Configure stable server
./scripts/configure-claude-desktop-mcp.sh dev      # Configure dev server
./scripts/configure-claude-desktop-mcp.sh remove   # Remove configuration
./scripts/configure-claude-desktop-mcp.sh show     # Show current config
./scripts/configure-claude-desktop-mcp.sh validate # Validate JSON syntax
```

### Helper Script Features

- **Automatic backup**: Creates timestamped backups before changes
- **Build verification**: Checks if stable build exists and builds if needed
- **JSON validation**: Ensures configuration remains valid
- **Interactive menu**: Easy-to-use interface for all operations
- **Safe operations**: Uses jq for reliable JSON manipulation

### Requirements

The helper script requires `jq` for JSON processing:

```bash
# Install on macOS
brew install jq
```

## Quick Reference

| Task                             | Command                                            |
| -------------------------------- | -------------------------------------------------- |
| Configure stable (automated)     | `./scripts/configure-claude-desktop-mcp.sh stable` |
| Configure dev (automated)        | `./scripts/configure-claude-desktop-mcp.sh dev`    |
| Build stable server              | `npm run mcp:stable:build`                         |
| Start stable server (standalone) | `npm run mcp:stable`                               |
| Stop stable server               | `npm run mcp:stable:stop`                          |
| Check status                     | `npm run mcp:stable:status`                        |
| Clean build                      | `npm run mcp:stable:clean`                         |

## Notes

- The stable server runs independently of the main development server
- Claude Desktop manages the MCP server lifecycle automatically
- Configuration changes require restarting Claude Desktop
- The stable build directory (`.mcp-stable`) is git-ignored
- Configuration backups are created in the Claude config directory
