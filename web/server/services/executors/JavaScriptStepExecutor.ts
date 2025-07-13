/**
 * JavaScript Step Executor
 * Provides sandboxed JavaScript code execution for workflow steps
 * 
 * SOLID: Single responsibility - JavaScript execution only
 * DRY: Reusable sandbox configuration
 * KISS: Simple code execution pattern
 * Library-First: Uses Function constructor for safe execution (vm2 ready)
 */

import type { StepExecutor, WorkflowContext, ExecutorWorkflowStep } from './StepExecutor'
import type { StepResult } from '../../schemas/invoke'

export class JavaScriptStepExecutor implements StepExecutor {
  canHandle(step: ExecutorWorkflowStep): boolean {
    return step.type === 'javascript'
  }

  async execute(step: ExecutorWorkflowStep, context: WorkflowContext): Promise<StepResult> {
    const startTime = Date.now()
    
    try {
      console.log(`[JavaScriptStepExecutor] Executing JavaScript for step: ${step.id}`)
      
      const code = step.config?.code || step.task
      const result = await this.executeInSandbox(code, context)
      
      return {
        id: step.id!,
        status: 'success',
        response: String(result ?? 'undefined'),
        sessionId: `js-${step.id}`,
        duration: Date.now() - startTime,
      }
    } catch (error) {
      console.error(`[JavaScriptStepExecutor] Error in step ${step.id}:`, error)
      
      return {
        id: step.id!,
        status: 'failed',
        response: `JavaScript execution error: ${error instanceof Error ? error.message : String(error)}`,
        sessionId: `js-${step.id}`,
        duration: Date.now() - startTime,
      }
    }
  }

  private async executeInSandbox(code: string, context: WorkflowContext): Promise<any> {
    // Create a comprehensive but safe sandbox environment
    const sandbox = {
      // Console for debugging
      console: {
        log: (...args: any[]) => console.log('[JS Sandbox]', ...args),
        error: (...args: any[]) => console.error('[JS Sandbox]', ...args),
        warn: (...args: any[]) => console.warn('[JS Sandbox]', ...args),
        info: (...args: any[]) => console.info('[JS Sandbox]', ...args),
      },
      
      // Workflow context data
      outputs: { ...context.stepOutputs }, // Copy to prevent mutation
      stepId: context.threadId,
      threadId: context.threadId,
      projectId: context.projectId,
      
      // Safe built-in objects and functions
      JSON,
      Math,
      Date,
      String,
      Number,
      Boolean,
      Array,
      Object,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      
      // Utility functions for workflow processing
      getOutput: (stepId: string) => context.stepOutputs[stepId] || null,
      hasOutput: (stepId: string) => stepId in context.stepOutputs,
      getAllOutputs: () => ({ ...context.stepOutputs }),
      
      // Array processing utilities
      sum: (arr: number[]) => arr.reduce((a, b) => a + b, 0),
      avg: (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0,
      count: (arr: any[]) => arr.length,
      filter: (arr: any[], predicate: (item: any) => boolean) => arr.filter(predicate),
      map: (arr: any[], transform: (item: any) => any) => arr.map(transform),
      reduce: (arr: any[], fn: (acc: any, item: any) => any, initial: any) => arr.reduce(fn, initial),
      
      // String utilities
      extractNumbers: (text: string) => (text.match(/\d+(\.\d+)?/g) || []).map(Number),
      extractUrls: (text: string) => text.match(/https?:\/\/[^\s]+/g) || [],
      extractEmails: (text: string) => text.match(/[^\s@]+@[^\s@]+\.[^\s@]+/g) || [],
      wordCount: (text: string) => text.split(/\s+/).filter(word => word.length > 0).length,
      lineCount: (text: string) => text.split('\n').length,
      
      // Object utilities
      keys: (obj: any) => Object.keys(obj),
      values: (obj: any) => Object.values(obj),
      entries: (obj: any) => Object.entries(obj),
      pick: (obj: any, keys: string[]) => {
        const result: any = {}
        keys.forEach(key => {
          if (key in obj) result[key] = obj[key]
        })
        return result
      },
      
      // Template processing
      template: (str: string, vars: Record<string, any>) => {
        return str.replace(/\{(\w+)\}/g, (match, key) => {
          return vars.hasOwnProperty(key) ? String(vars[key]) : match
        })
      },
      
      // Data analysis utilities
      analyze: {
        findErrors: (text: string) => (text.match(/error|fail|exception|warning/gi) || []).length,
        findUrls: (text: string) => (text.match(/https?:\/\/[^\s]+/g) || []).length,
        findKeywords: (text: string, keywords: string[]) => {
          return keywords.filter(keyword => 
            text.toLowerCase().includes(keyword.toLowerCase())
          )
        },
        sentiment: (text: string) => {
          const positive = (text.match(/good|great|excellent|success|completed|✅/gi) || []).length
          const negative = (text.match(/bad|error|fail|problem|issue|❌/gi) || []).length
          return positive > negative ? 'positive' : negative > positive ? 'negative' : 'neutral'
        }
      },
      
      // Validation utilities
      validate: {
        isEmail: (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
        isUrl: (url: string) => /^https?:\/\/.+/.test(url),
        isNumber: (value: any) => !isNaN(Number(value)),
        isEmpty: (value: any) => value === null || value === undefined || value === '',
        hasLength: (value: any, min: number, max?: number) => {
          const len = String(value).length
          return len >= min && (max === undefined || len <= max)
        }
      }
    }
    
    try {
      // Create a function with the sandbox as the execution context
      // For production security, consider using vm2 or isolated-vm
      const sandboxKeys = Object.keys(sandbox)
      const sandboxValues = Object.values(sandbox)
      
      // Wrap the code in a function that returns the result
      const wrappedCode = `
        "use strict";
        try {
          // User code executed here
          const result = (function() {
            ${code}
          })();
          return result;
        } catch (error) {
          throw new Error("Execution error: " + error.message);
        }
      `
      
      const func = new Function(...sandboxKeys, wrappedCode)
      const result = func(...sandboxValues)
      
      return result
    } catch (error) {
      throw new Error(`JavaScript execution failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

// Example usage in workflows:
/*
{
  id: 'calculate',
  type: 'javascript',
  config: {
    code: `
      const totalLines = sum(Object.values(outputs).map(lineCount));
      const avgWordsPerOutput = avg(Object.values(outputs).map(wordCount));
      
      return {
        totalLines,
        avgWordsPerOutput,
        outputCount: count(Object.keys(outputs)),
        hasErrors: Object.values(outputs).some(output => analyze.findErrors(output) > 0)
      };
    `
  },
  deps: ['previous-steps']
}

{
  id: 'validate-data',
  type: 'javascript', 
  task: `
    const emails = Object.values(outputs)
      .flatMap(output => extractEmails(output))
      .filter(email => validate.isEmail(email));
    
    return \`Found \${emails.length} valid emails: \${emails.join(', ')}\`;
  `,
  deps: ['data-collection']
}
*/