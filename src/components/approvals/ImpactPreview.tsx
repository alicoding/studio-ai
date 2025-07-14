/**
 * ImpactPreview Component - Shows what happens next based on approval decision
 *
 * SOLID: Single responsibility - display impact assessment
 * DRY: Reusable impact item rendering
 * KISS: Simple decision-based preview
 * Library-First: Uses React and Tailwind
 */

import React, { useState } from 'react'
import { AlertTriangle, CheckCircle, XCircle, ArrowRight, Info } from 'lucide-react'
import type { ApprovalContextData } from '../../../web/server/schemas/approval-types'

interface ImpactPreviewProps {
  impactAssessment?: ApprovalContextData['impactAssessment']
  className?: string
}

export const ImpactPreview: React.FC<ImpactPreviewProps> = ({
  impactAssessment,
  className = '',
}) => {
  const [selectedDecision, setSelectedDecision] = useState<'approved' | 'rejected'>('approved')

  if (!impactAssessment) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>Impact assessment not available</div>
    )
  }

  /**
   * Get icon for risk item
   * KISS: Simple icon mapping
   */
  const getRiskIcon = (risk: string) => {
    const lowerRisk = risk.toLowerCase()

    if (lowerRisk.includes('critical') || lowerRisk.includes('irreversible')) {
      return <AlertTriangle className="w-4 h-4 text-red-500" />
    }
    if (lowerRisk.includes('significant') || lowerRisk.includes('complex')) {
      return <AlertTriangle className="w-4 h-4 text-amber-500" />
    }
    return <Info className="w-4 h-4 text-blue-500" />
  }

  /**
   * Render risk items
   * DRY: Reusable risk rendering
   */
  const renderRisks = (risks: string[], _decisionType: 'approved' | 'rejected') => {
    if (risks.length === 0) {
      return <p className="text-sm text-gray-500 italic">No significant risks identified</p>
    }

    return (
      <ul className="space-y-2">
        {risks.map((risk, index) => (
          <li key={index} className="flex items-start space-x-2">
            {getRiskIcon(risk)}
            <span className="text-sm text-gray-700 flex-1">{risk}</span>
          </li>
        ))}
      </ul>
    )
  }

  /**
   * Render next steps preview
   * KISS: Simple step list
   */
  const renderNextSteps = () => {
    if (impactAssessment.nextStepsPreview.length === 0) {
      return <p className="text-sm text-gray-500 italic">No additional steps will execute</p>
    }

    return (
      <div className="space-y-2">
        {impactAssessment.nextStepsPreview.map((step, index) => (
          <div key={index} className="flex items-center space-x-2">
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-700">{step}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="text-sm font-medium text-gray-700">Impact Assessment</h3>

      {/* Business Impact */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-center space-x-2 mb-1">
          <Info className="w-4 h-4 text-blue-600" />
          <h4 className="text-sm font-medium text-blue-900">Business Impact</h4>
        </div>
        <p className="text-sm text-blue-800">{impactAssessment.businessImpact}</p>
      </div>

      {/* Decision Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setSelectedDecision('approved')}
            className={`
              py-2 px-1 border-b-2 font-medium text-sm
              ${
                selectedDecision === 'approved'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4" />
              <span>If Approved</span>
            </div>
          </button>

          <button
            onClick={() => setSelectedDecision('rejected')}
            className={`
              py-2 px-1 border-b-2 font-medium text-sm
              ${
                selectedDecision === 'rejected'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <div className="flex items-center space-x-2">
              <XCircle className="w-4 h-4" />
              <span>If Rejected</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Decision Content */}
      <div className="space-y-4">
        {selectedDecision === 'approved' ? (
          <>
            {/* Next Steps */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Next Steps</h4>
              <div className="bg-gray-50 rounded-lg p-3">{renderNextSteps()}</div>
            </div>

            {/* Risks if Approved */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Potential Risks</h4>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                {renderRisks(impactAssessment.risksIfApproved, 'approved')}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* What Won't Happen */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Workflow Will Stop</h4>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-700">The following steps will not execute:</p>
                <div className="mt-2">{renderNextSteps()}</div>
              </div>
            </div>

            {/* Risks if Rejected */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Implications</h4>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                {renderRisks(impactAssessment.risksIfRejected, 'rejected')}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
