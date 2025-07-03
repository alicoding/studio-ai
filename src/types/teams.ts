// Shared type definitions for Teams feature
// SOLID: Single source of truth for team types
// DRY: Reusable across components

export interface TeamAgent {
  role: string
  name?: string // Optional name for display purposes  
  configId?: string // Reference to agent configuration ID
  customizations?: {
    systemPromptAdditions?: string
    tools?: string[]
  }
}

export interface TeamTemplate {
  id: string
  name: string
  description: string
  agents: TeamAgent[]
  createdAt: string
  updatedAt: string
  isDefault?: boolean
}

// For team builder - selected agents with full details
export interface TeamBuilderAgent {
  id: string // Instance ID (unique for each dropped agent)
  name: string
  role: string
  systemPrompt: string
  configId?: string // Original config ID reference
}

// API request/response types
export interface CreateTeamRequest {
  name: string
  description: string
  agents: TeamAgent[]
}

export interface UpdateTeamRequest {
  name?: string
  description?: string
  agents?: TeamAgent[]
}

export interface SpawnTeamRequest {
  projectId: string
}

export interface SpawnTeamResponse {
  message: string
  teamId: string
  projectId: string
  agents: Array<{
    role: string
    instanceId: string
    status: string
  }>
}