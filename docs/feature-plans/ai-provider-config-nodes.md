# AI Provider Configuration Node System

## Overview & Requirements

Create a sophisticated AI provider configuration system that addresses the limitations of n8n's approach while providing better isolation, reusability, and future extensibility.

## User Experience Flow

### Current Problem (n8n-style issues):

- Provider selection in each AI node (dropdown conflicts with React Flow)
- No sharing of provider configurations
- n8n bug: changing one config affects all others globally

### Proposed Solution:

1. **Provider Config Nodes**: Separate nodes for AI provider configurations
2. **AI Task Nodes**: Reference config nodes, focus on task logic
3. **Proper Isolation**: Each config node is independent
4. **Future-Proof**: Works with any AI-consuming node type

## Technical Architecture

### 1. Configuration Node Types

```typescript
// Base configuration interface
interface AIProviderConfig {
  id: string
  name: string // User-friendly name like "Production OpenAI" or "Dev Anthropic"
  provider: 'openai' | 'anthropic' | 'azure' | 'google' | 'custom'
  apiKey?: string
  baseUrl?: string
  organizationId?: string
  // Provider-specific settings
  settings: Record<string, unknown>
}

// Specific provider configurations
interface OpenAIConfig extends AIProviderConfig {
  provider: 'openai'
  settings: {
    organization?: string
    project?: string
    maxRetries?: number
    timeout?: number
  }
}

interface AnthropicConfig extends AIProviderConfig {
  provider: 'anthropic'
  settings: {
    version?: string
    maxRetries?: number
    timeout?: number
  }
}

interface CustomConfig extends AIProviderConfig {
  provider: 'custom'
  settings: {
    headers?: Record<string, string>
    authType?: 'bearer' | 'api-key' | 'custom'
    modelFormat?: 'openai' | 'anthropic' | 'custom'
  }
}
```

### 2. Configuration Node Components

```typescript
// Individual config node types
;-OpenAIConfigNode -
  AnthropicConfigNode -
  AzureConfigNode -
  GoogleAIConfigNode -
  CustomAPIConfigNode

// Each handles provider-specific configuration
// NO prompts or task logic - pure configuration
```

### 3. AI Task Node Redesign

```typescript
// n8n-Style Multiple Connection Types
interface AITaskNodeData {
  label: string
  task: string
  systemPrompt?: string
  // Remove provider dropdown - use bottom connections instead
  model?: string
  temperature?: number
  maxTokens?: number
  // Task-specific parameters only
}

// Multiple handle types like n8n AI nodes
interface AINodeConnections {
  dataInput: Handle // Left - workflow data input
  dataOutput: Handle // Right - workflow data output
  providerConfig: Handle // Bottom-left - AI provider configuration
  memoryConfig?: Handle // Bottom-center - Memory/context (future)
  toolsConfig?: Handle // Bottom-right - Tools configuration (future)
}
```

### 4. Configuration Reference System

```typescript
// AI node references config by ID
const configNode = getConfigNode(nodeData.configNodeId)
if (!configNode) {
  throw new Error(`Configuration node ${nodeData.configNodeId} not found`)
}

// Runtime: merge config with task parameters
const apiCall = {
  ...configNode.settings,
  model: nodeData.model,
  messages: [
    { role: 'system', content: nodeData.systemPrompt },
    { role: 'user', content: nodeData.task },
  ],
  temperature: nodeData.temperature,
}
```

## Atomic Tasks

### Phase 1: Foundation

- [ ] Design configuration node schema and interfaces
- [ ] Create base ConfigurationNode component with common UI patterns
- [ ] Implement configuration storage in workflow builder store
- [ ] Add config node validation and connection testing

### Phase 2: Provider-Specific Nodes

- [ ] Implement OpenAIConfigNode component
- [ ] Implement AnthropicConfigNode component
- [ ] Implement AzureConfigNode component
- [ ] Implement GoogleAIConfigNode component
- [ ] Implement CustomAPIConfigNode component

### Phase 3: AI Node Integration

- [ ] Remove provider dropdown from AI task node
- [ ] Add configuration node reference dropdown
- [ ] Implement config node lookup and validation
- [ ] Update AI node to use referenced configuration

### Phase 4: Node Palette & UX

- [ ] Add config nodes to node palette under "Configuration" category
- [ ] Implement config node connection validation (no data connections)
- [ ] Add visual indicators for config relationships
- [ ] Create config node templates and presets

### Phase 5: Runtime Integration

- [ ] Update workflow execution to resolve config nodes
- [ ] Implement proper error handling for missing configs
- [ ] Add config node health checking and validation
- [ ] Test with complex multi-provider workflows

### Phase 6: Advanced Features

- [ ] Configuration node encryption for sensitive data
- [ ] Config node sharing across workflows
- [ ] Environment-based config switching (dev/prod)
- [ ] Config node versioning and migration

## Dependencies & Risk Assessment

### Dependencies:

- Workflow builder store architecture (existing)
- Node palette system (existing)
- React Flow node registration (existing)
- Backend workflow execution system (existing)

### Risks:

- **Breaking Change**: Existing AI nodes will need migration
- **Complexity**: Multi-node configuration increases cognitive load
- **Validation**: Config node dependencies add validation complexity
- **Performance**: Additional lookups during workflow execution

### Mitigation:

- Implement backward compatibility for existing workflows
- Provide migration tool for current AI nodes
- Clear UI patterns and documentation
- Efficient config caching during execution

## Testing Strategy & Success Metrics

### Test Scenarios:

1. **Basic Config**: Single AI node with one config node
2. **Sharing**: Multiple AI nodes sharing same config
3. **Isolation**: Multiple configs for same provider working independently
4. **Future Nodes**: New node types consuming existing configs
5. **Migration**: Existing workflows work after upgrade

### Success Metrics:

- Zero dropdown interaction conflicts with React Flow
- Config nodes reusable across multiple AI nodes
- No global state pollution (n8n bug avoided)
- Easy addition of new provider types
- Clean separation of concerns (config vs. task logic)

### Future Extensibility:

- **New Node Types**:
  - AI Image Generation nodes
  - AI Code Review nodes
  - AI Translation nodes
  - AI Data Processing nodes
- **All can reference same config nodes**

## Implementation Priority

**HIGH PRIORITY**:

- Foundation and provider-specific nodes (Phases 1-2)
- Basic AI node integration (Phase 3)

**MEDIUM PRIORITY**:

- Enhanced UX and palette integration (Phase 4)
- Runtime integration (Phase 5)

**LOW PRIORITY**:

- Advanced features like encryption and sharing (Phase 6)

This system will solve the immediate dropdown issues while creating a robust, extensible foundation for all future AI integrations in Studio AI.
