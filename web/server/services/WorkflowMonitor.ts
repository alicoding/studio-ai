/**
 * WorkflowMonitor - Detects silent workflow failures and triggers auto-resume
 *
 * KISS: Simple heartbeat monitoring with automatic recovery
 * Library-First: Uses LangGraph's resume capability via re-invocation
 */

import { WorkflowExecutor } from './WorkflowExecutor'
import type { InvokeRequest } from '../schemas/invoke'

interface WorkflowHealth {
  threadId: string
  workflow: InvokeRequest
  lastHeartbeat: Date
  currentStep?: string
  isRecovering?: boolean
}

export class WorkflowMonitor {
  private static instance: WorkflowMonitor | null = null
  private checkInterval: NodeJS.Timeout | null = null
  private workflowHealth = new Map<string, WorkflowHealth>()

  // KISS: Simple thresholds
  private readonly CHECK_INTERVAL = 30000 // Check every 30 seconds
  private readonly STALE_THRESHOLD = 120000 // Consider stale after 2 minutes
  private readonly MAX_RECOVERY_ATTEMPTS = 3
  private recoveryAttempts = new Map<string, number>()

  private constructor() {}

  static getInstance(): WorkflowMonitor {
    if (!WorkflowMonitor.instance) {
      WorkflowMonitor.instance = new WorkflowMonitor()
    }
    return WorkflowMonitor.instance
  }

  /**
   * Start monitoring for silent failures
   */
  start(): void {
    if (this.checkInterval) return

    console.log('[WorkflowMonitor] Starting silent failure detection...')
    console.log(
      '[WorkflowMonitor] ⚠️  Note: Auto-resume only works for workflows started AFTER this server instance'
    )
    console.log('[WorkflowMonitor] Workflows from before server restart need manual resume')

    this.checkInterval = setInterval(() => {
      this.checkStaleWorkflows()
    }, this.CHECK_INTERVAL)
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
    this.workflowHealth.clear()
    this.recoveryAttempts.clear()
  }

  /**
   * Register a workflow for monitoring
   */
  registerWorkflow(threadId: string, workflow: InvokeRequest): void {
    this.workflowHealth.set(threadId, {
      threadId,
      workflow,
      lastHeartbeat: new Date(),
      currentStep: undefined,
    })
    console.log(`[WorkflowMonitor] Registered workflow ${threadId} for monitoring`)
  }

  /**
   * Update heartbeat for a workflow
   */
  updateHeartbeat(threadId: string, currentStep?: string): void {
    const health = this.workflowHealth.get(threadId)
    if (health) {
      health.lastHeartbeat = new Date()
      if (currentStep) {
        health.currentStep = currentStep
      }
    }
  }

  /**
   * Remove completed workflow from monitoring
   */
  removeWorkflow(threadId: string): void {
    this.workflowHealth.delete(threadId)
    this.recoveryAttempts.delete(threadId)
    console.log(`[WorkflowMonitor] Removed workflow ${threadId} from monitoring`)
  }

  /**
   * Check for stale workflows and trigger recovery
   */
  private async checkStaleWorkflows(): Promise<void> {
    const now = Date.now()
    const executor = WorkflowExecutor.getInstance()

    for (const [threadId, health] of this.workflowHealth) {
      // Skip if already recovering
      if (health.isRecovering) continue

      const timeSinceHeartbeat = now - health.lastHeartbeat.getTime()

      // Check if workflow is stale
      if (timeSinceHeartbeat > this.STALE_THRESHOLD) {
        // Double-check if workflow is still active in executor
        if (!executor.isActive(threadId)) {
          console.log(
            `[WorkflowMonitor] Detected stale workflow ${threadId} (${Math.round(timeSinceHeartbeat / 1000)}s since last heartbeat)`
          )
          await this.attemptRecovery(threadId, health)
        }
      }
    }
  }

  /**
   * Attempt to recover a stale workflow
   * KISS: Simply re-invoke with same threadId - LangGraph handles the rest!
   */
  private async attemptRecovery(threadId: string, health: WorkflowHealth): Promise<void> {
    const attempts = this.recoveryAttempts.get(threadId) || 0

    if (attempts >= this.MAX_RECOVERY_ATTEMPTS) {
      console.error(`[WorkflowMonitor] Max recovery attempts reached for ${threadId}`)
      this.removeWorkflow(threadId)
      return
    }

    health.isRecovering = true
    this.recoveryAttempts.set(threadId, attempts + 1)

    console.log(
      `[WorkflowMonitor] Attempting auto-recovery for ${threadId} (attempt ${attempts + 1})`
    )

    try {
      // KISS: Just re-invoke with the same threadId
      // LangGraph will resume from the last checkpoint automatically
      const { WorkflowOrchestrator } = await import('./WorkflowOrchestrator')
      const orchestrator = new WorkflowOrchestrator()

      // KISS: Just use the same request - LangGraph handles recovery
      const recoveryRequest = health.workflow

      // Execute will resume from checkpoint
      await orchestrator.execute(recoveryRequest)

      console.log(`[WorkflowMonitor] Successfully recovered workflow ${threadId}`)
      this.removeWorkflow(threadId)
    } catch (error) {
      console.error(`[WorkflowMonitor] Recovery failed for ${threadId}:`, error)
      health.isRecovering = false
      health.lastHeartbeat = new Date() // Reset heartbeat to try again later
    }
  }

  /**
   * Get monitoring status
   */
  getStatus(): {
    isRunning: boolean
    monitoredWorkflows: number
    workflowStatuses: Array<{
      threadId: string
      lastHeartbeat: string
      currentStep?: string
      isStale: boolean
      recoveryAttempts: number
    }>
  } {
    const now = Date.now()
    const workflowStatuses = Array.from(this.workflowHealth.values()).map((health) => ({
      threadId: health.threadId,
      lastHeartbeat: health.lastHeartbeat.toISOString(),
      currentStep: health.currentStep,
      isStale: now - health.lastHeartbeat.getTime() > this.STALE_THRESHOLD,
      recoveryAttempts: this.recoveryAttempts.get(health.threadId) || 0,
    }))

    return {
      isRunning: this.checkInterval !== null,
      monitoredWorkflows: this.workflowHealth.size,
      workflowStatuses,
    }
  }
}
