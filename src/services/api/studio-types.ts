/**
 * Studio API Types - Re-exports from main types
 * 
 * SOLID: Single source of truth
 * DRY: No duplicate type definitions
 * KISS: Simple re-export
 * Library-First: Follows TypeScript module patterns
 */

// Re-export all types from the main types file
export type {
  // Core entities
  Agent,
  Team,
  TeamAgent,
  Project,
  Message,
  AgentInstance,
  
  // Request/Response types
  CreateAgentData,
  UpdateAgentData,
  CreateTeamData,
  UpdateTeamData,
  UpdateProjectMetadata,
  SendMessageData,
  MentionData,
  SystemMessageData,
  SettingsData,
  SearchIndexData,
  SearchQueryOptions,
  SearchResponse,
  SearchStatsResponse,
  ScreenshotData,
  SpawnTeamResponse,
  
  // Other types
  HookConfig,
  Hook,
  SearchResult,
  SearchIndexStats,
  AgentRole,
  AgentRoleAssignment,
  ProcessStats,
  HealthStatus,
  Screenshot,
  SessionInfo,
  PaginatedResponse,
  ApiResponse,
  ApiError
} from './types'