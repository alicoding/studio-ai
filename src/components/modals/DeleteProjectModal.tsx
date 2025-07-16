/**
 * DeleteProjectModal - Confirmation modal for project deletion
 *
 * SOLID: Single responsibility - project deletion confirmation
 * DRY: Reusable modal component
 * KISS: Simple confirmation interface
 */

import { Modal } from '../shared/Modal'
import { Button } from '../ui/button'
import { AlertTriangle } from 'lucide-react'

interface DeleteProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  projectName: string
  isDeleting?: boolean
}

export function DeleteProjectModal({
  isOpen,
  onClose,
  onConfirm,
  projectName,
  isDeleting = false,
}: DeleteProjectModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Project">
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">Delete "{projectName}"?</h3>
            <p className="text-sm text-muted-foreground mt-1">This action cannot be undone.</p>
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <h4 className="font-medium text-sm">This will:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Remove the project from Studio AI</li>
            <li>• NOT delete the actual files on disk</li>
            <li>• NOT affect Claude Code session history</li>
          </ul>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete Project'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
