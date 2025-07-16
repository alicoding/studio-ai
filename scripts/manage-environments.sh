#!/bin/bash

# Claude Studio Environment Manager
# Manages stable and development API servers

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
STABLE_PID_FILE="$PROJECT_ROOT/.studio-ai/stable-server.pid"
DEV_PID_FILE="$PROJECT_ROOT/.studio-ai/dev-server.pid"

# Ensure .studio-ai directory exists
mkdir -p "$PROJECT_ROOT/.studio-ai"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_usage() {
    echo "Usage: $0 {start|stop|restart|status|logs} {stable|dev|both}"
    echo ""
    echo "Commands:"
    echo "  start   - Start the specified environment(s)"
    echo "  stop    - Stop the specified environment(s)"
    echo "  restart - Restart the specified environment(s)"
    echo "  status  - Show status of the specified environment(s)"
    echo "  logs    - Show logs for the specified environment(s)"
    echo ""
    echo "Environments:"
    echo "  stable - Production server on port 3456"
    echo "  dev    - Development server on port 3457 with hot reload"
    echo "  both   - Both environments"
    echo ""
    echo "Examples:"
    echo "  $0 start both     # Start both servers"
    echo "  $0 stop dev       # Stop development server"
    echo "  $0 status stable  # Check stable server status"
}

check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

start_stable() {
    echo -e "${BLUE}Starting stable server on port 3456...${NC}"
    
    if check_port 3456; then
        echo -e "${YELLOW}Port 3456 is already in use!${NC}"
        return 1
    fi
    
    cd "$PROJECT_ROOT"
    # Load .env file if it exists
    if [ -f .env ]; then
        export $(grep -v '^#' .env | xargs)
    fi
    NODE_ENV=production PORT=3456 nohup tsx web/server/app.ts > "$PROJECT_ROOT/.studio-ai/stable-server.log" 2>&1 &
    local pid=$!
    echo $pid > "$STABLE_PID_FILE"
    
    # Wait a moment for server to start
    sleep 2
    
    if kill -0 $pid 2>/dev/null; then
        echo -e "${GREEN}✓ Stable server started (PID: $pid)${NC}"
        echo -e "${GREEN}  URL: http://localhost:3456${NC}"
        return 0
    else
        echo -e "${RED}✗ Failed to start stable server${NC}"
        rm -f "$STABLE_PID_FILE"
        return 1
    fi
}

start_dev() {
    echo -e "${BLUE}Starting development server on port 3457...${NC}"
    
    if check_port 3457; then
        echo -e "${YELLOW}Port 3457 is already in use!${NC}"
        return 1
    fi
    
    cd "$PROJECT_ROOT"
    # Load .env file if it exists
    if [ -f .env ]; then
        export $(grep -v '^#' .env | xargs)
    fi
    NODE_ENV=development PORT=3457 nohup tsx watch web/server/app.ts > "$PROJECT_ROOT/.studio-ai/dev-server.log" 2>&1 &
    local pid=$!
    echo $pid > "$DEV_PID_FILE"
    
    # Wait a moment for server to start
    sleep 2
    
    if kill -0 $pid 2>/dev/null; then
        echo -e "${GREEN}✓ Development server started (PID: $pid)${NC}"
        echo -e "${GREEN}  URL: http://localhost:3457${NC}"
        echo -e "${GREEN}  Hot reload enabled${NC}"
        return 0
    else
        echo -e "${RED}✗ Failed to start development server${NC}"
        rm -f "$DEV_PID_FILE"
        return 1
    fi
}

stop_stable() {
    echo -e "${BLUE}Stopping stable server...${NC}"
    
    if [ -f "$STABLE_PID_FILE" ]; then
        local pid=$(cat "$STABLE_PID_FILE")
        if kill -0 $pid 2>/dev/null; then
            kill $pid
            sleep 1
            if kill -0 $pid 2>/dev/null; then
                kill -9 $pid
            fi
            echo -e "${GREEN}✓ Stable server stopped${NC}"
        else
            echo -e "${YELLOW}Stable server not running (stale PID file)${NC}"
        fi
        rm -f "$STABLE_PID_FILE"
    else
        echo -e "${YELLOW}Stable server not running${NC}"
    fi
}

