/**
 * ApprovalContextBuilder Service - Generates rich context for approval decisions
 *
 * SOLID: Single responsibility - context generation for approvals
 * DRY: Reusable context building methods
 * KISS: Simple, focused context generation
 * Library-First: Uses existing workflow services
 */

import { WorkflowOrchestrator } from './WorkflowOrchestrator'
import { DatabaseService } from '../lib/storage/DatabaseService'
import type { ApprovalContextData, WorkflowApproval, RiskLevel } from '../schemas/approval-types'
import type { WorkflowStep } from '../schemas/invoke'

export class ApprovalContextBuilder {
  private db = DatabaseService.getInstance()
  private workflowOrchestrator: WorkflowOrchestrator | null = null

  /**
   * Build complete context for an approval decision
   * SOLID: Single method, single purpose
   */
  async buildContext(approval: WorkflowApproval): Promise<ApprovalContextData> {
    const [workflowSteps, previousOutputs, impactAssessment, similarApprovals] = await Promise.all([
      this.getWorkflowSteps(approval.threadId),
      this.getPreviousStepOutputs(approval.threadId),
      this.generateImpactAssessment(approval),
      this.findSimilarApprovals(approval),
    ])

    const currentStepIndex = workflowSteps.findIndex((step) => step.id === approval.stepId)

    return {
      workflowSteps,
      previousStepOutputs: previousOutputs,
      currentStepIndex: currentStepIndex >= 0 ? currentStepIndex : 0,
      projectName: approval.projectId ? await this.getProjectName(approval.projectId) : undefined,
      projectDescription: approval.projectId
        ? await this.getProjectDescription(approval.projectId)
        : undefined,
      impactAssessment,
      similarApprovals,
    }
  }

  /**
   * Get workflow steps with their current status
   * DRY: Reuses existing workflow tracking
   */
  private async getWorkflowSteps(threadId: string): Promise<ApprovalContextData['workflowSteps']> {
    try {
      // Get workflow execution history
      const stmt = this.db.prepare(`
        SELECT 
          step_id,
          step_type,
          agent_id,
          task,
          status,
          result,
          error,
          started_at,
          completed_at
        FROM workflow_step_executions
        WHERE thread_id = ?
        ORDER BY started_at ASC
      `)

      const rows = stmt.all(threadId) as Array<{
        step_id: string
        step_type: string
        agent_id: string
        task: string
        status: string
        result: string | null
        error: string | null
        started_at: string
        completed_at: string | null
      }>

      return rows.map((row) => ({
        id: row.step_id,
        task: row.task,
        status: row.status,
        output: row.result || row.error || undefined,
        executedAt: row.started_at,
      }))
    } catch (error) {
      console.error('Error fetching workflow steps:', error)
      return []
    }
  }

  /**
   * Get outputs from previous steps
   * KISS: Simple key-value mapping
   */
  private async getPreviousStepOutputs(threadId: string): Promise<Record<string, string>> {
    try {
      const stmt = this.db.prepare(`
        SELECT step_id, result
        FROM workflow_step_executions
        WHERE thread_id = ? AND status = 'completed' AND result IS NOT NULL
      `)

      const rows = stmt.all(threadId) as Array<{
        step_id: string
        result: string
      }>

      const outputs: Record<string, string> = {}
      for (const row of rows) {
        outputs[row.step_id] = row.result
      }

      return outputs
    } catch (error) {
      console.error('Error fetching previous outputs:', error)
      return {}
    }
  }

  /**
   * Generate impact assessment for the approval
   * SOLID: Focused on impact analysis
   */
  private async generateImpactAssessment(
    approval: WorkflowApproval
  ): Promise<ApprovalContextData['impactAssessment']> {
    // Get next steps in the workflow
    const nextSteps = await this.getNextSteps(approval.threadId, approval.stepId)

    // Analyze risks based on approval decision
    const { risksIfApproved, risksIfRejected } = this.analyzeRisks(approval.riskLevel, nextSteps)

    // Determine business impact
    const businessImpact = this.assessBusinessImpact(
      approval.riskLevel,
      approval.workflowName || ''
    )

    return {
      nextStepsPreview: nextSteps.map((step) => step.task || 'Unknown task'),
      risksIfApproved,
      risksIfRejected,
      businessImpact,
    }
  }

  /**
   * Get next steps that would execute after this approval
   * DRY: Reuses workflow structure analysis
   */
  private async getNextSteps(_threadId: string, _currentStepId: string): Promise<WorkflowStep[]> {
    try {
      // TODO: Integrate with WorkflowOrchestrator to get actual workflow structure
      // This would query the workflow definition to find steps that depend on currentStepId
      // For now, return empty array as placeholder
      return []
    } catch (error) {
      console.error('Error getting next steps:', error)
      return []
    }
  }

