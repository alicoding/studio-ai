/**
 * Approval assignment component - Assign approvals to specific users
 *
 * SOLID: Single responsibility - user assignment for approvals
 * DRY: Reusable assignment UI
 * KISS: Simple user selection interface
 * Library-First: Uses shadcn/ui components
 */

import { useState } from 'react'
import { Card, CardHeader, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Avatar, AvatarFallback } from '../ui/avatar'
import { User, UserPlus, X } from 'lucide-react'
import type { EnrichedApproval } from '../../hooks/useApprovals'

// Current user - in single-user system, this is always the same user
const CURRENT_USER = {
  id: 'current-user',
  name: 'You',
  email: 'user@studio-ai.ai',
  role: 'Administrator',
}

// Available users for assignment (currently just the current user)
const AVAILABLE_USERS = [CURRENT_USER]

export interface ApprovalAssignmentProps {
  approval: EnrichedApproval
  assignedUserId?: string
  onAssign: (approvalId: string, userId: string | null) => Promise<void>
  className?: string
}

export function ApprovalAssignment({
  approval,
  assignedUserId,
  onAssign,
  className = '',
}: ApprovalAssignmentProps) {
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string>(assignedUserId || '')
  const [isAssigning, setIsAssigning] = useState(false)

  const assignedUser = AVAILABLE_USERS.find((u) => u.id === assignedUserId)

  const handleAssign = async () => {
    if (!selectedUserId) return

    try {
      setIsAssigning(true)
      await onAssign(approval.id, selectedUserId)
      setIsAssignDialogOpen(false)
    } catch (error) {
      console.error('Failed to assign approval:', error)
      // TODO: Show error toast
    } finally {
      setIsAssigning(false)
    }
  }

  const handleUnassign = async () => {
    try {
      setIsAssigning(true)
      await onAssign(approval.id, null)
    } catch (error) {
      console.error('Failed to unassign approval:', error)
      // TODO: Show error toast
    } finally {
      setIsAssigning(false)
    }
  }

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium flex items-center">
              <User className="h-4 w-4 mr-2" />
              Assignment
            </h4>
            {approval.status === 'pending' && (
              <Button variant="outline" size="sm" onClick={() => setIsAssignDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Assign
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {assignedUser ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{getUserInitials(assignedUser.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{assignedUser.name}</p>
                  <p className="text-xs text-muted-foreground">{assignedUser.role}</p>
                </div>
              </div>
              {approval.status === 'pending' && (
                <Button variant="ghost" size="sm" onClick={handleUnassign} disabled={isAssigning}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Not assigned</p>
          )}
        </CardContent>
      </Card>

      {/* Assignment Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Approval</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user..." />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_USERS.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {getUserInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.role}</p>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm text-muted-foreground">
                The selected user will be notified and responsible for reviewing this approval.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={!selectedUserId || isAssigning}>
              {isAssigning ? 'Assigning...' : 'Assign User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
