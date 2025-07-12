/**
 * Webhook Step Executor
 * Provides HTTP webhook calls for external integrations
 * 
 * SOLID: Single responsibility - HTTP webhook execution only
 * DRY: Reusable HTTP client configuration
 * KISS: Simple HTTP request/response pattern
 * Library-First: Uses ky for HTTP requests
 */

import type { StepExecutor, WorkflowContext, ExecutorWorkflowStep } from './StepExecutor'
import type { StepResult } from '../../schemas/invoke'
import ky from 'ky'

export class WebhookStepExecutor implements StepExecutor {
  canHandle(step: ExecutorWorkflowStep): boolean {
    return step.type === 'webhook'
  }

  async execute(step: ExecutorWorkflowStep, context: WorkflowContext): Promise<StepResult> {
    const startTime = Date.now()
    
    try {
      console.log(`[WebhookStepExecutor] Executing webhook for step: ${step.id}`)
      
      const url = step.config?.url || step.task
      const method = (step.config?.method || 'POST').toUpperCase()
      const headers = step.config?.headers || {}
      
      // Validate URL
      if (!this.isValidUrl(url)) {
        throw new Error(`Invalid URL: ${url}`)
      }
      
      // Prepare request payload
      const payload = this.buildPayload(step, context)
      
      console.log(`[WebhookStepExecutor] ${method} ${url}`)
      
      // Execute HTTP request with retry logic
      const response = await this.makeRequestWithRetry(url, method, headers, payload)
      
      return {
        id: step.id!,
        status: 'success',
        response: JSON.stringify(response, null, 2),
        sessionId: `webhook-${step.id}`,
        duration: Date.now() - startTime,
      }
    } catch (error) {
      console.error(`[WebhookStepExecutor] Error in step ${step.id}:`, error)
      
      return {
        id: step.id!,
        status: 'failed',
        response: `Webhook error: ${error instanceof Error ? error.message : String(error)}`,
        sessionId: `webhook-${step.id}`,
        duration: Date.now() - startTime,
      }
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url)
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
    } catch {
      return false
    }
  }

  private buildPayload(step: ExecutorWorkflowStep, context: WorkflowContext): any {
    return {
      // Workflow metadata
      metadata: {
        threadId: context.threadId,
        projectId: context.projectId,
        stepId: step.id,
        timestamp: new Date().toISOString(),
        executorType: 'webhook',
      },
      
      // Step information
      step: {
        id: step.id,
        task: context.resolvedTask || step.task,
        type: step.type,
        config: step.config || {},
      },
      
      // Previous step outputs (sanitized)
      outputs: this.sanitizeOutputs(context.stepOutputs),
      
      // Summary statistics
      summary: {
        totalSteps: Object.keys(context.stepOutputs).length,
        totalOutputLength: Object.values(context.stepOutputs).reduce((sum, output) => sum + output.length, 0),
        hasErrors: Object.values(context.stepOutputs).some(output => 
          output.toLowerCase().includes('error') || output.toLowerCase().includes('failed')
        ),
      },
    }
  }

  private sanitizeOutputs(outputs: Record<string, string>): Record<string, any> {
    const sanitized: Record<string, any> = {}
    
    Object.entries(outputs).forEach(([stepId, output]) => {
      // Limit output size to prevent huge payloads
      const maxLength = 1000
      const truncatedOutput = output.length > maxLength 
        ? `${output.substring(0, maxLength)}... [truncated]`
        : output
      
      sanitized[stepId] = {
        content: truncatedOutput,
        length: output.length,
        wordCount: output.split(/\s+/).length,
        lineCount: output.split('\n').length,
        containsCode: /function|class|\{|\}|import|export/.test(output),
        containsUrls: /https?:\/\//.test(output),
        containsErrors: /error|fail|exception/i.test(output),
      }
    })
    
    return sanitized
  }

  private async makeRequestWithRetry(
    url: string, 
    method: string, 
    headers: Record<string, string>, 
    payload: any,
    maxRetries: number = 3
  ): Promise<any> {
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.makeRequest(url, method, headers, payload)
      } catch (error) {
        lastError = error as Error
        console.warn(`[WebhookStepExecutor] Attempt ${attempt}/${maxRetries} failed:`, error)
        
        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt - 1) * 1000
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    throw lastError || new Error('All retry attempts failed')
  }

  private async makeRequest(
    url: string, 
    method: string, 
    headers: Record<string, string>, 
    payload: any
  ): Promise<any> {
    const options: any = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Claude-Studio-Webhook/1.0',
        'X-Workflow-Executor': 'webhook',
        ...headers
      },
      timeout: 30000, // 30 seconds
      retry: 0, // We handle retries manually
    }

    // Add body for methods that support it
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      options.json = payload
    } else if (method === 'GET' && Object.keys(payload.outputs).length > 0) {
      // For GET requests, add some key info as query parameters
      const searchParams = new URLSearchParams()
      searchParams.set('threadId', payload.metadata.threadId)
      searchParams.set('stepId', payload.metadata.stepId)
      searchParams.set('outputCount', String(payload.summary.totalSteps))
      options.searchParams = searchParams
    }

    try {
      const response = await ky(url, options)
      
      // Parse response based on content type
      const contentType = response.headers.get('content-type') || ''
      
      let responseData: any
      if (contentType.includes('application/json')) {
        responseData = await response.json()
      } else {
        responseData = await response.text()
      }
      
      // Return structured response
      return {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData,
        url: response.url,
        success: response.ok,
      }
    } catch (error) {
      if (error instanceof Error) {
        // Enhanced error information
        throw new Error(`HTTP ${method} ${url} failed: ${error.message}`)
      }
      throw error
    }
  }
}

// Example usage in workflows:
/*
{
  id: 'notify-slack',
  type: 'webhook',
  config: {
    url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  },
  task: 'Send workflow completion notification',
  deps: ['final-step']
}

{
  id: 'api-integration',
  type: 'webhook',
  config: {
    url: 'https://api.example.com/workflow/callback',
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ${API_TOKEN}',
      'X-API-Version': 'v1',
      'X-Source': 'claude-studio'
    }
  },
  deps: ['data-processing']
}

{
  id: 'health-check',
  type: 'webhook',
  config: {
    url: 'https://status.example.com/ping',
    method: 'GET'
  },
  task: 'Check external service status'
}
*/