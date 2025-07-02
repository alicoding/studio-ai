export interface ClaudeProject {
  id: string
  name: string
  path: string
  sessionCount: number
  lastModified: Date
  sessions: string[]
}

export interface TeamDefinition {
  id: string
  name: string
  description?: string
  agentIds: string[] // IDs of agents in this team
}

export interface ProjectAgentAssignment {
  agentId: string
  teamId?: string // If part of a team
  isActive: boolean
  addedAt: Date
}

export interface ProjectMetadata {
  projectId: string
  status: 'active' | 'archived' | 'draft'
  tags: string[]
  favorite: boolean
  notes: string
  lastModified: Date | string
  
  // New fields for agents and teams
  agents?: ProjectAgentAssignment[]
  teams?: TeamDefinition[]
  activeAgentIds?: string[] // Currently active agents in sidebar
}