/**
 * Execution History Modal Component
 *
 * SOLID: Single responsibility - modal wrapper for execution history
 * DRY: Reuses ExecutionHistoryPanel and ModalLayout components
 * KISS: Simple modal wrapper with minimal additional logic
 * Library-First: Uses existing modal infrastructure
 */

import { Modal } from '../shared/Modal'
import { ExecutionHistoryPanel } from './ExecutionHistoryPanel'

interface ExecutionHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  savedWorkflowId: string
  workflowName: string
  onExecutionClick?: (threadId: string) => void
}

export function ExecutionHistoryModal({
  isOpen,
  onClose,
  savedWorkflowId,
  workflowName,
  onExecutionClick,
}: ExecutionHistoryModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Execution History - ${workflowName}`}
      className="max-w-4xl"
    >
      <ExecutionHistoryPanel
        savedWorkflowId={savedWorkflowId}
        onExecutionClick={onExecutionClick}
      />
    </Modal>
  )
}
