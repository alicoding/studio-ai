# AI Chat System Guide

## Overview

Claude Studio now includes an integrated AI chat system that allows agents to use hash commands to interact with different AI models through the electronhub.ai API. This system follows KISS (Keep It Simple), Library-First, SOLID, and DRY principles.

## Architecture

The AI chat system is built using:
- **LangChain** - Industry-standard AI orchestration library
- **Zustand persistent stores** - For session management
- **OpenAI-compatible API** - Via electronhub.ai for all models

## Hash Commands

Agents can use these hash commands in the global chat:

### `#search` - Research & Web Search
- **Model**: Perplexity Sonar Pro (default)
- **Use for**: Finding documentation, current information, best practices
- **Example**: `#search latest React 19 features`

### `#debug` - Code Debugging
- **Model**: GPT-4 (default)
- **Use for**: Analyzing code issues, finding bugs, suggesting fixes
- **Example**: `#debug why is my useState not updating`

### `#think` - Deep Analysis & Reasoning
- **Model**: O3-mini (default)
- **Use for**: Complex problem solving, architectural decisions, thorough analysis
- **Example**: `#think should we use microservices or monolith`

## Configuration

### Environment Variables
```env
VITE_ELECTRONHUB_API_KEY=your-key-here
VITE_ELECTRONHUB_API_URL=https://api.electronhub.ai/v1
```

### Customizing Capabilities

1. Go to Settings → AI tab
2. Click on a capability or create a new one
3. Configure:
   - **Name & Description**: Display name and purpose
   - **Model**: Select from 500+ available models
   - **System Prompt**: Define the AI's behavior
   - **Context Settings**: Include files, history, project info
   - **Advanced Settings**: Temperature, max tokens, etc.

### Available Models

The system supports all models available through electronhub.ai including:
- OpenAI models (GPT-4, GPT-3.5)
- Anthropic models (Claude 3 Opus, Sonnet, Haiku)
- Google models (Gemini Pro, Gemini Flash)
- Perplexity models (Sonar Pro for web search)
- DeepSeek models (V3, R1)
- Open source models (Llama, Mistral, etc.)

## Implementation Details

### Core Components

1. **LangChainService** (`/src/lib/ai/LangChainService.ts`)
   - Singleton service managing AI interactions
   - Creates LangChain tools from capability configs
   - Handles session management

2. **GlobalChat** (`/src/components/chat/GlobalChat.tsx`)
   - Detects hash commands with regex `/^#\w+/`
   - Routes to LangChain for AI capabilities
   - Shows "🤖 Using AI capabilities..." indicator

3. **AICapabilitiesTab** (`/src/components/settings/AICapabilitiesTab.tsx`)
   - UI for configuring AI capabilities
   - Allows editing prompts, models, and settings
   - Includes test panel for verification

4. **Persistent Storage** (`/src/stores/aiSessions.ts`)
   - Maintains conversation history
   - Survives page refreshes
   - Integrates with existing storage system

### Adding New Capabilities

To add a new hash command:

1. Create capability in the UI or programmatically:
```typescript
capabilityStore.saveCapability({
  id: 'your-command',
  name: 'Your Command Name',
  description: 'What this command does',
  category: 'research|analysis|generation|validation|custom',
  models: { primary: 'model-name' },
  prompts: { system: 'You are a...' },
  // ... other config
})
```

2. The system automatically:
   - Creates a LangChain tool
   - Maps hash commands to the tool
   - Handles multi-turn conversations

### Testing

Use the AI Test Panel in Settings → AI tab to:
- Test each hash command
- Verify model responses
- Check tool routing
- Debug issues

## Best Practices

1. **Model Selection**
   - Use Perplexity models for web search
   - Use GPT-4 for code-related tasks
   - Use O3/O4 models for complex reasoning
   - Use Claude for nuanced conversations

2. **Prompt Engineering**
   - Keep system prompts focused and clear
   - Include relevant context in prompts
   - Test prompts with the test panel

3. **Performance**
   - Models are loaded on-demand
   - Sessions are cached in memory
   - API calls are made directly to electronhub.ai

## Troubleshooting

### Common Issues

1. **"output values have 3 keys" error**
   - Fixed by handling AgentExecutor output properly
   - Result object contains: input, chat_history, output

2. **Model not found**
   - Check available models in the dropdown
   - Verify model name matches exactly
   - Some models may require specific API access

3. **No response from AI**
   - Check API key is set correctly
   - Verify network connection
   - Check browser console for errors

### Debug Mode

Enable verbose logging:
```typescript
// In LangChainService
console.log('[LangChain] Calling executor with message:', message)
console.log('[LangChain] Raw result:', result)
console.log('[LangChain] Result keys:', Object.keys(result))
```

## Future Enhancements

- Streaming responses
- File upload support
- Multi-modal capabilities (images, documents)
- Custom tool creation UI
- Analytics and usage tracking