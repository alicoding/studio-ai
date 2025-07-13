# Dual Environment Setup for Claude Studio

This document explains how to run stable and development environments simultaneously for Claude Studio, allowing you to use MCP tools while developing without interruptions.

## Overview

The dual environment setup allows you to:

- Run a **stable API server** on port 3456 for MCP operations
- Run a **development API server** on port 3457 with hot reload for testing
- Switch between environments without disconnecting Claude

## Quick Start

### Start Both Environments

```bash
npm run env:start
```

### Check Status

```bash
npm run env:status
```

### Stop Both Environments

```bash
npm run env:stop
```

## Manual Control

### Using npm scripts:

```bash
# Start individual environments
npm run env:start:stable    # Start stable server only
npm run env:start:dev       # Start development server only

# Direct server commands
npm run server:stable       # Run stable server directly
npm run server:development  # Run dev server with hot reload
```

### Using the management script:

```bash
# Start environments
./scripts/manage-environments.sh start stable
./scripts/manage-environments.sh start dev
./scripts/manage-environments.sh start both

# Stop environments
./scripts/manage-environments.sh stop stable
./scripts/manage-environments.sh stop dev
./scripts/manage-environments.sh stop both

# Check status
./scripts/manage-environments.sh status both

# View logs
./scripts/manage-environments.sh logs stable
./scripts/manage-environments.sh logs dev
```

## MCP Configuration

### Default (Stable Environment)

By default, the MCP server points to the stable API on port 3456:

```javascript
const API_BASE = process.env.CLAUDE_STUDIO_API || 'http://localhost:3456/api'
```

### Switching to Development

To test MCP tools against the development server:

1. Create a `.env` file in `web/server/mcp/studio-ai/`:

```bash
CLAUDE_STUDIO_API=http://localhost:3457/api
```

2. Restart the MCP server in Claude Desktop

### Environment Variables

- `CLAUDE_STUDIO_API`: Set the API endpoint for MCP server
- `PORT`: Set the port for the API server (default: 3456)
- `NODE_ENV`: Set to 'production' or 'development'

## Architecture

```
┌─────────────────┐     ┌──────────────────┐
│  Claude Desktop │────▶│   MCP Server     │
└─────────────────┘     └────────┬─────────┘
                                 │
                                 │ API Calls
                                 │
              ┌──────────────────┴──────────────────┐
              │                                     │
              ▼                                     ▼
    ┌─────────────────┐                  ┌─────────────────┐
    │  Stable Server  │                  │   Dev Server    │
    │   Port: 3456    │                  │   Port: 3457    │
    │  (Production)   │                  │  (Hot Reload)   │
    └─────────────────┘                  └─────────────────┘
```

## Best Practices

1. **Normal Development**: Use the stable server (3456) for MCP operations while developing on the dev server (3457)

2. **Testing MCP Changes**: When testing changes to MCP tools:
   - Make changes to MCP tool code
   - Point MCP to dev server using `.env` file
   - Test the changes
   - Switch back to stable when done

3. **Production Deployment**:
   - Always use the stable server for production MCP operations
   - Build and test on dev server first
   - Deploy tested changes to stable

## Troubleshooting

### Port Already in Use

If you see "Port already in use" errors:

```bash
# Check what's using the ports
lsof -i :3456
lsof -i :3457

# Force stop all environments
npm run env:stop
```

### Server Won't Start

Check the logs:

```bash
./scripts/manage-environments.sh logs stable
./scripts/manage-environments.sh logs dev
```

### MCP Connection Issues

1. Ensure the correct server is running:
   ```bash
   npm run env:status
   ```
2. Check the MCP server is pointing to the correct API:
   ```bash
   echo $CLAUDE_STUDIO_API
   ```
3. Restart Claude Desktop if needed

## File Locations

- **PID Files**: `.claude-studio/stable-server.pid`, `.claude-studio/dev-server.pid`
- **Log Files**: `.claude-studio/stable-server.log`, `.claude-studio/dev-server.log`
- **MCP Config**: `web/server/mcp/studio-ai/.env` (create from `.env.example`)
