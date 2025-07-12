/**
 * Operator Step Executor
 * Provides data transformation and processing without AI using SimpleOperator
 * 
 * SOLID: Single responsibility - data operations only
 * DRY: Reuses SimpleOperator for transformations
 * KISS: Simple operator pattern mapping
 * Library-First: Uses existing SimpleOperator infrastructure
 */

import type { StepExecutor, WorkflowContext, ExecutorWorkflowStep } from './StepExecutor'
import type { StepResult } from '../../schemas/invoke'
import { SimpleOperator } from '../SimpleOperator'

export class OperatorStepExecutor implements StepExecutor {
  constructor(private operator: SimpleOperator) {}

  canHandle(step: ExecutorWorkflowStep): boolean {
    return step.type === 'operator'
  }

  async execute(step: ExecutorWorkflowStep, context: WorkflowContext): Promise<StepResult> {
    const startTime = Date.now()
    const task = context.resolvedTask || step.task
    
    try {
      console.log(`[OperatorStepExecutor] Executing ${step.config?.operator || 'summary'} operation for step: ${step.id}`)
      
      const operatorType = step.config?.operator || 'summary'
      let response: string
      
      switch (operatorType) {
        case 'summary':
          response = this.summarizeOutputs(context.stepOutputs)
          break
        case 'extraction':
          response = await this.extractPattern(task, context.stepOutputs)
          break
        case 'validation':
          response = await this.validateOutputs(task, context.stepOutputs)
          break
        case 'routing':
          response = await this.makeRoutingDecision(task, context.stepOutputs)
          break
        default:
          throw new Error(`Unknown operator type: ${operatorType}. Available: summary, extraction, validation, routing`)
      }
      
      return {
        id: step.id!,
        status: 'success',
        response,
        sessionId: `operator-${step.id}`,
        duration: Date.now() - startTime,
      }
    } catch (error) {
      console.error(`[OperatorStepExecutor] Error in step ${step.id}:`, error)
      
      return {
        id: step.id!,
        status: 'failed',
        response: `Operator error: ${error instanceof Error ? error.message : String(error)}`,
        sessionId: `operator-${step.id}`,
        duration: Date.now() - startTime,
      }
    }
  }

  private summarizeOutputs(outputs: Record<string, string>): string {
    const entries = Object.entries(outputs)
    if (entries.length === 0) return 'No outputs to summarize'
    
    const summary = entries
      .map(([id, output]) => {
        const preview = output.length > 200 ? `${output.substring(0, 200)}...` : output
        return `• Step ${id}: ${preview}`
      })
      .join('\n')

    return `Summary of ${entries.length} step outputs:\n\n${summary}`
  }

  private async extractPattern(pattern: string, outputs: Record<string, string>): Promise<string> {
    const results: string[] = []
    const patternLower = pattern.toLowerCase()

    Object.entries(outputs).forEach(([stepId, output]) => {
      if (patternLower.includes('url') || patternLower.includes('link')) {
        // Extract URLs
        const urlMatches = output.match(/https?:\/\/[^\s]+/g) || []
        if (urlMatches.length > 0) {
          results.push(`${stepId}: ${urlMatches.join(', ')}`)
        }
      } else if (patternLower.includes('error') || patternLower.includes('fail')) {
        // Extract error information
        const errorMatches = output.match(/error|fail|exception|warning/gi) || []
        if (errorMatches.length > 0) {
          results.push(`${stepId}: Found ${errorMatches.length} error indicators`)
        }
      } else if (patternLower.includes('number') || patternLower.includes('count')) {
        // Extract numbers
        const numberMatches = output.match(/\d+/g) || []
        if (numberMatches.length > 0) {
          results.push(`${stepId}: Numbers found: ${numberMatches.join(', ')}`)
        }
      } else {
        // Generic pattern extraction using regex
        try {
          const regex = new RegExp(pattern, 'gi')
          const matches = output.match(regex) || []
          if (matches.length > 0) {
            results.push(`${stepId}: ${matches.slice(0, 10).join(', ')}`)
          }
        } catch {
          // If pattern is not a valid regex, do simple text search
          if (output.toLowerCase().includes(pattern.toLowerCase())) {
            results.push(`${stepId}: Pattern found in output`)
          }
        }
      }
    })

    return results.length > 0 
      ? `Extraction Results:\n${results.join('\n')}`
      : `No matches found for pattern: "${pattern}"`
  }

