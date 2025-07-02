# Claude Studio Configuration Architecture

## Overview
Single source of truth for all configuration with clear separation between Claude Studio settings and native Claude Code settings.

## Configuration Hierarchy

```
~/.claude-studio/                    # Our app's config directory
├── config.json                      # Master configuration file
├── projects/                        # Project-specific configs
│   └── {project-id}/
│       ├── project.json            # Project metadata & settings
│       ├── agents.json             # Active agents in project
│       └── sessions/               # Agent session data
│           └── {agent-id}.jsonl    # Message history (Claude format)
├── agents/                         # Agent configurations
│   └── {agent-id}.json            # Individual agent config
├── teams/                          # Team templates
│   └── {team-id}.json             # Team composition & config
└── system.json                     # System-wide settings

~/.claude/                          # Native Claude Code directory (READ-ONLY)
├── settings.json                   # Claude's native settings
└── {session-id}/                   # Claude's session files
    └── conversation.jsonl          # Native conversation history
```

## Configuration Schema

### 1. Master Config (`~/.claude-studio/config.json`)
```json
{
  "version": "1.0.0",
  "systemConfig": {
    "claudeCodePath": "/usr/local/bin/claude",
    "defaultWorkspacePath": "~/projects",
    "apiEndpoint": "http://localhost:3000",
    "theme": "dark",
    "telemetry": false
  },
  "projects": ["project-1", "project-2"],  // Active project IDs
  "agents": ["agent-1", "agent-2"],        // All agent IDs
  "teams": ["team-1", "team-2"]            // All team IDs
}
```

### 2. Project Config (`projects/{id}/project.json`)
```json
{
  "id": "project-1",
  "name": "My Web App",
  "description": "Next.js application",
  "workspacePath": "/Users/me/projects/my-web-app",
  "created": "2024-01-01T00:00:00Z",
  "lastModified": "2024-01-02T00:00:00Z",
  "activeAgents": ["agent-1", "agent-2"],
  "settings": {
    "envVars": {},
    "disabledTools": [],
    "mcpServers": []
  }
}
```

### 3. Agent Config (`agents/{id}.json`)
```json
{
  "id": "agent-1",
  "name": "Frontend Dev",
  "role": "developer",
  "model": "claude-3-opus",
  "systemPrompt": "You are a frontend developer...",
  "tools": ["read", "write", "bash"],
  "maxTokens": 200000,
  "temperature": 0.7,
  "created": "2024-01-01T00:00:00Z"
}
```

### 4. Team Template (`teams/{id}.json`)
```json
{
  "id": "team-1",
  "name": "Full Stack Team",
  "description": "Complete development team",
  "agents": [
    { "role": "developer", "count": 2 },
    { "role": "designer", "count": 1 },
    { "role": "tester", "count": 1 }
  ],
  "created": "2024-01-01T00:00:00Z"
}
```

## Configuration Service

```typescript
// src/services/ConfigService.ts
class ConfigService {
  private configDir = path.join(os.homedir(), '.claude-studio')
  
  // Master config operations
  async getConfig(): Promise<MasterConfig>
  async updateSystemConfig(config: SystemConfig): Promise<void>
  
  // Project operations
  async createProject(project: ProjectConfig): Promise<void>
  async getProject(id: string): Promise<ProjectConfig>
  async updateProject(id: string, updates: Partial<ProjectConfig>): Promise<void>
  async deleteProject(id: string): Promise<void>
  
  // Agent operations
  async createAgent(agent: AgentConfig): Promise<void>
  async getAgent(id: string): Promise<AgentConfig>
  async updateAgent(id: string, updates: Partial<AgentConfig>): Promise<void>
  async deleteAgent(id: string): Promise<void>
  
  // Team operations
  async createTeam(team: TeamConfig): Promise<void>
  async getTeam(id: string): Promise<TeamConfig>
  async updateTeam(id: string, updates: Partial<TeamConfig>): Promise<void>
  async deleteTeam(id: string): Promise<void>
  
  // Session operations (links to Claude native)
  async linkClaudeSession(projectId: string, agentId: string, sessionId: string): Promise<void>
  async getAgentHistory(projectId: string, agentId: string): Promise<Message[]>
}
```

## Integration Points

### 1. Claude Code Native Settings
- **READ ONLY**: Never modify `~/.claude/settings.json`
- Pass configs via CLI flags: `--allowedTools`, `--disallowedTools`, `--model`, etc.
- Link to native session IDs for conversation continuity

### 2. CLAUDE.md Integration
- Store user's global CLAUDE.md path in system config
- Allow project-specific CLAUDE.md overrides
- Inject into agent system prompts

### 3. Environment Variables
- System-level env vars in master config
- Project-level env vars override system
- Agent-level env vars override project

## Migration Strategy

1. **Phase 1**: Create ConfigService with file-based storage
2. **Phase 2**: Migrate existing in-memory configs to files
3. **Phase 3**: Add import/export functionality
4. **Phase 4**: Add config versioning and migration

## Benefits

1. **Single Source of Truth**: All configs in `~/.claude-studio/`
2. **Clear Separation**: Our configs vs Claude's native configs
3. **Hierarchical**: System → Project → Team → Agent precedence
4. **Persistent**: Everything saved to disk
5. **Portable**: Easy backup/restore of entire config directory
6. **Extensible**: Easy to add new config types