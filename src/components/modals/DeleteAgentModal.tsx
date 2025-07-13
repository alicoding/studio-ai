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

interface Agent {
  id: string
  name: string
  role: string
}

interface DeleteAgentModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  agents: Agent[]
  isDeleting?: boolean
}

export function DeleteAgentModal({
  isOpen,
  onClose,
  onConfirm,
  agents,
  isDeleting = false,
}: DeleteAgentModalProps) {
  const isSingle = agents.length === 1

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Delete {isSingle ? 'Agent' : `${agents.length} Agents`}
          </DialogTitle>
          <DialogDescription className="pt-2">
            Are you sure you want to remove {isSingle ? 'this agent' : 'these agents'} from the
            team? This will permanently delete all {isSingle ? 'its' : 'their'} session history.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {!isSingle && (
            <div className="mb-2 text-sm text-muted-foreground">
              The following agents will be deleted:
            </div>
          )}
          {isSingle ? (
            <div className="flex items-center justify-between rounded-md bg-secondary/50 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-destructive" />
                <span className="font-medium">{agents[0].name}</span>
              </div>
              <span className="text-sm text-muted-foreground">{agents[0].role}</span>
            </div>
          ) : (
            <ScrollArea className="h-[200px] w-full rounded-md border bg-secondary/50 p-3">
              <div className="space-y-2">
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    className="flex items-center justify-between rounded-md bg-background px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-destructive" />
                      <span className="font-medium">{agent.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{agent.role}</span>
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
                Delete {isSingle ? 'Agent' : `${agents.length} Agents`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
