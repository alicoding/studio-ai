/**
 * Session relationship and checkpoint types
 *
 * SOLID: Single responsibility - session metadata management
 * DRY: Reusable types for session relationships
 */

export interface SessionMetadata {
  sessionId: string
  originalSessionId?: string // First session in the lineage
  parentSessionId?: string // Direct parent if this is a checkpoint
  parentSessionIds?: string[] // Multiple parent references from continuation text
  leafUuid?: string // Unique identifier for conversation thread

  // Checkpoint info
  checkpointReason?: 'context_limit' | 'manual' | 'error' | 'branch'
  checkpointTimestamp?: Date
  summary?: string

  // Role assignment tracking
  assignedRole?: string
  roleAssignedAt?: Date
  roleAssignedBy?: string

  // Session health
  isOrphaned?: boolean // Lost role assignment
  isDivergent?: boolean // Branched from main timeline
  hasConflicts?: boolean // Multiple sessions claiming same role

  // Lineage position
  isRoot?: boolean // First session in the lineage (no parent)
  isLeaf?: boolean // Last session in the lineage (no children)
  isCurrent?: boolean // Currently active session (same as isLeaf)

  // Message signatures for duplicate detection
  messageSignatures?: string[]
}

export interface SessionLineage {
  rootSessionId: string
  sessions: SessionCheckpoint[]
  activeBranch?: string
  mergedSessions?: string[]
}

export interface SessionCheckpoint {
  sessionId: string
  timestamp: Date
  messageCount: number
  summary: string
  reason: SessionMetadata['checkpointReason']
}

export interface SessionRelationship {
  parentId: string
  childId: string
  relationship: 'continuation' | 'branch' | 'merge'
  metadata?: {
    branchName?: string
    mergeConflicts?: string[]
  }
}

// Agent card should show consolidated view
export interface ConsolidatedAgentSession {
  agentId: string
  primarySessionId: string // Current active session
  role: string
  lineage: SessionLineage
  checkpoints: SessionCheckpoint[]
  relationships: SessionRelationship[]

  // Status indicators
  hasOrphanedSessions: boolean
  hasDivergentBranches: boolean
  requiresReconciliation: boolean
}
