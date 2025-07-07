# MCP Stable Environment Documentation

## Overview

The MCP (Model Context Protocol) stable environment provides a way to run a persistent MCP server instance that won't be affected by hot reload during development. This solves the problem where the MCP server shuts down every time the development server reloads.

## Problem Solved

During development of Claude Studio:

- Hot reload causes the MCP server to shut down
- This makes it unavailable for testing MCP features
- Developers need to restart the MCP server manually after each reload

## Solution Architecture

The stable MCP environment:

1. Builds the MCP server to a separate directory (`.mcp-stable`)
2. Runs from built files, not the dev server
3. Handles graceful shutdown with SIGTERM signals
4. Provides clear lifecycle logging
5. Can run alongside the development server

## Usage

### Quick Start

```bash
# Start the stable MCP server (builds automatically if needed)
npm run mcp:stable

# Check if it's running
npm run mcp:stable:status

# Stop the server
npm run mcp:stable:stop
```

### Available Commands

| Command                     | Description                                    |
| --------------------------- | ---------------------------------------------- |
| `npm run mcp:stable`        | Start the stable MCP server (builds if needed) |
| `npm run mcp:stable:build`  | Build the stable MCP server only               |
| `npm run mcp:stable:stop`   | Stop the running stable MCP server             |
| `npm run mcp:stable:status` | Check if stable MCP server is running          |
| `npm run mcp:stable:clean`  | Remove the stable build directory              |
| `npm run mcp:dev`           | Run MCP in dev mode (current behavior)         |

### Advanced Usage

```bash
# Run on a different port (default is 3100)
./scripts/run-stable-mcp.sh start 3200

# Rebuild and start fresh
npm run mcp:stable:clean
npm run mcp:stable:build
npm run mcp:stable
```

## How It Works

1. **Build Process**:
   - Copies MCP source to `.mcp-stable` directory
   - Installs dependencies independently
   - Builds TypeScript files

2. **Runtime**:
   - Runs with `MCP_STABLE_MODE=true` environment variable
   - Uses a unique process name `studio-ai-stable` for identification
   - Logs mode (STABLE vs DEV) on startup

3. **Lifecycle Management**:
   - Handles SIGTERM, SIGINT, and SIGHUP signals gracefully
   - Logs process PID and parent PID for debugging
   - Properly closes server connections on shutdown

## Development Workflow

### Recommended Workflow

1. Start the stable MCP server when beginning development:

   ```bash
   npm run mcp:stable
   ```

2. Run the development server normally:

   ```bash
   npm run dev
   npm run server:dev
   ```

3. The stable MCP server will continue running through hot reloads

4. When done, stop the stable server:
   ```bash
   npm run mcp:stable:stop
   ```

### Testing MCP Changes

When you need to test changes to the MCP server itself:

1. Stop the stable server
2. Make your changes
3. Rebuild and restart:
   ```bash
   npm run mcp:stable:stop
   npm run mcp:stable:build
   npm run mcp:stable
   ```

## Troubleshooting

### Server Won't Start

```bash
# Check if already running
npm run mcp:stable:status

# Force stop and restart
npm run mcp:stable:stop
npm run mcp:stable
```

### Build Errors

```bash
# Clean and rebuild
npm run mcp:stable:clean
npm run mcp:stable:build
```

### Port Conflicts

```bash
# Use a different port
./scripts/run-stable-mcp.sh start 3200
```

## Technical Details

- **Build Directory**: `.mcp-stable` (git-ignored)
- **Default Port**: 3100
- **Process Name**: `studio-ai-stable`
- **Environment Variables**:
  - `MCP_STABLE_MODE=true`
  - `MCP_STABLE_PORT=<port>`

## Best Practices

1. Always check status before starting
2. Stop the stable server when not needed
3. Clean build directory periodically
4. Monitor logs for any errors
5. Use stable mode for testing, dev mode for MCP development
