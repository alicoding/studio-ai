import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { ScrollArea } from '../ui/scroll-area'
import type { WorkflowInfo } from '../../stores/workflows'

interface DeleteWorkflowModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  workflows: WorkflowInfo[]
  isDeleting?: boolean
}

export function DeleteWorkflowModal({
  isOpen,
  onClose,
  onConfirm,
  workflows,
  isDeleting = false,
}: DeleteWorkflowModalProps) {
  const isSingle = workflows.length === 1

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Delete {isSingle ? 'Workflow' : `${workflows.length} Workflows`}
          </DialogTitle>
          <DialogDescription className="pt-2">
            Are you sure you want to delete {isSingle ? 'this workflow' : 'these workflows'}? 
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {!isSingle && (
            <div className="mb-2 text-sm text-muted-foreground">
              The following workflows will be deleted:
            </div>
          )}
          {isSingle ? (
            <div className="flex items-center justify-between rounded-md bg-secondary/50 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-destructive" />
                <span className="font-medium">
                  {workflows[0].threadId.substring(0, 8)}...
                </span>
              </div>
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                workflows[0].status === 'running'
                  ? 'bg-blue-500/20 text-blue-500'
                  : workflows[0].status === 'completed'
                    ? 'bg-green-500/20 text-green-500'
                    : workflows[0].status === 'failed'
                      ? 'bg-red-500/20 text-red-500'
                      : workflows[0].status === 'aborted'
                        ? 'bg-orange-500/20 text-orange-500'
                        : 'bg-gray-500/20 text-gray-500'
              }`}>
                {workflows[0].status}
              </span>
            </div>
          ) : (
            <ScrollArea className="h-[200px] w-full rounded-md border bg-secondary/50 p-3">
              <div className="space-y-2">
                {workflows.map((workflow) => (
                  <div
                    key={workflow.threadId}
                    className="flex items-center justify-between rounded-md bg-background px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-destructive" />
                      <span className="font-medium">
                        {workflow.threadId.substring(0, 8)}...
                      </span>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      workflow.status === 'running'
                        ? 'bg-blue-500/20 text-blue-500'
                        : workflow.status === 'completed'
                          ? 'bg-green-500/20 text-green-500'
                          : workflow.status === 'failed'
                            ? 'bg-red-500/20 text-red-500'
                            : workflow.status === 'aborted'
                              ? 'bg-orange-500/20 text-orange-500'
                              : 'bg-gray-500/20 text-gray-500'
                    }`}>
                      {workflow.status}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting} className="gap-2">
            {isDeleting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Delete {isSingle ? 'Workflow' : `${workflows.length} Workflows`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}