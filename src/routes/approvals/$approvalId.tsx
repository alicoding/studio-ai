/**
 * Individual Approval Deep Link Route
 *
 * SOLID: Single responsibility - display single approval
 * DRY: Reuses approval detail components
 * KISS: Simple deep linking for direct approval access
 * Library-First: Uses TanStack Router for dynamic routing
 */

import { createFileRoute } from '@tanstack/react-router'
import { PageLayout } from '../../components/layout/PageLayout'
import { ApprovalDetailCard } from '../../components/approvals/ApprovalDetailCard'
import { Button } from '../../components/ui/button'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { useApprovals } from '../../hooks/useApprovals'

export const Route = createFileRoute('/approvals/$approvalId')({
  component: ApprovalDetailPage,
})

function ApprovalDetailPage() {
  const { approvalId } = Route.useParams()
  const navigate = useNavigate()

  // Fetch single approval - using consolidated scope to search across all
  const { approvals, loading, refetch, processApproval } = useApprovals({
    scope: 'consolidated',
    filters: {}, // We'll filter client-side for now
  })

  const approval = approvals.find((a) => a.id === approvalId)

  const handleBack = () => {
    navigate({ to: '/approvals/all' })
  }

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </PageLayout>
    )
  }

  if (!approval) {
    return (
      <PageLayout>
        <div className="flex flex-col items-center justify-center h-full space-y-4">
          <p className="text-muted-foreground">Approval not found</p>
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Approvals
          </Button>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <div className="flex flex-col space-y-6 h-full">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Approval Details</h1>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <ApprovalDetailCard
            approval={approval}
            onProcessApproval={async (id, decision) => {
              await processApproval(id, decision)
              // Navigate back after processing
              navigate({ to: '/approvals/all' })
            }}
            onRefresh={refetch}
            className="max-w-4xl mx-auto"
          />
        </div>
      </div>
    </PageLayout>
  )
}
