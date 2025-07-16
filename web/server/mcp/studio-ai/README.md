# Studio AI MCP Server

A thin bridge MCP server that connects Claude to Studio AI's configurable AI capabilities.

## Architecture

This MCP server follows the **thin bridge pattern**:

- **KISS**: Single tool with parameter-based routing
- **DRY**: Reuses existing Studio AI APIs
- **Library-First**: Built on standard MCP SDK
- **Low-Code**: All AI behavior configured through UI

## How It Works

```
Claude → MCP Tool Call → Studio AI Server → Studio AI API → AI Provider
```

1. Claude calls the `studio-ai` tool with:
   - `type`: 'chat', 'command', or 'mention'
   - `input`: The user's message
   - `context`: Optional project/session info

2. MCP server routes to appropriate API:
   - **@mentions** → `/api/messages/mention`
   - **#commands** → `/api/ai/execute` (with capability lookup)
   - **chat** → `/api/ai/execute` (with capability ID)

3. Studio AI executes with UI-configured:
   - Model selection (GPT-4, Claude, Perplexity, etc.)
   - Custom prompts
   - Temperature and token limits
   - Fallback models

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the Server

```bash
npm run build
```

### 3. Configure Environment

Add to your `.env` file:

```env
# For ElectronHub (supports multiple models)
ELECTRONHUB_API_KEY=your-key
ELECTRONHUB_API_URL=https://api.electronhub.ai/v1

# Or direct provider keys
OPENAI_API_KEY=your-key
ANTHROPIC_API_KEY=your-key
```

### 4. Configure Claude

Add to Claude's MCP config:

```json
{
  "mcpServers": {
    "studio-ai": {
      "command": "node",
      "args": ["/path/to/studio-ai/dist/index.js"],
      "env": {
        "STUDIO_AI_API": "http://localhost:3000/api"
      }
    }
  }
}
```

## Testing

### Test the Server

```bash
./test-server.sh
```

### Test AI Endpoint

```bash
# Start Studio AI server first
npm run server

# In another terminal
tsx test-ai-endpoint.ts
```

## Usage Examples

### Using #commands

```
User: #search TypeScript best practices
Claude: [Uses studio-ai tool with type='command', input='#search TypeScript best practices']
Result: [Executes with Perplexity model configured in UI]
```

### Using @mentions

```
User: @reviewer please check this code
Claude: [Uses studio-ai tool with type='mention', input='@reviewer please check this code']
Result: [Routes to reviewer agent]
```

### Direct Chat

```
User: Explain async/await
Claude: [Uses studio-ai tool with type='chat', capability='general-chat']
Result: [Uses configured model and prompts]
```

## Extending

All capabilities are configured through Studio AI's UI:

1. Go to Settings → AI Capabilities
2. Add new capability with trigger, model, prompts
3. Claude can immediately use it via MCP

No code changes needed!
