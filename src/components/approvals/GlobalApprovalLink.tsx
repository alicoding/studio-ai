/**
 * Context navigation component for switching between project and global approvals
 *
 * SOLID: Single responsibility - navigation between approval scopes
 * DRY: Reusable link component for scope switching
 * KISS: Simple navigation button with clear action
 * Library-First: Uses established UI components and routing
 */

import { Button } from '../ui/button'
import { Card, CardHeader, CardContent } from '../ui/card'
import { ArrowRight, Globe } from 'lucide-react'

export interface GlobalApprovalLinkProps {
  className?: string
}

export function GlobalApprovalLink({ className = '' }: GlobalApprovalLinkProps) {
  const handleNavigateToGlobal = () => {
    // TODO: Navigate to global approvals when route is created
    console.log('Navigate to global approvals')
  }

  const handleNavigateToConsolidated = () => {
    // TODO: Navigate to consolidated view when route is created
    console.log('Navigate to consolidated approvals')
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <h4 className="font-medium flex items-center">
          <Globe className="h-4 w-4 mr-2" />
          Other Approval Views
        </h4>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={handleNavigateToGlobal}
        >
          <ArrowRight className="h-4 w-4 mr-2" />
          Global Approvals
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={handleNavigateToConsolidated}
        >
          <ArrowRight className="h-4 w-4 mr-2" />
          All Approvals
        </Button>
      </CardContent>
    </Card>
  )
}
