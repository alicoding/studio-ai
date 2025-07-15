/**
 * Conflict Resolution Modal - UI for resolving workflow version conflicts
 *
 * SOLID: Single responsibility for conflict resolution UI
 * DRY: Reusable modal for any workflow conflict scenario
 * KISS: Simple conflict comparison and resolution options
 * Library-First: Uses existing UI components and conflict resolution hook
 */

import { useState } from 'react'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Badge } from '../ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { AlertTriangle, Clock, FileText, GitMerge, Save, X } from 'lucide-react'
import { useConflictResolver } from '../../hooks/useConflictResolver'

interface ConflictResolutionModalProps {
  isOpen: boolean
  onClose: () => void
  onResolved?: () => void
}

export function ConflictResolutionModal({
  isOpen,
  onClose,
  onResolved,
}: ConflictResolutionModalProps) {
  const {
    state,
    conflictData,
    resolveKeepLocal,
    resolveKeepRemote,
    resolveWithMerge,
    getConflictSummary,
    clearConflict,
    isResolving,
  } = useConflictResolver()

  const [selectedStrategy, setSelectedStrategy] = useState<'local' | 'remote' | 'merge' | null>(
    null
  )

  const conflictSummary = getConflictSummary()

  const handleResolve = async () => {
    if (!selectedStrategy) return

    try {
      switch (selectedStrategy) {
        case 'local':
          await resolveKeepLocal()
          break
        case 'remote':
          await resolveKeepRemote()
          break
        case 'merge':
          if (conflictSummary?.suggestedMerge) {
            await resolveWithMerge(conflictSummary.suggestedMerge)
          }
          break
      }

      onResolved?.()
      onClose()
    } catch (error) {
      console.error('Failed to resolve conflict:', error)
    }
  }

  const handleCancel = () => {
    clearConflict()
    setSelectedStrategy(null)
    onClose()
  }

  if (!conflictData || !conflictSummary) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Workflow Conflict Detected
          </DialogTitle>
          <DialogDescription>
            Your local changes conflict with remote changes. Choose how to resolve the conflict.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Conflict Overview */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Your Changes (Local)
                </CardTitle>
                <CardDescription className="flex items-center gap-2 text-xs">
                  <Clock className="h-3 w-3" />
                  {conflictSummary.localChanges.lastModified
                    ? new Date(conflictSummary.localChanges.lastModified).toLocaleString()
                    : 'Unknown'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Steps:</span>
                    <Badge variant="secondary">{conflictSummary.localChanges.stepCount}</Badge>
                  </div>
                  {conflictSummary.localChanges.hasNewSteps && (
                    <Badge variant="outline" className="text-xs">
                      Has new steps
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Remote Changes
                </CardTitle>
                <CardDescription className="flex items-center gap-2 text-xs">
                  <Clock className="h-3 w-3" />
                  {conflictSummary.remoteChanges.lastModified
                    ? new Date(conflictSummary.remoteChanges.lastModified).toLocaleString()
                    : 'Unknown'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Steps:</span>
                    <Badge variant="secondary">{conflictSummary.remoteChanges.stepCount}</Badge>
                  </div>
                  {conflictSummary.remoteChanges.hasNewSteps && (
                    <Badge variant="outline" className="text-xs">
                      Has new steps
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Resolution Strategies */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Choose Resolution Strategy:</h3>

            <div className="space-y-2">
              {/* Keep Local */}
              <Card
                className={`cursor-pointer transition-colors ${
                  selectedStrategy === 'local' ? 'border-primary bg-primary/5' : ''
                }`}
                onClick={() => setSelectedStrategy('local')}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="resolution"
                      value="local"
                      checked={selectedStrategy === 'local'}
                      onChange={() => setSelectedStrategy('local')}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Save className="h-4 w-4" />
                        <span className="font-medium">Keep Your Changes</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Discard remote changes and keep your local version. Remote changes will be
                        lost.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Keep Remote */}
              <Card
                className={`cursor-pointer transition-colors ${
                  selectedStrategy === 'remote' ? 'border-primary bg-primary/5' : ''
                }`}
                onClick={() => setSelectedStrategy('remote')}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="resolution"
                      value="remote"
                      checked={selectedStrategy === 'remote'}
                      onChange={() => setSelectedStrategy('remote')}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <X className="h-4 w-4" />
                        <span className="font-medium">Use Remote Changes</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Discard your local changes and use the remote version. Your changes will be
                        lost.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Merge */}
              <Card
                className={`cursor-pointer transition-colors ${
                  selectedStrategy === 'merge' ? 'border-primary bg-primary/5' : ''
                }`}
                onClick={() => setSelectedStrategy('merge')}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="resolution"
                      value="merge"
                      checked={selectedStrategy === 'merge'}
                      onChange={() => setSelectedStrategy('merge')}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <GitMerge className="h-4 w-4" />
                        <span className="font-medium">Smart Merge</span>
                        <Badge variant="outline" className="text-xs">
                          Recommended
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Automatically combine both versions by merging steps. New steps from both
                        versions will be included.
                      </p>
                      {conflictSummary.suggestedMerge && (
                        <div className="mt-2 p-2 bg-muted rounded-md">
                          <div className="text-xs text-muted-foreground">
                            Merged version will have {conflictSummary.suggestedMerge.steps.length}{' '}
                            steps
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Error Display */}
          {state.lastError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{state.lastError}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isResolving}>
            Cancel
          </Button>
          <Button
            onClick={handleResolve}
            disabled={!selectedStrategy || isResolving}
            className="min-w-[120px]"
          >
            {isResolving ? 'Resolving...' : 'Resolve Conflict'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
