/**
 * Team Types - Re-exports and team-specific types
 * 
 * SOLID: Single source of truth
 * DRY: Re-uses core types from API
 * KISS: Simple re-exports with minimal additions
 */

// Re-export core team types from API
export type {
  Team as TeamTemplate,
  TeamAgent,
  CreateTeamData as CreateTeamRequest,
  UpdateTeamData as UpdateTeamRequest,
  SpawnTeamResponse
} from '../services/api/types'

// Team-specific types not in core API

// For team builder - selected agents with full details
export interface TeamBuilderAgent {
  id: string // Instance ID (unique for each dropped agent)
  name: string
  role: string
  systemPrompt: string
  configId?: string // Original config ID reference
}

export interface SpawnTeamRequest {
  projectId: string
}