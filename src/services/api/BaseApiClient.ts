/**
 * BaseApiClient - HTTP Client Foundation
 * 
 * SOLID: Single Responsibility - HTTP operations only
 * DRY: Reusable HTTP logic for all providers
 * KISS: Simple, focused HTTP client wrapper
 * Library-First: Built on ky library
 */

import ky, { type KyInstance, type Options } from 'ky'
import type { ProviderConfig, ApiProvider, ApiError } from './types'

export class BaseApiClient implements ApiProvider {
  private client: KyInstance
  private config: ProviderConfig

  constructor(config: ProviderConfig) {
    this.config = config
    this.client = this.createClient()
  }

  get name(): string {
    return this.config.name
  }

  get baseUrl(): string {
    return this.config.baseUrl
  }

  /**
   * Create ky client instance with configuration
   */
  private createClient(): KyInstance {
    const options: Options = {
      prefixUrl: this.config.baseUrl,
      timeout: this.config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers,
      },
      hooks: {
        beforeRequest: [
          (request) => {
            // Add API key if configured
            if (this.config.apiKey) {
              request.headers.set('Authorization', `Bearer ${this.config.apiKey}`)
            }
            
            // Log requests in development
            if (process.env.NODE_ENV === 'development') {
              console.log(`[API] ${request.method} ${request.url}`)
            }
          }
        ],
        beforeError: [
          (error) => {
            // Transform ky errors to our ApiError format
            const apiError: ApiError = {
              message: error.message,
              status: error.response?.status || 0,
              code: error.name,
              details: error.response ? {
                status: error.response.status,
                statusText: error.response.statusText,
                url: error.response.url
              } : undefined
            }
            
            // Log errors (reduce noise during server restarts)
            if (apiError.status === 0 || apiError.status >= 500) {
              // Network errors or server errors - these are expected during restarts
              console.log(`[API] Connection issue: ${apiError.message}`)
            } else {
              // Client errors (4xx) - these are unexpected and worth logging as errors
              console.error(`[API Error] ${apiError.status}: ${apiError.message}`)
            }
            
            // Enhance error message based on status
            if (apiError.status === 401) {
              apiError.message = 'Authentication failed. Please check your API key.'
            } else if (apiError.status === 403) {
              apiError.message = 'Access forbidden. Please check your permissions.'
            } else if (apiError.status === 429) {
              apiError.message = 'Rate limit exceeded. Please try again later.'
            } else if (apiError.status >= 500) {
              apiError.message = 'Server error. Please try again later.'
            }

            // Throw enhanced error
            const enhancedError = new Error(apiError.message) as Error & { apiError: ApiError }
            enhancedError.apiError = apiError
            throw enhancedError
          }
        ]
      },
      retry: {
        limit: 2,
        methods: ['get'],
        statusCodes: [408, 413, 429, 500, 502, 503, 504],
        backoffLimit: 3000
      }
    }

    return ky.create(options)
  }

  /**
   * HTTP GET request
   */
  async get<T = unknown>(endpoint: string, params?: Record<string, string>): Promise<T> {
    try {
      const searchParams = params ? new URLSearchParams(params) : undefined
      return await this.client.get(endpoint, { searchParams }).json<T>()
    } catch (error) {
      throw this.handleError(error)
    }
  }

  /**
   * HTTP POST request
   */
  async post<T = unknown>(endpoint: string, data?: unknown): Promise<T> {
    try {
      return await this.client.post(endpoint, { json: data }).json<T>()
    } catch (error) {
      throw this.handleError(error)
    }
  }

  /**
   * HTTP PUT request
   */
  async put<T = unknown>(endpoint: string, data?: unknown): Promise<T> {
    try {
      return await this.client.put(endpoint, { json: data }).json<T>()
    } catch (error) {
      throw this.handleError(error)
    }
  }

  /**
   * HTTP DELETE request
   */
  async delete<T = unknown>(endpoint: string): Promise<T> {
    try {
      // For DELETE requests, we might not always get JSON back
      const response = await this.client.delete(endpoint)
      
      // If response has content, parse as JSON, otherwise return empty object
      const text = await response.text()
      return text ? JSON.parse(text) : {} as T
    } catch (error) {
      throw this.handleError(error)
    }
  }

  /**
   * HTTP PATCH request
   */
  async patch<T = unknown>(endpoint: string, data?: unknown): Promise<T> {
    try {
      return await this.client.patch(endpoint, { json: data }).json<T>()
    } catch (error) {
      throw this.handleError(error)
    }
  }

  /**
   * Update client configuration
   */
  updateConfig(config: Partial<ProviderConfig>): void {
    this.config = { ...this.config, ...config }
    this.client = this.createClient()
  }

  /**
   * Check if client is properly configured
   */
  isConfigured(): boolean {
    return !!(this.config.baseUrl && this.config.name)
  }

  /**
   * Get raw ky client for advanced usage
   */
  getRawClient(): KyInstance {
    return this.client
  }

  /**
   * Handle and transform errors
   */
  private handleError(error: unknown): Error {
    // If it's already our enhanced error, just rethrow
    if (error instanceof Error && 'apiError' in error) {
      return error
    }

    // Create generic error for unexpected cases
    const apiError: ApiError = {
      message: error instanceof Error ? error.message : 'Unknown API error',
      status: 0,
      code: 'UNKNOWN_ERROR',
      details: error instanceof Error ? { message: error.message, stack: error.stack } : { error: String(error) }
    }

    const enhancedError = new Error(apiError.message) as Error & { apiError: ApiError }
    enhancedError.apiError = apiError
    return enhancedError
  }

  /**
   * Stream support for future LLM providers
   */
  async stream(endpoint: string, data?: unknown): Promise<ReadableStream> {
    try {
      const response = await this.client.post(endpoint, { 
        json: data,
        headers: { 'Accept': 'text/stream' }
      })
      
      if (!response.body) {
        throw new Error('No response body for stream')
      }
      
      return response.body
    } catch (error) {
      throw this.handleError(error)
    }
  }
}