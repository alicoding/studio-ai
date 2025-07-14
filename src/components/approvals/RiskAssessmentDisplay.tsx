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
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-300',
          label: 'Critical Risk',
          description: 'This operation has critical impact and requires careful consideration',
        }

      case 'high':
        return {
          icon: <AlertCircle className="w-5 h-5" />,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-300',
          label: 'High Risk',
          description: 'Significant changes will occur that may be difficult to reverse',
        }

      case 'medium':
        return {
          icon: <Info className="w-5 h-5" />,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-300',
          label: 'Medium Risk',
          description: 'Standard operational changes with moderate impact',
        }

      case 'low':
        return {
          icon: <Shield className="w-5 h-5" />,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-300',
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
        className={`
          inline-flex items-center space-x-2 px-3 py-2 rounded-lg border
          ${visuals.bgColor} ${visuals.borderColor}
        `}
      >
        <span className={visuals.color}>{visuals.icon}</span>
        <span className={`font-medium ${visuals.color}`}>{visuals.label}</span>
      </div>

      {/* Risk Description */}
      <p className="text-sm text-gray-600">{visuals.description}</p>

      {/* Detailed Guidelines */}
      {showDetails && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Review Guidelines</h4>
          <ul className="space-y-1">
            {guidelines.map((guideline, index) => (
              <li key={index} className="flex items-start space-x-2">
                <span className="text-gray-400 mt-0.5">•</span>
                <span className="text-sm text-gray-600">{guideline}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Risk Scale Indicator */}
      <div className="mt-4">
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">Risk Scale:</span>
          <div className="flex space-x-1">
            {(['low', 'medium', 'high', 'critical'] as RiskLevel[]).map((level) => {
              const isActive = level === riskLevel
              const levelVisuals = getRiskVisuals(level)

              return (
                <div
                  key={level}
                  className={`
                    w-8 h-2 rounded-full transition-all
                    ${
                      isActive
                        ? `${levelVisuals.bgColor} ring-2 ring-offset-1 ring-${level === 'critical' ? 'red' : level === 'high' ? 'orange' : level === 'medium' ? 'yellow' : 'green'}-400`
                        : 'bg-gray-200'
                    }
                  `}
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
