# Remaining Legacy Storage Issues

## Critical Issue Found: Project-Agent Mapping

### Problem in `/web/server/api/agents.ts`

The agents API is still trying to read project configurations from JSON files in the file system instead of using the unified storage:

1. **GET /api/agents** (lines 31-53)
   - Reads from `~/.claude-studio/projects/{project-id}.json`
   - Looking for `agentIds` array in these JSON files
   - Files don't exist, causing "No project config found" errors

2. **GET /api/agents/:id** (lines 83-101)
   - Same issue - reads from `~/.claude-studio/projects/{project-id}.json`
   - Tries to check which projects use this agent

3. **PUT /api/agents/:id** (lines 191-206)
   - Also tries to read these project JSON files

### Why This Causes Confusion

Just like the legacy agent configurations:

- The code expects data in JSON files that no longer exist
- The actual data is in SQLite via ConfigService
- This creates inconsistent behavior between API and UI

### The Fix Needed

Replace file system reads with proper service calls:

```typescript
// Instead of reading from files:
const projectConfigPath = path.join(
  os.homedir(),
  '.claude-studio',
  'projects',
  `${project.id}.json`
)
const projectData = await fs.readFile(projectConfigPath, 'utf-8')

// Use the ConfigService:
const projectConfig = await configService.getProject(project.id)
const agentIds = projectConfig?.activeAgents || []
```

### Other Areas Checked (Clean)

These services are properly using unified storage:

- ✅ ServerConfigService - Uses UnifiedStorage
- ✅ StudioProjectMetadata - Uses UnifiedStorage
- ✅ ConfigService (frontend) - Uses ClientStorage
- ✅ All other configuration services

### Legitimate File Access (Not Issues)

These are intentional file operations:

- Claude settings (`.claude/settings.json`) - For Claude compatibility
- MCP config files - Temporary files for external tools
- Screenshot files - Temporary files
- Claude session JSONL files - For reading Claude conversations

### Cleanup Opportunity

The `/data` directory with old JSON backups can be removed:

```
/data/
├── agents/
├── backup/
├── settings/
└── teams/
```

## Summary

The main remaining issue is that the agents API is still trying to read project-agent mappings from the file system. This needs to be updated to use the unified storage system to ensure consistency across the application.