  private async validateOutputs(rules: string, outputs: Record<string, string>): Promise<string> {
    const validationResults: string[] = []
    const totalSteps = Object.keys(outputs).length

    for (const [stepId, output] of Object.entries(outputs)) {
      const issues: string[] = []

      // Basic validation checks
      if (output.trim().length < 10) {
        issues.push('Output too short')
      }
      if (output.toLowerCase().includes('error') || output.toLowerCase().includes('failed')) {
        issues.push('Contains error indicators')
      }

      // Rule-specific validation
      if (rules.toLowerCase().includes('code')) {
        if (!output.includes('{') && !output.includes('function') && !output.includes('class')) {
          issues.push('Does not appear to contain code')
        }
      }
      if (rules.toLowerCase().includes('test')) {
        if (!output.includes('test') && !output.includes('spec') && !output.includes('expect')) {
          issues.push('Does not appear to contain tests')
        }
      }
      if (rules.toLowerCase().includes('documentation')) {
        if (!output.includes('#') && !output.includes('##') && output.length < 100) {
          issues.push('Does not appear to be documentation')
        }
      }

      // Use SimpleOperator for advanced validation if available
      try {
        const operatorResult = await this.operator.checkStatus(output, { 
          task: rules,
          role: 'validator'
        })
        if (operatorResult.status === 'failed') {
          issues.push(`Operator validation: ${operatorResult.reason || 'Failed validation'}`)
        }
      } catch (_error) {
        // SimpleOperator validation failed, continue with basic validation
      }

      const status = issues.length === 0 ? '✅ Valid' : `❌ Issues: ${issues.join(', ')}`
      validationResults.push(`${stepId}: ${status}`)
    }

    const validCount = validationResults.filter(r => r.includes('✅')).length
    const summary = `Validation Summary: ${validCount}/${totalSteps} steps passed validation\n\n`

    return summary + validationResults.join('\n')
  }

  private async makeRoutingDecision(criteria: string, outputs: Record<string, string>): Promise<string> {
    const allOutputs = Object.values(outputs).join(' ').toLowerCase()
    
    // Simple routing logic based on content analysis
    if (allOutputs.includes('error') || allOutputs.includes('fail')) {
      return 'ROUTE: error_handling - Detected errors or failures in previous steps'
    }
    
    if (allOutputs.includes('test') && (allOutputs.includes('pass') || allOutputs.includes('✅'))) {
      return 'ROUTE: deploy - All tests passing, ready for deployment'
    }
    
    if (allOutputs.includes('review') && allOutputs.includes('approve')) {
      return 'ROUTE: production - Review approved, proceed to production'
    }
    
    if (allOutputs.includes('security') && allOutputs.includes('vulnerabilit')) {
      return 'ROUTE: security_review - Security issues detected, needs security team review'
    }
    
    // Use SimpleOperator for intelligent routing decisions
    try {
      const operatorResult = await this.operator.checkStatus(allOutputs, {
        task: criteria,
        role: 'router'
      })
      
      if (operatorResult.status === 'success') {
        return 'ROUTE: continue - All conditions met, proceeding to next phase'
      } else {
        return `ROUTE: review - ${operatorResult.reason || 'Conditions not met, manual review required'}`
      }
    } catch (_error) {
      // Fallback to simple routing
      const completedSteps = Object.keys(outputs).length
      if (completedSteps >= 3) {
        return 'ROUTE: final_review - Multiple steps completed, ready for final review'
      }
      
      return 'ROUTE: continue - Standard workflow progression'
    }
  }
}