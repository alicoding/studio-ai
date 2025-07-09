import { useState } from 'react'
import { Trash2, AlertTriangle, FolderOpen, Database } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { RadioGroup, RadioGroupItem } from '../ui/radio-group'
import { Alert, AlertDescription } from '../ui/alert'

interface EnhancedDeleteProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (deleteWorkspace: boolean) => Promise<void>
  projectName: string
  projectPath: string
  isDeleting: boolean
}

export function EnhancedDeleteProjectModal({
  isOpen,
  onClose,
  onConfirm,
  projectName,
  projectPath,
  isDeleting,
}: EnhancedDeleteProjectModalProps) {
  const [deleteOption, setDeleteOption] = useState<'database' | 'full'>('database')
  const [confirmationText, setConfirmationText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const isFullDelete = deleteOption === 'full'
  const isConfirmationValid = !isFullDelete || confirmationText === projectName
  const canDelete = isConfirmationValid && !isDeleting

  const handleConfirm = async () => {
    setError(null)
    try {
      await onConfirm(isFullDelete)
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project')
    }
  }

  const handleClose = () => {
    if (!isDeleting) {
      setDeleteOption('database')
      setConfirmationText('')
      setError(null)
      onClose()
    }
  }

  // Check if path might be dangerous
  const isDangerousPath =
    projectPath === '/' ||
    projectPath === '~' ||
    projectPath === '~/' ||
    projectPath.split('/').filter(Boolean).length < 2

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Project: {projectName}
          </DialogTitle>
          <DialogDescription>Choose how you want to delete this project</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Delete Options */}
          <RadioGroup
            value={deleteOption}
            onValueChange={(value) => setDeleteOption(value as 'database' | 'full')}
            disabled={isDeleting}
          >
            <div className="space-y-3">
              <label
                htmlFor="database"
                className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-accent/50 transition-colors"
              >
                <RadioGroupItem value="database" id="database" className="mt-1" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 font-medium">
                    <Database className="h-4 w-4" />
                    Remove from Claude Studio
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Remove project from the Studio interface only. Your workspace files remain
                    untouched.
                  </p>
                </div>
              </label>

              <label
                htmlFor="full"
                className="flex items-start gap-3 rounded-lg border border-destructive/20 p-4 cursor-pointer hover:bg-destructive/5 transition-colors"
              >
                <RadioGroupItem value="full" id="full" className="mt-1" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 font-medium text-destructive">
                    <Trash2 className="h-4 w-4" />
                    Delete Project & Workspace
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Remove project from Studio AND move workspace files to trash.
                  </p>
                </div>
              </label>
            </div>
          </RadioGroup>

          {/* Workspace Path Display */}
          {isFullDelete && (
            <div className="space-y-3">
              <Alert variant={isDangerousPath ? 'destructive' : 'default'}>
                <FolderOpen className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <div className="font-medium">Workspace to be deleted:</div>
                    <code className="block bg-secondary px-2 py-1 rounded text-xs">
                      {projectPath}
                    </code>
                    {isDangerousPath && (
                      <div className="text-destructive font-medium mt-2">
                        ⚠️ Warning: This path looks dangerous to delete!
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>

              {/* Confirmation Input */}
              <div className="space-y-2">
                <Label htmlFor="confirmation">
                  To confirm workspace deletion, type the project name:{' '}
                  <span className="font-mono font-bold">{projectName}</span>
                </Label>
                <Input
                  id="confirmation"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder="Type project name here"
                  disabled={isDeleting}
                  className={confirmationText && !isConfirmationValid ? 'border-destructive' : ''}
                />
              </div>

              {/* Safety Notice */}
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <div className="font-medium">Important Safety Information:</div>
                    <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                      <li>Files will be moved to your system trash/recycle bin</li>
                      <li>You can recover files from trash if needed</li>
                      <li>This action cannot be undone from Claude Studio</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={!canDelete}>
            {isDeleting ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Deleting...
              </>
            ) : isFullDelete ? (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Project & Workspace
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                Remove from Studio
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
