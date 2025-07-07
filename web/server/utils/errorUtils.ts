/**
 * Error utilities for consistent error handling
 * 
 * SOLID: Single responsibility - error detection and handling
 * DRY: Centralized error detection logic 
 * KISS: Simple utility functions
 */

export interface AbortErrorInfo {
  isAbort: boolean
  message: string
  type: 'user_cancelled' | 'process_terminated' | 'network_abort' | 'unknown'
}

/**
 * Detects if an error is an abort error and returns detailed information
 */
export function detectAbortError(error: unknown): AbortErrorInfo {
  if (!(error instanceof Error)) {
    return { isAbort: false, message: String(error), type: 'unknown' }
  }
  
  // Check for AbortError
  if (error.name === 'AbortError') {
    return { 
      isAbort: true, 
      message: 'Query was aborted by user',
      type: 'user_cancelled'
    }
  }
  
  // Check for message patterns indicating abort
  const errorMessage = error.message.toLowerCase()
  
  if (errorMessage.includes('aborted') || errorMessage.includes('query was aborted')) {
    return { 
      isAbort: true, 
      message: 'Query was aborted by user',
      type: 'user_cancelled'
    }
  }
  
  // Check for process termination (SIGTERM)
  if (errorMessage.includes('process exited with code 143')) {
    return { 
      isAbort: true, 
      message: 'Process was terminated',
      type: 'process_terminated'
    }
  }
  
  // Check for network abort
  if (errorMessage.includes('request cancelled') || errorMessage.includes('request aborted')) {
    return { 
      isAbort: true, 
      message: 'Network request was aborted',
      type: 'network_abort'
    }
  }
  
  return { isAbort: false, message: error.message, type: 'unknown' }
}

/**
 * Custom error class for abort errors with session tracking
 */
export class AbortError extends Error {
  sessionId?: string
  abortType: 'user_cancelled' | 'process_terminated' | 'network_abort' | 'unknown'
  
  constructor(message: string, sessionId?: string, abortType: AbortErrorInfo['type'] = 'user_cancelled') {
    super(message)
    this.name = 'AbortError'
    this.sessionId = sessionId
    this.abortType = abortType
  }
}

/**
 * Formats an error message with additional context
 */
export function formatErrorMessage(error: unknown, context?: string): string {
  const prefix = context ? `${context}: ` : ''
  
  if (error instanceof Error) {
    return `${prefix}${error.message}`
  }
  
  return `${prefix}${String(error)}`
}