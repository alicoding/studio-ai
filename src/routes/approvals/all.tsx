/**
 * Consolidated Approvals View - All projects and global approvals
 *
 * SOLID: Single responsibility - consolidated approval view
 * DRY: Reuses ApprovalCanvasContent component
 * KISS: Simple route that delegates to canvas component
 * Library-First: Uses TanStack Router for routing
 */

import { createFileRoute } from '@tanstack/react-router'
import { ApprovalCanvasContent } from '../../components/approvals/ApprovalCanvasContent'
import { PageLayout } from '../../components/layout/PageLayout'

export const Route = createFileRoute('/approvals/all')({
  component: ConsolidatedApprovalsPage,
})

function ConsolidatedApprovalsPage() {
  return (
    <PageLayout>
      <div className="flex flex-col space-y-6 h-full">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold text-foreground">All Approvals</h1>
          <p className="text-muted-foreground">
            View and manage approvals across all projects and global scope
          </p>
        </div>

        <div className="flex-1 overflow-hidden">
          <ApprovalCanvasContent scope="consolidated" className="h-full" />
        </div>
      </div>
    </PageLayout>
  )
}
