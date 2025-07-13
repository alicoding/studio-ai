# AI Orchestration Usage Guide

## Overview
The new AI orchestration system allows Studio agents to leverage multiple AI models with configurable capabilities. All configurations can be managed through the UI without code changes.

## Key Features

### 1. Configurable Capabilities
- Edit prompts through UI
- Add new models
- Customize behavior
- Import/export configurations

### 2. Multi-Model Orchestration
- Automatic model selection based on task
- Conversation threading across models
- Context sharing between models
- Delegation support

### 3. Simple Agent Interface
```typescript
import { agentAI } from '@/lib/ai/orchestration/AgentAI'

// Auto-detect capability
const result = await agentAI.request("Research the latest React patterns")

// Specific capability
const analysis = await agentAI.think("How should we architect this feature?")

// Command style
const review = await agentAI.command('/code-review "Check this implementation"')

// Mention style
const plan = await agentAI.mention('@ai-planning Create migration strategy')
```

## Configuration UI

Navigate to Settings > AI Capabilities to:

1. **View Default Capabilities**
   - Deep Thinking (O3, Gemini Pro)
   - Research (Perplexity, Sonar)
   - Code Review (GPT-4, Claude)
   - Test Generation
   - Planning

2. **Create Custom Capabilities**
   - Click "+" to create new capability
   - Configure prompts, models, context
   - Set interaction rules

3. **Edit Existing Capabilities**
   - Click any capability to edit
   - Modify system/user prompts
   - Change model preferences
   - Adjust context settings

## Example: Creating a Custom Capability

### Financial Analysis Capability

1. Click "+" in AI Capabilities
2. Configure:

```json
{
  "id": "financial-analysis",
  "name": "Financial Analysis",
  "category": "analysis",
  "models": {
    "primary": "gpt-4",
    "fallback": ["claude-3-opus"],
    "selection": "auto"
  },
  "prompts": {
    "system": "You are a financial analyst expert. Analyze financial data and provide insights on:\n- Revenue trends\n- Cost optimization\n- Investment opportunities\n- Risk assessment\n\nContext: {context}\nFocus: {focus}",
    "user": "Analyze the following financial data:\n{prompt}\n\nSpecific requirements: {requirements}"
  },
  "context": {
    "includeProject": true,
    "maxTokens": 4000
  }
}
```

3. Save and use:

```typescript
const analysis = await agentAI.requestWithCapability(
  'financial-analysis',
  'Q4 revenue data shows 15% growth...',
  {
    context: {
      focus: 'sustainability',
      requirements: 'Include 5-year projections'
    }
  }
)
```

## Prompt Variables

Available variables in prompts:
- `{prompt}` - User's input
- `{context}` - Provided context object
- `{files}` - File paths if included
- `{capability}` - Current capability name
- `{model}` - Selected model
- `{history}` - Conversation history
- Any custom variables from context

## Model Selection Strategies

1. **Auto** - System picks best model
2. **Manual** - Always use primary model
3. **Cost-Optimized** - Prefer cheaper models
4. **Performance** - Always use best model

## Advanced Features

### Delegation
Enable capabilities to delegate to others:

```typescript
// In capability config
"interaction": {
  "delegationEnabled": true,
  "delegateTo": ["research", "code-analysis"]
}
```

### Multi-Turn Conversations
```typescript
const response1 = await agentAI.think("Design a caching strategy")
// Continues conversation with context
const response2 = await agentAI.think("What about edge cases?", {
  context: { continueConversation: true }
})
```

### Custom Output Formats
Configure output format per capability:
- `text` - Plain text
- `markdown` - Formatted markdown
- `json` - Structured data
- `code` - Code blocks

## Best Practices

1. **Start with defaults** - Modify existing capabilities rather than creating from scratch
2. **Test prompts** - Use the test interface before saving
3. **Version control** - Export important capabilities
4. **Context limits** - Be mindful of token limits
5. **Model costs** - Consider cost when selecting models

## Migration from Old System

Old system:
```typescript
// Direct API calls
const response = await aiService.thinkDeep({
  prompt: "How to scale?",
  model: "o3"
})
```

New system:
```typescript
// Configurable capabilities
const response = await agentAI.think("How to scale?")
// Model selected automatically based on capability config
```

## Troubleshooting

1. **No response** - Check if model is configured with API key
2. **Wrong model used** - Verify capability model settings
3. **Missing context** - Ensure context settings are enabled
4. **Delegation loops** - Check delegation settings

## Future Enhancements

- Visual prompt builder
- Capability marketplace
- Performance analytics
- Cost tracking
- A/B testing for prompts