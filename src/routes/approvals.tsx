/**
 * Global Approvals Management Page
 *
 * SOLID: Single responsibility - global approval management
 * DRY: Reuses ApprovalCanvasContent component
 * KISS: Simple route that delegates to canvas component
 * Library-First: Uses TanStack Router for routing
 */

import { createFileRoute } from '@tanstack/react-router'
import { ApprovalCanvasContent } from '../components/approvals/ApprovalCanvasContent'
import { PageLayout } from '../components/layout/PageLayout'

export const Route = createFileRoute('/approvals')({
  component: GlobalApprovalsPage,
})

function GlobalApprovalsPage() {
  return (
    <PageLayout>
      <div className="flex flex-col space-y-6 h-full">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Global Approvals</h1>
          <p className="text-muted-foreground">
            Manage system-wide approvals that apply across all projects
          </p>
        </div>

        <div className="flex-1 overflow-hidden">
          <ApprovalCanvasContent scope="global" className="h-full" />
        </div>
      </div>
    </PageLayout>
  )
}
