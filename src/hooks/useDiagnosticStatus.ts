/**
 * useDiagnosticStatus - Checks project setup for diagnostic requirements
 *
 * SOLID: Single responsibility - diagnostic configuration checking
 * KISS: Simple boolean checks for common issues
 * Library First: Uses existing project store
 */

import { useEffect, useState } from 'react'
import { useProjectStore } from '../stores'

interface DiagnosticStatus {
  hasTypeScript: boolean
  hasESLint: boolean
  hasTypeCheckScript: boolean
  hasLintScript: boolean
  issues: string[]
  suggestions: string[]
}

export function useDiagnosticStatus() {
  const [status, setStatus] = useState<DiagnosticStatus>({
    hasTypeScript: false,
    hasESLint: false,
    hasTypeCheckScript: false,
    hasLintScript: false,
    issues: [],
    suggestions: [],
  })

  const { projects, activeProjectId } = useProjectStore()
  const activeProject = projects.find((p) => p.id === activeProjectId)

  useEffect(() => {
    if (!activeProject?.path) {
      setStatus({
        hasTypeScript: false,
        hasESLint: false,
        hasTypeCheckScript: false,
        hasLintScript: false,
        issues: ['No active project selected'],
        suggestions: ['Open a project to enable diagnostics'],
      })
      return
    }

    // Check project configuration
    checkProjectConfiguration(activeProject.path)
  }, [activeProject?.path])

  const checkProjectConfiguration = async (projectPath: string) => {
    try {
      const response = await fetch('/api/diagnostics/check-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath }),
      })

      if (response.ok) {
        const config = await response.json()

        const issues: string[] = []
        const suggestions: string[] = []

        if (!config.hasTypeScript) {
          issues.push('TypeScript not configured')
          suggestions.push('Add tsconfig.json file')
        }

        if (!config.hasESLint) {
          issues.push('ESLint not configured')
          suggestions.push('Add .eslintrc.js or eslint.config.js')
        }

        if (!config.hasTypeCheckScript) {
          issues.push('No type-check script in package.json')
          suggestions.push('Add "type-check": "tsc --noEmit" to package.json scripts')
        }

        if (!config.hasLintScript) {
          issues.push('No lint script in package.json')
          suggestions.push('Add "lint": "eslint src --ext ts,tsx" to package.json scripts')
        }

        setStatus({
          ...config,
          issues,
          suggestions,
        })
      }
    } catch (error) {
      console.warn('Failed to check diagnostic configuration:', error)
      setStatus({
        hasTypeScript: false,
        hasESLint: false,
        hasTypeCheckScript: false,
        hasLintScript: false,
        issues: ['Failed to check project configuration'],
        suggestions: ['Ensure project has valid package.json and TypeScript/ESLint setup'],
      })
    }
  }

  return status
}
