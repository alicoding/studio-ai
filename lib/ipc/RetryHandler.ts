/**
 * RetryHandler - Connection Retry Logic with Exponential Backoff
 * 
 * SOLID: Single Responsibility - only handles retry logic
 * DRY: Reusable retry logic from existing codebase
 * KISS: Simple exponential backoff with max attempts
 */

export interface RetryOptions {
  maxRetries: number
  initialDelay: number
  maxDelay: number
  backoffFactor: number
}

export interface RetryResult<T> {
  success: boolean
  result?: T
  error?: Error
  attempts: number
}

export class RetryHandler {
  private readonly options: RetryOptions

  constructor(options: Partial<RetryOptions> = {}) {
    this.options = {
      maxRetries: options.maxRetries || 3,
      initialDelay: options.initialDelay || 500,
      maxDelay: options.maxDelay || 5000,
      backoffFactor: options.backoffFactor || 2
    }
  }

  /**
   * Execute function with exponential backoff retry
   */
  public async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: string = 'operation'
  ): Promise<RetryResult<T>> {
    let lastError: Error | null = null
    let delay = this.options.initialDelay

    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        console.log(`${context} - attempt ${attempt}/${this.options.maxRetries}`)
        
        const result = await operation()
        
        console.log(`${context} - succeeded on attempt ${attempt}`)
        return {
          success: true,
          result,
          attempts: attempt
        }

      } catch (error: any) {
        lastError = error
        console.warn(`${context} - attempt ${attempt} failed:`, error.message)

        // Don't wait after the last attempt
        if (attempt < this.options.maxRetries) {
          console.log(`${context} - waiting ${delay}ms before retry...`)
          await this.sleep(delay)
          
          // Exponential backoff with jitter
          delay = Math.min(
            delay * this.options.backoffFactor + Math.random() * 100,
            this.options.maxDelay
          )
        }
      }
    }

    console.error(`${context} - failed after ${this.options.maxRetries} attempts`)
    return {
      success: false,
      error: lastError || new Error('Unknown error'),
      attempts: this.options.maxRetries
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Create a specialized retry handler for IPC connections
   */
  public static forIPC(): RetryHandler {
    return new RetryHandler({
      maxRetries: 3,
      initialDelay: 500,
      maxDelay: 2000,
      backoffFactor: 1.5
    })
  }

  /**
   * Create a specialized retry handler for process spawning
   */
  public static forProcessSpawn(): RetryHandler {
    return new RetryHandler({
      maxRetries: 2,
      initialDelay: 1000,
      maxDelay: 3000,
      backoffFactor: 2
    })
  }
}