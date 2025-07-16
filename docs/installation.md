# Installation Guide

This guide will help you set up Claude Studio on your local machine in less than 10 minutes.

## Prerequisites

- **Node.js** 18+ (recommended: use [nvm](https://github.com/nvm-sh/nvm))
- **PostgreSQL** 14+ (optional, falls back to SQLite)
- **Redis** (optional, for multi-server setups)
- **Claude API Key** from [Anthropic Console](https://console.anthropic.com/)

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/anthropics/claude-studio.git
cd claude-studio
npm install
```

### 2. Environment Setup

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

```bash
# Required: Get from https://console.anthropic.com/
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Required: Generate with: openssl rand -hex 32
CLAUDE_STUDIO_ENCRYPTION_KEY=your_32_character_hex_encryption_key_here

# Optional: For enhanced AI features
ELECTRONHUB_API_KEY=your_electronhub_api_key_here
```

### 3. Database Setup

**Option A: SQLite (Default)**
No setup required - Claude Studio will create the database automatically.

**Option B: PostgreSQL (Recommended for Production)**

```bash
# Install PostgreSQL (macOS)
brew install postgresql
brew services start postgresql

# Create database
createdb claude_studio

# Update .env
USE_POSTGRES_SAVER=true
POSTGRES_CONNECTION_STRING=postgresql://username:password@localhost:5432/claude_studio
```

### 4. Start the Development Server

```bash
npm run dev
```

This starts:

- **Frontend**: http://localhost:5173
- **API Server**: http://localhost:3456
- **WebSocket**: ws://localhost:3456

### 5. Verify Installation

1. Open http://localhost:5173 in your browser
2. You should see the Claude Studio interface
3. Click "Create Project" to start your first workflow

## Production Setup

### Environment Variables

```bash
# Production settings
NODE_ENV=production
USE_MOCK_AI=false

# Security
CLAUDE_STUDIO_ENCRYPTION_KEY=<secure-32-char-hex-key>

# Database
USE_POSTGRES_SAVER=true
POSTGRES_CONNECTION_STRING=postgresql://user:pass@host:5432/claude_studio

# Redis (for multi-server)
REDIS_URL=redis://localhost:6379
```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build manually
docker build -t claude-studio .
docker run -p 3456:3456 -e ANTHROPIC_API_KEY=your_key claude-studio
```

### Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3456;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Configuration Options

### Agent Models

Configure which AI models your agents use:

```bash
# Default model for new agents
DEFAULT_MODEL=claude-3-opus-20240229

# Maximum tokens per response
DEFAULT_MAX_TOKENS=200000

# Token usage warning threshold
TOKEN_WARNING_THRESHOLD=0.8
```

### Storage Options

```bash
# Session storage directory
SESSION_DIR=~/.claude-ea/sessions

# Agent registry path
REGISTRY_PATH=/tmp/claude-agents/registry.json

# Workflow persistence schema
POSTGRES_SCHEMA=workflow_checkpoints
```

### Development Options

```bash
# Enable mock AI for testing
USE_MOCK_AI=true

# Development server ports
DEV_SERVER_PORT=5173
PORT=3456
WS_PORT=3456
```

## Troubleshooting

### Common Issues

**1. "CLAUDE_STUDIO_ENCRYPTION_KEY is required"**

```bash
# Generate a secure key
openssl rand -hex 32
# Add to .env file
```

**2. "PostgreSQL connection failed"**

```bash
# Check PostgreSQL is running
brew services list | grep postgresql

# Test connection
psql postgresql://username:password@localhost:5432/claude_studio
```

**3. "WebSocket connection failed"**

- Ensure no other services are using ports 3456/5173
- Check firewall settings
- Verify CORS configuration in production

**4. "Agent failed to load"**

- Verify ANTHROPIC_API_KEY is valid
- Check API quota and billing
- Review agent configuration and permissions

### Getting Help

- **Documentation**: [docs/](./docs/)
- **GitHub Issues**: [Report a bug](https://github.com/anthropics/claude-studio/issues)
- **Community**: [Discord Server](https://discord.gg/claude-studio)

## Next Steps

- **[Quick Start Tutorial](./quick-start.md)** - Build your first workflow
- **[Architecture Overview](./architecture.md)** - Understand the system
- **[Contributing Guide](../CONTRIBUTING.md)** - Join the development
- **[Examples](../examples/)** - See real workflow patterns

## System Requirements

### Minimum

- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 1GB available space
- **Network**: Internet connection for AI API calls

### Recommended

- **CPU**: 4+ cores
- **RAM**: 8GB+
- **Storage**: 10GB+ (for workflow history)
- **Database**: PostgreSQL for production workloads
