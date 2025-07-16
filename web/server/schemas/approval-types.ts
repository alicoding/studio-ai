/**
 * Approval System Types - Complete type definitions for human approval workflow
 *
 * SOLID: Interface segregation - separate types for different concerns
 * DRY: Centralized type definitions used across approval system
 * KISS: Simple, clear type definitions without overengineering
 * Library-First: Uses standard TypeScript utility types
 */

// Core approval status and decision types
export type ApprovalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'cancelled'
  | 'acknowledged'
export type ApprovalDecision = 'approved' | 'rejected' | 'acknowledged'
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'
export type InteractionType = 'approval' | 'notification' | 'input'
export type NotificationChannel = 'websocket' | 'email' | 'slack' | 'sms' | 'webhook' | 'push'
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced'

// Core workflow approval entity
export interface WorkflowApproval {
  id: string
  threadId: string
  stepId: string
  projectId?: string
  workflowName?: string

  // Approval content
  prompt: string
  contextData?: string // JSON blob with workflow context
  riskLevel: RiskLevel

  // Timing and timeout
  requestedAt: string // ISO datetime
  timeoutSeconds: number
  expiresAt: string // ISO datetime

  // Status and resolution
  status: ApprovalStatus
  resolvedAt?: string // ISO datetime
  resolvedBy?: string // User ID who made the decision
  assignedTo?: string // User ID who is assigned to handle the approval

  // Approval configuration
  approvalRequired: boolean
  autoApproveAfterTimeout: boolean
  escalationUserId?: string
  interactionType: InteractionType // Type of human interaction required

  // Metadata
  createdAt: string // ISO datetime
  updatedAt: string // ISO datetime
}

// Approval decision audit record
export interface ApprovalDecisionRecord {
  id: string
  approvalId: string

  // Decision details
  decision: ApprovalDecision
  comment?: string
  reasoning?: string
  confidenceLevel?: number // 1-5 scale

  // Decision maker
  decidedBy: string // User ID
  decidedAt: string // ISO datetime

  // Context at time of decision
  workflowState?: string // JSON snapshot
  userAgent?: string
  ipAddress?: string

  // Metadata
  createdAt: string // ISO datetime
}

// Notification tracking record
export interface ApprovalNotification {
  id: string
  approvalId: string

  // Notification details
  channelType: NotificationChannel
  recipient: string
  subject?: string
  message?: string

  // Delivery tracking
  status: NotificationStatus
  sentAt?: string // ISO datetime
  deliveredAt?: string // ISO datetime
  failedAt?: string // ISO datetime
  errorMessage?: string
  retryCount: number
  maxRetries: number

  // Metadata
  createdAt: string // ISO datetime
  updatedAt: string // ISO datetime
}

// Request/Response DTOs for API endpoints
export interface CreateApprovalRequest {
  threadId: string
  stepId: string
  projectId?: string
  workflowName?: string
  prompt: string
  contextData?: Record<string, unknown>
  riskLevel?: RiskLevel
  timeoutSeconds?: number
  approvalRequired?: boolean
  autoApproveAfterTimeout?: boolean
  escalationUserId?: string
  interactionType?: InteractionType // Type of human interaction required
}

export interface ApprovalDecisionRequest {
  decision: ApprovalDecision
  comment?: string
  reasoning?: string
  confidenceLevel?: number
  decidedBy: string
}

export interface ApprovalContextData {
  // Workflow context
  workflowSteps: Array<{
    id: string
    task: string
    status: string
    output?: string
    executedAt?: string
  }>
  previousStepOutputs: Record<string, string>
  currentStepIndex: number

  // Project context
  projectName?: string
  projectDescription?: string

  // Risk and impact assessment
  impactAssessment?: {
    nextStepsPreview: string[]
    risksIfApproved: string[]
    risksIfRejected: string[]
    businessImpact: string
  }

  // Historical context
  similarApprovals?: Array<{
    prompt: string
    decision: ApprovalDecision
    outcome: string
    decidedAt: string
  }>
}

// Approval list response with pagination
export interface ApprovalListResponse {
  approvals: WorkflowApproval[]
  pagination: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
  summary: {
    pendingCount: number
    overdueCount: number
    approvedToday: number
    rejectedToday: number
  }
}

// Approval with enriched context for UI display
export interface EnrichedApproval extends Omit<WorkflowApproval, 'contextData'> {
  contextData: ApprovalContextData
  timeRemaining?: number // seconds until timeout
  isOverdue: boolean
  notificationsSent: number
  lastNotificationAt?: string
  decision?: ApprovalDecisionRecord
}

// Notification configuration for different channels
export interface NotificationConfig {
  enabled: boolean
  channels: NotificationChannel[]
  immediateChannels: NotificationChannel[] // For high-risk approvals
  reminderIntervals: number[] // Minutes before timeout to send reminders
  escalationConfig?: {
    enabled: boolean
    delayMinutes: number
    escalationUserId: string
    escalationChannels: NotificationChannel[]
  }
}

// Approval timeout behavior configuration
export interface TimeoutConfig {
  behavior: 'auto_reject' | 'auto_approve' | 'escalate' | 'stay_pending'
  warningIntervals: number[] // Minutes before timeout to warn
  escalationDelayMinutes?: number
  escalationUserId?: string
  safetyChecks?: {
    requireExplicitApproval: boolean // Prevent accidental auto-approve
    maxRiskLevelForAutoApprove: RiskLevel
  }
}

// Project approval settings
export interface ProjectApprovalSettings {
  id: string
  projectId: string
  defaultTimeoutSeconds: number
  defaultRiskLevel: RiskLevel
  notificationConfig: NotificationConfig
  timeoutConfig: TimeoutConfig
  requireApprovalForRiskLevels: RiskLevel[]
  approvalRequiredUsers: string[] // User IDs who can approve
  createdAt: string
  updatedAt: string
}

// Approval statistics for dashboard
export interface ApprovalStatistics {
  projectId?: string
  period: {
    startDate: string
    endDate: string
  }
  totals: {
    requested: number
    approved: number
    rejected: number
    expired: number
    averageResponseTimeMinutes: number
  }
  byRiskLevel: Record<
    RiskLevel,
    {
      requested: number
      approved: number
      rejected: number
      averageResponseTimeMinutes: number
    }
  >
  byUser: Array<{
    userId: string
    userName?: string
    approved: number
    rejected: number
    averageResponseTimeMinutes: number
  }>
  trends: {
    dailyRequests: Array<{ date: string; count: number }>
    responseTimesTrend: Array<{ date: string; averageMinutes: number }>
  }
}
