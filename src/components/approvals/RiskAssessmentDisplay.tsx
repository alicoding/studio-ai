/**
 * RiskAssessmentDisplay Component - Visual display of approval risk level
 *
 * SOLID: Single responsibility - risk level visualization
 * DRY: Reusable risk level mapping
 * KISS: Simple color-coded risk display
 * Library-First: Uses React and Tailwind
 */

import React from 'react'
import { AlertTriangle, Shield, AlertCircle, Info } from 'lucide-react'
import type { RiskLevel } from '../../../web/server/schemas/approval-types'

interface RiskAssessmentDisplayProps {
  riskLevel: RiskLevel
  className?: string
  showDetails?: boolean
}

export const RiskAssessmentDisplay: React.FC<RiskAssessmentDisplayProps> = ({
  riskLevel,
  className = '',
  showDetails = false,
}) => {
  /**
   * Get visual properties for risk level
   * KISS: Simple mapping of risk to visuals
   */
  const getRiskVisuals = (risk: RiskLevel) => {
    switch (risk) {
      case 'critical':
        return {
          icon: <AlertTriangle className="w-5 h-5" />,
          color: 'var(--color-approval-critical)',
          bgColor: 'var(--color-approval-critical-bg)',
          borderColor: 'var(--color-approval-critical)',
          label: 'Critical Risk',
          description: 'This operation has critical impact and requires careful consideration',
        }

      case 'high':
        return {
          icon: <AlertCircle className="w-5 h-5" />,
          color: 'var(--color-approval-high)',
          bgColor: 'var(--color-approval-high-bg)',
          borderColor: 'var(--color-approval-high)',
          label: 'High Risk',
          description: 'Significant changes will occur that may be difficult to reverse',
        }

      case 'medium':
        return {
          icon: <Info className="w-5 h-5" />,
          color: 'var(--color-approval-medium)',
          bgColor: 'var(--color-approval-medium-bg)',
          borderColor: 'var(--color-approval-medium)',
          label: 'Medium Risk',
          description: 'Standard operational changes with moderate impact',
        }

      case 'low':
        return {
          icon: <Shield className="w-5 h-5" />,
          color: 'var(--color-approval-low)',
          bgColor: 'var(--color-approval-low-bg)',
          borderColor: 'var(--color-approval-low)',
          label: 'Low Risk',
          description: 'Routine operation with minimal impact',
        }
    }
  }

  /**
   * Get risk guidelines
   * DRY: Centralized risk guidance
   */
  const getRiskGuidelines = (risk: RiskLevel): string[] => {
    switch (risk) {
      case 'critical':
        return [
          'Double-check all details before approving',
          'Consider consulting with team members',
          'Ensure rollback plan is in place',
          'Document your decision reasoning',
        ]

      case 'high':
        return [
          'Review the impact assessment carefully',
          'Verify all prerequisites are met',
          'Consider timing and dependencies',
          'Be prepared for potential issues',
        ]

      case 'medium':
        return [
          'Standard review process applies',
          'Check for any unusual circumstances',
          'Ensure proper monitoring is in place',
        ]

      case 'low':
        return ['Standard approval process', 'Quick review recommended']
    }
  }

  const visuals = getRiskVisuals(riskLevel)
  const guidelines = getRiskGuidelines(riskLevel)

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Risk Level Badge */}
      <div
        className="inline-flex items-center space-x-2 px-3 py-2 rounded-lg border"
        style={{
          backgroundColor: visuals.bgColor,
          borderColor: visuals.borderColor,
        }}
      >
        <span style={{ color: visuals.color }}>{visuals.icon}</span>
        <span className="font-medium" style={{ color: visuals.color }}>
          {visuals.label}
        </span>
      </div>

      {/* Risk Description */}
      <p className="text-sm text-muted-foreground">{visuals.description}</p>

      {/* Detailed Guidelines */}
      {showDetails && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-foreground mb-2">Review Guidelines</h4>
          <ul className="space-y-1">
            {guidelines.map((guideline, index) => (
              <li key={index} className="flex items-start space-x-2">
                <span className="text-muted-foreground mt-0.5">•</span>
                <span className="text-sm text-muted-foreground">{guideline}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Risk Scale Indicator */}
      <div className="mt-4">
        <div className="flex items-center space-x-2">
          <span className="text-xs text-muted-foreground">Risk Scale:</span>
          <div className="flex space-x-1">
            {(['low', 'medium', 'high', 'critical'] as RiskLevel[]).map((level) => {
              const isActive = level === riskLevel
              const levelVisuals = getRiskVisuals(level)

              return (
                <div
                  key={level}
                  className={`w-8 h-2 rounded-full transition-all ${
                    isActive ? 'ring-2 ring-offset-1 ring-primary' : ''
                  }`}
                  style={{
                    backgroundColor: isActive ? levelVisuals.bgColor : 'var(--color-secondary)',
                  }}
                  title={levelVisuals.label}
                />
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
