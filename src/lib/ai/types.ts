/**
 * AI Service Types - Zen MCP Replacement
 * 
 * SOLID: Interface segregation for different AI operations
 * DRY: Shared types across all AI services
 */

// AI Service Types - no imports needed, types are self-contained

// Thinking modes (similar to Zen)
export type ThinkingMode = 'minimal' | 'low' | 'medium' | 'high' | 'max'

// Base options for all AI operations
export interface AIOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  thinkingMode?: ThinkingMode
  useWebSearch?: boolean
  continuationId?: string // For multi-turn conversations
}

// Extended thinking options
export interface ThinkDeepOptions extends AIOptions {
  prompt: string
  problemContext?: string
  focusAreas?: string[]
  files?: string[]
  images?: string[]
}

// Code review options
export interface CodeReviewOptions extends AIOptions {
  files: string[]
  prompt: string
  reviewType?: 'full' | 'security' | 'performance' | 'quick'
  severityFilter?: 'critical' | 'high' | 'medium' | 'low' | 'all'
  focusOn?: string
  standards?: string
}

// Debug options
export interface DebugOptions extends AIOptions {
  step: string
  stepNumber: number
  totalSteps: number
  nextStepRequired: boolean
  findings: string
  hypothesis?: string
  confidence?: 'exploring' | 'low' | 'medium' | 'high' | 'certain'
  filesChecked?: string[]
  relevantFiles?: string[]
  relevantMethods?: string[]
}

// Analysis options
export interface AnalyzeOptions extends AIOptions {
  files: string[]
  prompt: string
  analysisType?: 'architecture' | 'performance' | 'security' | 'quality' | 'general'
  outputFormat?: 'summary' | 'detailed' | 'actionable'
}

// Test generation options
export interface TestGenOptions extends AIOptions {
  files: string[]
  prompt: string
  testExamples?: string[]
}

// Refactoring options
export interface RefactorOptions extends AIOptions {
  files: string[]
  prompt: string
  refactorType: 'codesmells' | 'decompose' | 'modernize' | 'organization'
  focusAreas?: string[]
  styleGuideExamples?: string[]
}

// Planning options
export interface PlannerOptions extends AIOptions {
  step: string
  stepNumber: number
  totalSteps: number
  nextStepRequired: boolean
  isStepRevision?: boolean
  revisesStepNumber?: number
  isBranchPoint?: boolean
  branchFromStep?: number
  branchId?: string
  moreStepsNeeded?: boolean
}

// Consensus options
export interface ConsensusOptions extends AIOptions {
  prompt: string
  models: Array<{
    model: string
    stance?: 'for' | 'against' | 'neutral'
    stancePrompt?: string
  }>
  focusAreas?: string[]
  files?: string[]
  images?: string[]
}

// Search options
export interface SearchOptions extends AIOptions {
  query: string
  focus?: string
}

// Response format
export interface AIResponse {
  content: string
  model: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  metadata?: Record<string, any>
}

// AI Service interface
export interface AIService {
  // Core thinking operations
  thinkDeep(options: ThinkDeepOptions): Promise<AIResponse>
  
  // Code operations
  reviewCode(options: CodeReviewOptions): Promise<AIResponse>
  debug(options: DebugOptions): Promise<AIResponse>
  analyze(options: AnalyzeOptions): Promise<AIResponse>
  generateTests(options: TestGenOptions): Promise<AIResponse>
  refactor(options: RefactorOptions): Promise<AIResponse>
  
  // Planning and consensus
  plan(options: PlannerOptions): Promise<AIResponse>
  consensus(options: ConsensusOptions): Promise<AIResponse[]>
  
  // Search
  search(options: SearchOptions): Promise<AIResponse>
  
  // General chat
  chat(prompt: string, options?: AIOptions): Promise<AIResponse>
}

// Token limits by thinking mode
export const THINKING_MODE_TOKENS: Record<ThinkingMode, number> = {
  minimal: 1000,    // 0.5% of max
  low: 4000,        // 8% of max
  medium: 16000,    // 33% of max
  high: 32000,      // 67% of max
  max: 50000        // 100% of max
}