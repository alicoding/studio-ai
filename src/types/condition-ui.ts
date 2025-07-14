/**
 * UI-specific types for condition builder components
 *
 * SOLID: Single responsibility - UI-specific condition types only
 * DRY: Reuses backend condition types and extends for UI needs
 * KISS: Simple interfaces for condition builder components
 */

import type {
  ConditionDataType,
  ConditionOperation,
  ConditionValue,
  ConditionRule,
  ConditionGroup,
  StructuredCondition,
  WorkflowCondition,
  LogicalCombinator,
} from '../../web/server/schemas/condition-types'

/**
 * Available field that can be selected in condition rules
 * Represents step outputs that can be used in conditions
 */
export interface AvailableField {
  id: string // Unique identifier for the field
  stepId: string // The step this field belongs to
  stepName: string // Human-readable step name
  field: 'output' | 'status' | 'response' // Field type
  label: string // Display label (e.g., "Step 1 Output", "Step 2 Status")
  dataType?: ConditionDataType // Detected or inferred data type
  description?: string // Optional description of what this field contains
}

/**
 * UI state for condition builder modal
 */
export interface ConditionBuilderState {
  isOpen: boolean
  condition: WorkflowCondition | null // Current condition being edited
  availableFields: AvailableField[] // Fields available for selection
  selectedRuleId: string | null // Currently selected rule for editing
  selectedGroupId: string | null // Currently selected group for editing
  isValid: boolean // Whether current condition is valid
  validationErrors: string[] // Validation error messages
}

/**
 * Props for ConditionBuilderModal component
 */
export interface ConditionBuilderModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (condition: WorkflowCondition) => void
  initialCondition?: WorkflowCondition | null
  availableFields: AvailableField[]
  title?: string
}

/**
 * Props for ConditionGroup component
 */
export interface ConditionGroupProps {
  group: ConditionGroup
  availableFields: AvailableField[]
  level: number // Nesting level for visual indentation
  isRoot?: boolean // Whether this is the root group
  onUpdateGroup: (groupId: string, updates: Partial<ConditionGroup>) => void
  onDeleteGroup: (groupId: string) => void
  onAddRule: (groupId: string) => void
  onAddGroup: (parentGroupId: string) => void
  selectedRuleId?: string | null
  selectedGroupId?: string | null
  onSelectRule: (ruleId: string | null) => void
  onSelectGroup: (groupId: string | null) => void
}

/**
 * Props for ConditionRule component
 */
export interface ConditionRuleProps {
  rule: ConditionRule
  availableFields: AvailableField[]
  isSelected?: boolean
  onUpdateRule: (ruleId: string, updates: Partial<ConditionRule>) => void
  onDeleteRule: (ruleId: string) => void
  onSelect: (ruleId: string) => void
}

/**
 * Props for FieldSelector component
 */
export interface FieldSelectorProps {
  availableFields: AvailableField[]
  selectedField?: AvailableField | null
  onFieldSelect: (field: AvailableField) => void
  placeholder?: string
  disabled?: boolean
}

/**
 * Props for OperationSelector component
 */
export interface OperationSelectorProps {
  dataType: ConditionDataType
  selectedOperation?: ConditionOperation | null
  onOperationSelect: (operation: ConditionOperation) => void
  disabled?: boolean
}

/**
 * Props for ValueInput component
 */
export interface ValueInputProps {
  dataType: ConditionDataType
  operation: ConditionOperation
  value?: ConditionValue | null
  onValueChange: (value: ConditionValue) => void
  availableFields: AvailableField[]
  placeholder?: string
  disabled?: boolean
}

/**
 * Helper type for dynamic value input
 */
export interface ValueInputConfig {
  type: 'text' | 'number' | 'boolean' | 'date' | 'select' | 'field'
  placeholder?: string
  options?: Array<{ value: string | number | boolean; label: string }>
  validation?: (value: string) => boolean
}

/**
 * Condition builder action types for reducer pattern
 */
export type ConditionBuilderAction =
  | { type: 'SET_CONDITION'; payload: WorkflowCondition | null }
  | { type: 'SET_AVAILABLE_FIELDS'; payload: AvailableField[] }
  | { type: 'UPDATE_RULE'; payload: { ruleId: string; updates: Partial<ConditionRule> } }
  | { type: 'DELETE_RULE'; payload: { ruleId: string; groupId: string } }
  | { type: 'ADD_RULE'; payload: { groupId: string; rule: ConditionRule } }
  | { type: 'UPDATE_GROUP'; payload: { groupId: string; updates: Partial<ConditionGroup> } }
  | { type: 'DELETE_GROUP'; payload: { groupId: string; parentGroupId?: string } }
  | { type: 'ADD_GROUP'; payload: { parentGroupId: string; group: ConditionGroup } }
  | { type: 'SELECT_RULE'; payload: string | null }
  | { type: 'SELECT_GROUP'; payload: string | null }
  | { type: 'SET_VALIDATION'; payload: { isValid: boolean; errors: string[] } }

/**
 * Condition preview configuration
 */
export interface ConditionPreviewConfig {
  showDataTypes?: boolean // Show data type indicators
  showFieldDescriptions?: boolean // Show field descriptions in tooltips
  compactMode?: boolean // Use compact display format
  highlightInvalidRules?: boolean // Highlight rules with validation errors
}

/**
 * Export backend types for convenience
 */
export type {
  ConditionDataType,
  ConditionOperation,
  ConditionValue,
  ConditionRule,
  ConditionGroup,
  StructuredCondition,
  WorkflowCondition,
  LogicalCombinator,
}
