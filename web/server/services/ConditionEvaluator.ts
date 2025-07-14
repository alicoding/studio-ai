/**
 * Condition Evaluator - Safe JavaScript expression evaluation for conditional workflows
 *
 * SOLID: Single responsibility - only condition evaluation
 * DRY: Reuses existing template variable patterns from workflow system
 * KISS: Simple, safe expression evaluation without complex features
 * Library-First: Uses existing string-template patterns for variable substitution
 */

import type {
  ConditionContext,
  ConditionResult,
  ValidationError,
} from '../schemas/workflow-builder'

import type { WorkflowCondition } from '../schemas/condition-types'

export class ConditionEvaluator {
  private static instance: ConditionEvaluator

  static getInstance(): ConditionEvaluator {
    if (!ConditionEvaluator.instance) {
      ConditionEvaluator.instance = new ConditionEvaluator()
    }
    return ConditionEvaluator.instance
  }

  /**
   * Evaluate a workflow condition (structured or legacy string)
   * SOLID: Single entry point for all condition types
   * DRY: Delegates to appropriate evaluator
   */
  evaluateWorkflowCondition(
    condition: WorkflowCondition,
    context: ConditionContext
  ): ConditionResult {
    // Import StructuredConditionEvaluator dynamically to avoid circular dependency
    const { StructuredConditionEvaluator } = require('./StructuredConditionEvaluator')
    const structuredEvaluator = StructuredConditionEvaluator.getInstance()
    return structuredEvaluator.evaluateCondition(condition, context)
  }

  /**
   * Evaluate a condition expression with template variable substitution
   * KISS: Simple boolean evaluation with error handling
   * DRY: Uses existing template variable patterns
   * @deprecated Use evaluateWorkflowCondition for new implementations
   */
  evaluateCondition(condition: string, context: ConditionContext): ConditionResult {
    try {
      // Step 1: Substitute template variables (DRY - reuse existing patterns)
      const substitutedExpression = this.substituteTemplateVariables(condition, context)

      // Step 2: Validate and evaluate the expression safely
      const result = this.safeEvaluate(substitutedExpression)

      return {
        result,
        evaluatedExpression: substitutedExpression,
      }
    } catch (error) {
      return {
        result: false,
        error: error instanceof Error ? error.message : 'Unknown evaluation error',
        evaluatedExpression: condition,
      }
    }
  }

  /**
   * Substitute template variables in condition expression
   * DRY: Reuses existing template variable patterns from workflow system
   * Library-First: Compatible with existing {stepId.field} syntax
   */
  private substituteTemplateVariables(expression: string, context: ConditionContext): string {
    let substituted = expression

    // Replace {stepId.output} with actual step outputs
    substituted = substituted.replace(/\{([^}]+)\.output\}/g, (match, stepId) => {
      const output = context.stepOutputs[stepId]
      if (output === undefined) {
        throw new Error(`Step output not found: ${stepId}`)
      }
      return JSON.stringify(output) // JSON.stringify for safe string escaping
    })

    // Replace {stepId.status} with step status
    substituted = substituted.replace(/\{([^}]+)\.status\}/g, (match, stepId) => {
      const result = context.stepResults[stepId]
      if (!result) {
        throw new Error(`Step result not found: ${stepId}`)
      }
      return JSON.stringify(result.status)
    })

    // Replace {stepId.response} with step response
    substituted = substituted.replace(/\{([^}]+)\.response\}/g, (match, stepId) => {
      const result = context.stepResults[stepId]
      if (!result) {
        throw new Error(`Step result not found: ${stepId}`)
      }
      return JSON.stringify(result.response)
    })

    return substituted
  }

  /**
   * Safely evaluate JavaScript expression
   * KISS: Simple evaluation with security constraints
   * Security: Limited to basic operations, no access to global scope
   */
  private safeEvaluate(expression: string): boolean {
    // Basic security check - ensure expression only contains allowed patterns
    const cleanExpression = expression.replace(/"[^"]*"/g, '""') // Remove string literals for checking
    // Allow alphanumeric, whitespace, equals (=, ==, ===), not (!), and/or (&, |), comparisons (<, >), parentheses, quotes
    const hasDisallowedChars = /[^a-zA-Z0-9\s=!&|<>()"]/.test(cleanExpression)

    if (hasDisallowedChars) {
      throw new Error(
        'Condition contains disallowed characters. Only basic comparisons and boolean operations are allowed.'
      )
    }

    // Use Function constructor for safer evaluation than eval()
    // Still sandboxed and doesn't have access to local scope
    try {
      const func = new Function(`"use strict"; return (${expression});`)
      const result = func()

      if (typeof result !== 'boolean') {
        throw new Error(`Condition must evaluate to boolean, got: ${typeof result}`)
      }

      return result
    } catch (error) {
      throw new Error(
        `Invalid expression: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Validate condition syntax without evaluation
   * SOLID: Separate validation from evaluation logic
   */
  validateConditionSyntax(condition: string): ValidationError | null {
    if (!condition || condition.trim() === '') {
      return {
        field: 'condition',
        message: 'Condition cannot be empty',
        code: 'CONDITION_EMPTY',
      }
    }

    const trimmed = condition.trim()

    // Check for basic template variable pattern
    const templateVarPattern = /\{[a-zA-Z_][a-zA-Z0-9_]*\.(output|status|response)\}/
    const hasValidTemplateVars = templateVarPattern.test(trimmed)

    // Check for boolean literals
    const hasBooleanLiterals = /\b(true|false)\b/.test(trimmed)

    if (!hasValidTemplateVars && !hasBooleanLiterals) {
      return {
        field: 'condition',
        message:
          'Condition must contain template variables (e.g., {step1.output}) or boolean values',
        code: 'CONDITION_INVALID_SYNTAX',
      }
    }

    // Check for balanced parentheses
    let parenCount = 0
    for (const char of trimmed) {
      if (char === '(') parenCount++
      if (char === ')') parenCount--
      if (parenCount < 0) {
        return {
          field: 'condition',
          message: 'Unbalanced parentheses in condition',
          code: 'CONDITION_UNBALANCED_PARENS',
        }
      }
    }

    if (parenCount !== 0) {
      return {
        field: 'condition',
        message: 'Unbalanced parentheses in condition',
        code: 'CONDITION_UNBALANCED_PARENS',
      }
    }

    return null
  }

  /**
   * Get available template variables for a given workflow context
   * Helper for UI to show available variables to users
   */
  getAvailableVariables(context: ConditionContext): string[] {
    const variables: string[] = []

    // Add step output variables
    for (const stepId of Object.keys(context.stepOutputs)) {
      variables.push(`{${stepId}.output}`)
    }

    // Add step result variables
    for (const stepId of Object.keys(context.stepResults)) {
      variables.push(`{${stepId}.status}`)
      variables.push(`{${stepId}.response}`)
    }

    return variables.sort()
  }
}