  /**
   * Analyze risks based on approval decision
   * KISS: Simple risk categorization
   */
  private analyzeRisks(
    riskLevel: RiskLevel,
    nextSteps: WorkflowStep[]
  ): {
    risksIfApproved: string[]
    risksIfRejected: string[]
  } {
    const risksIfApproved: string[] = []
    const risksIfRejected: string[] = []

    // Risk analysis based on risk level
    switch (riskLevel) {
      case 'critical':
        risksIfApproved.push(
          'Critical operation will proceed with potentially irreversible changes'
        )
        risksIfApproved.push('System-wide impact possible if operation fails')
        risksIfRejected.push('Critical workflow will be halted')
        risksIfRejected.push('Manual intervention may be required to recover')
        break

      case 'high':
        risksIfApproved.push('Significant changes will be made to the system')
        risksIfApproved.push('Rollback may be complex if issues arise')
        risksIfRejected.push('Important workflow will be stopped')
        risksIfRejected.push('Dependent operations may be affected')
        break

      case 'medium':
        risksIfApproved.push('Moderate changes will proceed')
        risksIfApproved.push('Some manual verification may be needed')
        risksIfRejected.push('Workflow will need to be restarted or modified')
        break

      case 'low':
        risksIfApproved.push('Minimal risk - routine operation will continue')
        risksIfRejected.push('Minor workflow interruption')
        break
    }

    // Additional risks based on next steps
    if (nextSteps.some((step) => step.task?.toLowerCase().includes('deploy'))) {
      risksIfApproved.push('Production deployment will proceed')
    }

    if (nextSteps.some((step) => step.task?.toLowerCase().includes('delete'))) {
      risksIfApproved.push('Data deletion operations will execute')
    }

    return { risksIfApproved, risksIfRejected }
  }

  /**
   * Assess business impact of the approval
   * SOLID: Single purpose business impact analysis
   */
  private assessBusinessImpact(riskLevel: RiskLevel, workflowName: string): string {
    const workflowType = workflowName.toLowerCase()

    // For critical risk, always return critical impact
    if (riskLevel === 'critical') {
      return 'Critical impact - System-wide changes possible'
    }

    // Check specific workflow types
    if (workflowType.includes('deploy') || workflowType.includes('deployment')) {
      return riskLevel === 'high'
        ? 'High impact - Production system deployment'
        : 'Medium impact - Standard deployment procedure'
    }

    if (workflowType.includes('delete') || workflowType.includes('remove')) {
      return 'High impact - Data removal operation'
    }

    if (workflowType.includes('test') || workflowType.includes('validate')) {
      return 'Low impact - Testing/validation workflow'
    }

    // Default assessment based on risk level
    switch (riskLevel) {
      case 'high':
        return 'High impact - Significant operational changes'
      case 'medium':
        return 'Medium impact - Standard operational procedure'
      case 'low':
        return 'Low impact - Routine operation'
      default:
        return 'Medium impact - Standard operational procedure'
    }
  }

  /**
   * Find similar approvals for context
   * DRY: Reusable similarity search
   */
  private async findSimilarApprovals(
    approval: WorkflowApproval
  ): Promise<ApprovalContextData['similarApprovals']> {
    try {
      // Find approvals with similar prompts or from same workflow
      const stmt = this.db.prepare(`
        SELECT 
          wa.prompt,
          wa.status as decision,
          wa.resolved_at as decided_at,
          ad.comment as outcome
        FROM workflow_approvals wa
        LEFT JOIN approval_decisions ad ON wa.id = ad.approval_id
        WHERE 
          wa.id != ? 
          AND wa.status IN ('approved', 'rejected')
          AND (
            wa.workflow_name = ?
            OR wa.risk_level = ?
            OR wa.prompt LIKE ?
          )
        ORDER BY wa.resolved_at DESC
        LIMIT 5
      `)

      const similarPromptPattern = `%${approval.prompt.split(' ').slice(0, 3).join(' ')}%`

      const rows = stmt.all(
        approval.id,
        approval.workflowName || '',
        approval.riskLevel,
        similarPromptPattern
      ) as Array<{
        prompt: string
        decision: 'approved' | 'rejected'
        decided_at: string
        outcome: string | null
      }>

      return rows.map((row) => ({
        prompt: row.prompt,
        decision: row.decision,
        outcome: row.outcome || `Workflow ${row.decision}`,
        decidedAt: row.decided_at,
      }))
    } catch (error) {
      console.error('Error finding similar approvals:', error)
      return []
    }
  }

  /**
   * Get project name for context
   * KISS: Simple project lookup
   */
  private async getProjectName(projectId: string): Promise<string | undefined> {
    try {
      const stmt = this.db.prepare('SELECT name FROM studio_projects WHERE id = ?')
      const row = stmt.get(projectId) as { name: string } | undefined
      return row?.name
    } catch (error) {
      console.error('Error fetching project name:', error)
      return undefined
    }
  }

  /**
   * Get project description for context
   * KISS: Simple project lookup
   */
  private async getProjectDescription(projectId: string): Promise<string | undefined> {
    try {
      const stmt = this.db.prepare('SELECT description FROM studio_projects WHERE id = ?')
      const row = stmt.get(projectId) as { description: string | null } | undefined
      return row?.description || undefined
    } catch (error) {
      console.error('Error fetching project description:', error)
      return undefined
    }
  }

  /**
   * Enrich approval with full context
   * DRY: Combines approval data with context
   */
  async enrichApproval(approval: WorkflowApproval): Promise<
    WorkflowApproval & {
      contextData: ApprovalContextData
    }
  > {
    const contextData = await this.buildContext(approval)

    return {
      ...approval,
      contextData,
    }
  }
}