stop_dev() {
    echo -e "${BLUE}Stopping development server...${NC}"
    
    if [ -f "$DEV_PID_FILE" ]; then
        local pid=$(cat "$DEV_PID_FILE")
        if kill -0 $pid 2>/dev/null; then
            kill $pid
            sleep 1
            if kill -0 $pid 2>/dev/null; then
                kill -9 $pid
            fi
            echo -e "${GREEN}✓ Development server stopped${NC}"
        else
            echo -e "${YELLOW}Development server not running (stale PID file)${NC}"
        fi
        rm -f "$DEV_PID_FILE"
    else
        echo -e "${YELLOW}Development server not running${NC}"
    fi
}

status_stable() {
    echo -e "${BLUE}Stable Server Status:${NC}"
    if [ -f "$STABLE_PID_FILE" ]; then
        local pid=$(cat "$STABLE_PID_FILE")
        if kill -0 $pid 2>/dev/null; then
            echo -e "${GREEN}✓ Running (PID: $pid)${NC}"
            echo -e "  URL: http://localhost:3456"
            echo -e "  Health: $(curl -s http://localhost:3456/api/health | jq -r '.status' 2>/dev/null || echo 'Unable to check')"
        else
            echo -e "${RED}✗ Not running (stale PID file)${NC}"
        fi
    else
        echo -e "${RED}✗ Not running${NC}"
    fi
}

status_dev() {
    echo -e "${BLUE}Development Server Status:${NC}"
    if [ -f "$DEV_PID_FILE" ]; then
        local pid=$(cat "$DEV_PID_FILE")
        if kill -0 $pid 2>/dev/null; then
            echo -e "${GREEN}✓ Running (PID: $pid)${NC}"
            echo -e "  URL: http://localhost:3457"
            echo -e "  Health: $(curl -s http://localhost:3457/api/health | jq -r '.status' 2>/dev/null || echo 'Unable to check')"
        else
            echo -e "${RED}✗ Not running (stale PID file)${NC}"
        fi
    else
        echo -e "${RED}✗ Not running${NC}"
    fi
}

show_logs() {
    local env=$1
    local log_file=""
    
    case $env in
        stable)
            log_file="$PROJECT_ROOT/.studio-ai/stable-server.log"
            echo -e "${BLUE}=== Stable Server Logs ===${NC}"
            ;;
        dev)
            log_file="$PROJECT_ROOT/.studio-ai/dev-server.log"
            echo -e "${BLUE}=== Development Server Logs ===${NC}"
            ;;
    esac
    
    if [ -f "$log_file" ]; then
        tail -n 50 "$log_file"
    else
        echo -e "${YELLOW}No log file found${NC}"
    fi
}

# Main script logic
if [ $# -ne 2 ]; then
    print_usage
    exit 1
fi

COMMAND=$1
ENVIRONMENT=$2

case $COMMAND in
    start)
        case $ENVIRONMENT in
            stable)
                start_stable
                ;;
            dev)
                start_dev
                ;;
            both)
                start_stable
                start_dev
                ;;
            *)
                print_usage
                exit 1
                ;;
        esac
        ;;
    stop)
        case $ENVIRONMENT in
            stable)
                stop_stable
                ;;
            dev)
                stop_dev
                ;;
            both)
                stop_stable
                stop_dev
                ;;
            *)
                print_usage
                exit 1
                ;;
        esac
        ;;
    restart)
        case $ENVIRONMENT in
            stable)
                stop_stable
                sleep 1
                start_stable
                ;;
            dev)
                stop_dev
                sleep 1
                start_dev
                ;;
            both)
                stop_stable
                stop_dev
                sleep 1
                start_stable
                start_dev
                ;;
            *)
                print_usage
                exit 1
                ;;
        esac
        ;;
    status)
        case $ENVIRONMENT in
            stable)
                status_stable
                ;;
            dev)
                status_dev
                ;;
            both)
                status_stable
                echo ""
                status_dev
                ;;
            *)
                print_usage
                exit 1
                ;;
        esac
        ;;
    logs)
        case $ENVIRONMENT in
            stable|dev)
                show_logs $ENVIRONMENT
                ;;
            both)
                show_logs stable
                echo ""
                show_logs dev
                ;;
            *)
                print_usage
                exit 1
                ;;
        esac
        ;;
    *)
        print_usage
        exit 1
        ;;
esac