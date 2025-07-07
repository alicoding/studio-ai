#!/bin/bash

# Claude Studio Stable MCP Server Runner
# This script builds and runs a stable MCP server instance that won't be affected by hot reload

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MCP_DIR="$PROJECT_ROOT/web/server/mcp/studio-ai"
STABLE_BUILD_DIR="$PROJECT_ROOT/.mcp-stable"

echo -e "${GREEN}Claude Studio Stable MCP Server${NC}"
echo "================================"

# Parse command line arguments
ACTION="${1:-start}"
PORT="${2:-3100}"

case "$ACTION" in
  build)
    echo -e "${YELLOW}Building stable MCP server...${NC}"
    
    # Create stable build directory
    mkdir -p "$STABLE_BUILD_DIR"
    
    # Copy necessary files
    cp -r "$MCP_DIR/src" "$STABLE_BUILD_DIR/"
    cp "$MCP_DIR/package.json" "$STABLE_BUILD_DIR/"
    cp "$MCP_DIR/tsconfig.json" "$STABLE_BUILD_DIR/" 2>/dev/null || true
    
    # Install dependencies in stable directory
    cd "$STABLE_BUILD_DIR"
    echo "Installing dependencies..."
    npm install --silent
    
    # Build TypeScript files
    echo "Building TypeScript..."
    npx tsc || {
      echo -e "${RED}Build failed! Check TypeScript errors.${NC}"
      exit 1
    }
    
    echo -e "${GREEN}Build completed successfully!${NC}"
    ;;
    
  start)
    # Build first if needed
    if [ ! -d "$STABLE_BUILD_DIR/dist" ]; then
      echo -e "${YELLOW}No stable build found. Building first...${NC}"
      "$0" build
    fi
    
    # Check if MCP server is already running
    if pgrep -f "studio-ai-stable" > /dev/null; then
      echo -e "${YELLOW}Stable MCP server is already running.${NC}"
      echo "Run '$0 stop' to stop it first."
      exit 1
    fi
    
    echo -e "${GREEN}Starting stable MCP server on port $PORT...${NC}"
    
    # Set environment variable to identify stable instance
    export MCP_STABLE_MODE=true
    export MCP_STABLE_PORT=$PORT
    
    # Run the MCP server with a unique process name
    cd "$STABLE_BUILD_DIR"
    exec -a "studio-ai-stable" node dist/index.js
    ;;
    
  stop)
    echo -e "${YELLOW}Stopping stable MCP server...${NC}"
    
    if pgrep -f "studio-ai-stable" > /dev/null; then
      pkill -f "studio-ai-stable"
      echo -e "${GREEN}Stable MCP server stopped.${NC}"
    else
      echo "No stable MCP server is running."
    fi
    ;;
    
  status)
    if pgrep -f "studio-ai-stable" > /dev/null; then
      echo -e "${GREEN}Stable MCP server is running.${NC}"
      ps aux | grep -v grep | grep "studio-ai-stable"
    else
      echo -e "${YELLOW}Stable MCP server is not running.${NC}"
    fi
    ;;
    
  clean)
    echo -e "${YELLOW}Cleaning stable build directory...${NC}"
    rm -rf "$STABLE_BUILD_DIR"
    echo -e "${GREEN}Clean completed.${NC}"
    ;;
    
  *)
    echo "Usage: $0 {build|start|stop|status|clean} [port]"
    echo ""
    echo "Commands:"
    echo "  build   - Build the stable MCP server"
    echo "  start   - Start the stable MCP server (builds if needed)"
    echo "  stop    - Stop the running stable MCP server"
    echo "  status  - Check if stable MCP server is running"
    echo "  clean   - Remove the stable build directory"
    echo ""
    echo "Options:"
    echo "  port    - Port to run the stable server on (default: 3100)"
    exit 1
    ;;
esac