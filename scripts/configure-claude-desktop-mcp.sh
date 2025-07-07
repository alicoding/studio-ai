#!/bin/bash

# Claude Desktop MCP Configuration Helper
# This script helps switch between stable and dev MCP configurations

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CLAUDE_CONFIG_DIR="$HOME/Library/Application Support/Claude"
CONFIG_FILE="$CLAUDE_CONFIG_DIR/claude_desktop_config.json"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
USERNAME=$(whoami)

# Function to check if jq is installed
check_jq() {
    if ! command -v jq &> /dev/null; then
        echo -e "${RED}Error: jq is not installed${NC}"
        echo "Install with: brew install jq"
        exit 1
    fi
}

# Function to backup config
backup_config() {
    if [ -f "$CONFIG_FILE" ]; then
        BACKUP_FILE="$CONFIG_FILE.backup.$(date +%Y%m%d_%H%M%S)"
        cp "$CONFIG_FILE" "$BACKUP_FILE"
        echo -e "${GREEN}Backed up config to: $BACKUP_FILE${NC}"
    fi
}

# Function to ensure config exists
ensure_config() {
    if [ ! -f "$CONFIG_FILE" ]; then
        echo -e "${YELLOW}Creating new Claude Desktop config...${NC}"
        mkdir -p "$CLAUDE_CONFIG_DIR"
        echo '{"mcpServers": {}}' > "$CONFIG_FILE"
    fi
}

# Function to add/update stable config
configure_stable() {
    echo -e "${BLUE}Configuring stable MCP server...${NC}"
    
    # Check if stable build exists
    if [ ! -f "$PROJECT_ROOT/.mcp-stable/dist/index.js" ]; then
        echo -e "${YELLOW}Stable build not found. Building...${NC}"
        cd "$PROJECT_ROOT"
        npm run mcp:stable:build
    fi
    
    # Update config using jq
    jq --arg path "$PROJECT_ROOT/.mcp-stable/dist/index.js" \
       '.mcpServers["studio-ai"] = {
          "command": "node",
          "args": [$path],
          "env": {
            "MCP_STABLE_MODE": "true",
            "MCP_STABLE_PORT": "3100"
          }
        }' "$CONFIG_FILE" > "$CONFIG_FILE.tmp" && mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"
    
    echo -e "${GREEN}Stable MCP configuration added!${NC}"
}

# Function to add/update dev config
configure_dev() {
    echo -e "${BLUE}Configuring development MCP server...${NC}"
    
    # Update config using jq
    jq --arg path "$PROJECT_ROOT/web/server/mcp/studio-ai/src/index.ts" \
       --arg cwd "$PROJECT_ROOT/web/server/mcp/studio-ai" \
       '.mcpServers["studio-ai"] = {
          "command": "tsx",
          "args": ["watch", $path],
          "cwd": $cwd
        }' "$CONFIG_FILE" > "$CONFIG_FILE.tmp" && mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"
    
    echo -e "${GREEN}Development MCP configuration added!${NC}"
}

# Function to remove config
remove_config() {
    echo -e "${BLUE}Removing studio-ai MCP configuration...${NC}"
    
    jq 'del(.mcpServers["studio-ai"])' "$CONFIG_FILE" > "$CONFIG_FILE.tmp" && mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"
    
    echo -e "${GREEN}studio-ai MCP configuration removed!${NC}"
}

# Function to show current config
show_config() {
    if [ -f "$CONFIG_FILE" ] && jq -e '.mcpServers["studio-ai"]' "$CONFIG_FILE" > /dev/null 2>&1; then
        echo -e "${BLUE}Current studio-ai MCP configuration:${NC}"
        jq '.mcpServers["studio-ai"]' "$CONFIG_FILE"
    else
        echo -e "${YELLOW}No studio-ai MCP configuration found${NC}"
    fi
}

# Function to validate config
validate_config() {
    if [ -f "$CONFIG_FILE" ]; then
        if jq empty "$CONFIG_FILE" 2>/dev/null; then
            echo -e "${GREEN}Configuration is valid JSON${NC}"
        else
            echo -e "${RED}Configuration is invalid JSON!${NC}"
            exit 1
        fi
    fi
}

# Main menu
show_menu() {
    echo -e "${BLUE}Claude Desktop MCP Configuration Helper${NC}"
    echo "========================================"
    echo "Project: $PROJECT_ROOT"
    echo ""
    echo "1) Configure stable MCP server"
    echo "2) Configure development MCP server"
    echo "3) Remove studio-ai configuration"
    echo "4) Show current configuration"
    echo "5) Validate configuration"
    echo "6) Exit"
    echo ""
}

# Check requirements
check_jq

# Main script
case "${1:-menu}" in
    stable)
        ensure_config
        backup_config
        configure_stable
        validate_config
        echo -e "${YELLOW}Please restart Claude Desktop for changes to take effect${NC}"
        ;;
    
    dev)
        ensure_config
        backup_config
        configure_dev
        validate_config
        echo -e "${YELLOW}Please restart Claude Desktop for changes to take effect${NC}"
        ;;
    
    remove)
        ensure_config
        backup_config
        remove_config
        validate_config
        echo -e "${YELLOW}Please restart Claude Desktop for changes to take effect${NC}"
        ;;
    
    show)
        show_config
        ;;
    
    validate)
        validate_config
        ;;
    
    menu|*)
        while true; do
            show_menu
            read -p "Select option: " choice
            
            case $choice in
                1)
                    ensure_config
                    backup_config
                    configure_stable
                    validate_config
                    echo -e "${YELLOW}Please restart Claude Desktop for changes to take effect${NC}"
                    echo ""
                    ;;
                2)
                    ensure_config
                    backup_config
                    configure_dev
                    validate_config
                    echo -e "${YELLOW}Please restart Claude Desktop for changes to take effect${NC}"
                    echo ""
                    ;;
                3)
                    ensure_config
                    backup_config
                    remove_config
                    validate_config
                    echo -e "${YELLOW}Please restart Claude Desktop for changes to take effect${NC}"
                    echo ""
                    ;;
                4)
                    show_config
                    echo ""
                    ;;
                5)
                    validate_config
                    echo ""
                    ;;
                6)
                    echo "Exiting..."
                    exit 0
                    ;;
                *)
                    echo -e "${RED}Invalid option${NC}"
                    echo ""
                    ;;
            esac
            
            read -p "Press Enter to continue..."
        done
        ;;
esac