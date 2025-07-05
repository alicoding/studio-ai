# Global Chat Assistant

## Overview
The Global Chat Assistant provides an AI-powered chat interface accessible from anywhere in Claude Studio. It supports multiple AI models through OpenAI-compatible providers, with ElectronHub integration for easy access to various models.

## Features
- **Global Access**: Floating chat button available on all pages
- **Multiple Models**: Support for GPT-4, Claude, Gemini, Llama, and more
- **Streaming Responses**: Real-time streaming for better UX
- **Conversation Management**: Multiple conversations with persistence
- **Fullscreen Mode**: Expand chat for longer conversations
- **Model Switching**: Easy switching between AI models

## Configuration

### 1. Get ElectronHub API Key
1. Visit https://api.electronhub.ai
2. Sign up and get your API key
3. Add to your `.env` file:
```env
VITE_ELECTRONHUB_API_KEY=your-electronhub-api-key-here
```

### 2. Available Models
Through ElectronHub, you have access to:
- **GPT Models**: gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo
- **Claude Models**: claude-3-opus, claude-3-sonnet, claude-3-haiku
- **Gemini Models**: gemini-2.0-flash-thinking, gemini-1.5-pro, gemini-1.5-flash
- **Llama Models**: llama-3.3-70b, llama-3.1-70b
- **DeepSeek**: deepseek-v3
- **Perplexity (with search)**: sonar-large, sonar-small, sonar-huge

## Architecture

### Components
- **GlobalChat.tsx**: Main chat UI component
- **ChatManager.ts**: Manages chat providers and API calls
- **OpenAIProvider.ts**: OpenAI-compatible API implementation
- **chat store**: Zustand store for chat state management

### Key Design Decisions
1. **OpenAI-Compatible**: Uses OpenAI's API format for compatibility
2. **Provider Agnostic**: Easy to add new providers
3. **Global State**: Chat persists across navigation
4. **Streaming Support**: Better UX for long responses

## Usage

### Basic Chat
1. Click the chat button in the bottom right
2. Select a model from the dropdown
3. Type your message and press Enter

### Managing Conversations
- Click "+" to create new conversation
- Click on tabs to switch between conversations
- Click "x" on tabs to delete conversations
- Conversations are persisted in localStorage

### Model Selection
- Use the dropdown in the chat header
- Models are grouped by provider
- Selection persists across sessions

## Integration with Studio Agents

In the future, this chat system will replace the Zen MCP integration for Studio agents:

1. **Direct Integration**: Agents can use ChatManager directly
2. **Consistent API**: Same interface for both UI and agent usage
3. **Better Performance**: No MCP overhead
4. **More Control**: Direct access to streaming, functions, etc.

### Example Agent Usage
```typescript
import { ChatManager } from '@/lib/chat'

const chatManager = ChatManager.getInstance()

// In agent code
const response = await chatManager.createChatCompletion({
  model: 'gpt-4o',
  messages: [
    { role: 'system', content: 'You are a helpful coding assistant.' },
    { role: 'user', content: 'Explain this code...' }
  ],
  temperature: 0.7
})
```

## Troubleshooting

### API Key Issues
- Ensure your ElectronHub API key is set in `.env`
- Restart the dev server after adding the key
- Check browser console for specific errors

### Model Availability
- Some models may have usage limits
- Check ElectronHub dashboard for quota
- Try switching to a different model

### Performance
- Use streaming for better perceived performance
- Consider using faster models (gpt-4o-mini, claude-haiku) for simple tasks
- Limit conversation history if needed

## Future Enhancements
1. **Function Calling**: Support for OpenAI function calling
2. **Image Support**: Multi-modal capabilities for vision models
3. **Code Interpreter**: Built-in code execution
4. **Export/Import**: Save and share conversations
5. **Custom Providers**: Easy addition of new AI providers