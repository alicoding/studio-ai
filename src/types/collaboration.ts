/**
 * Collaboration mode types for Studio AI
 * Defines how humans and AI agents work together
 */

export type CollaborationMode = 'autonomous' | 'guided' | 'review'

export interface CollaborationSettings {
  mode: CollaborationMode
  autoCommit: boolean
  autoPR: boolean
  runTests: boolean
  requireApproval: boolean
  showPreview: boolean
  hotReload: boolean
  draftMode: boolean
  showDiff: boolean
  branchStrategy: 'feature' | 'direct' | 'staging'
  previewPort?: number
}

export const defaultSettings: Record<CollaborationMode, CollaborationSettings> = {
  autonomous: {
    mode: 'autonomous',
    autoCommit: true,
    autoPR: true,
    runTests: true,
    requireApproval: false,
    showPreview: false,
    hotReload: false,
    draftMode: false,
    showDiff: false,
    branchStrategy: 'feature',
  },
  guided: {
    mode: 'guided',
    autoCommit: true,
    autoPR: false,
    runTests: false,
    requireApproval: false,
    showPreview: true,
    hotReload: true,
    draftMode: false,
    showDiff: true,
    branchStrategy: 'feature',
    previewPort: 5174,
  },
  review: {
    mode: 'review',
    autoCommit: false,
    autoPR: false,
    runTests: false,
    requireApproval: true,
    showPreview: true,
    hotReload: false,
    draftMode: true,
    showDiff: true,
    branchStrategy: 'feature',
  },
}

export interface ModeCapabilities {
  icon: string
  title: string
  description: string
  bestFor: string[]
  color: string
}

export const modeInfo: Record<CollaborationMode, ModeCapabilities> = {
  autonomous: {
    icon: '🤖',
    title: 'Autonomous',
    description: 'AI team works independently',
    bestFor: ['Tests', 'Documentation', 'Refactoring', 'Bug fixes'],
    color: 'text-purple-600',
  },
  guided: {
    icon: '🤝',
    title: 'Guided',
    description: 'You steer, AI codes',
    bestFor: ['Features', 'Exploration', 'Learning', 'Prototyping'],
    color: 'text-blue-600',
  },
  review: {
    icon: '🔍',
    title: 'Review',
    description: 'Full control with AI assistance',
    bestFor: ['Critical code', 'Security', 'Production', 'Teaching'],
    color: 'text-green-600',
  },
}
