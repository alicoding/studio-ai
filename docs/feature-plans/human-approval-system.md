# Human Approval System - Feature Plan

**Status**: 🚧 In Planning  
**Priority**: High  
**Est. Effort**: 2-3 days  
**Owner**: Claude Studio Team

## Overview

A comprehensive human-in-the-loop approval system that allows workflows to pause for human decisions at critical points. This system provides rich context, configurable notifications, timeout handling, and persistent approval management across browser sessions.

## Requirements

### Core Business Requirements

- **Context-Rich Decisions**: Users must see full workflow context, previous steps, and impact of their decision
- **Project-Centric Management**: Approvals organized by project with priority levels
- **Persistent State**: Approvals survive browser restarts and session changes
- **Configurable Timeouts**: Auto-approve, auto-reject, or escalate based on configuration
- **Audit Trail**: Complete history of who approved/rejected what and when

### Technical Requirements

- **Real-time Notifications**: WebSocket + configurable external notifications (email, Slack, SMS)
- **Scalable Architecture**: Support multiple concurrent approval workflows
- **Database Persistence**: Reliable storage of approval state and history
- **Integration Points**: Easy to add new notification channels
- **Security**: Proper authentication and authorization for approvals

## User Experience Flow

1. **Workflow Execution** → Human approval node triggered
2. **Immediate Notification** → Modal + WebSocket + configured external alerts
3. **Context Panel** → Rich approval interface with workflow visualization
4. **Decision Making** → Approve/Reject with optional comments and reasoning
5. **Impact Preview** → Show what happens next based on decision
6. **Persistent Tracking** → Approval appears in project dashboard until resolved

## Technical Architecture

### Database Schema

- `workflow_approvals` table for approval requests
- `approval_notifications` table for notification history
- `approval_decisions` table for audit trail

### API Endpoints

- `POST /api/workflows/{threadId}/approvals` - Create approval request
- `POST /api/approvals/{id}/decide` - Submit approval decision
- `GET /api/projects/{id}/approvals` - List pending approvals
- `GET /api/approvals/{id}/context` - Get rich approval context

### Frontend Components

- `ApprovalContextPanel` - Rich approval interface
- `ProjectApprovalsView` - Project-specific approval dashboard
- `ApprovalNotificationManager` - Handle real-time notifications
- `ApprovalHistoryViewer` - Audit trail interface

### Backend Services

- `ApprovalOrchestrator` - Core approval logic
- `NotificationDispatcher` - Multi-channel notification routing
- `ApprovalContextBuilder` - Generate rich context for decisions
- `TimeoutManager` - Handle approval timeouts

## Atomic Tasks

### Phase 1: Core Infrastructure

- [x] Create `workflow_approvals` database table with proper indexes
- [x] Create `approval_decisions` database table for audit trail
- [x] Create `approval_notifications` database table for notification history
- [x] Build `ApprovalOrchestrator` service with CRUD operations
- [x] Create approval API endpoints with proper validation
- [x] Add approval state to WorkflowOrchestrator integration
- [x] Write unit tests for ApprovalOrchestrator service
- [x] Write API integration tests for approval endpoints

### Phase 2: Rich Context System ✅ COMPLETE

- [x] Build `ApprovalContextBuilder` service for workflow context
- [x] Create workflow visualization component for approval context
- [x] Build previous steps display component
- [x] Create impact preview component (what happens next)
- [x] Build risk assessment display component
- [x] Create approval decision form with comment support
- [x] Add workflow position indicator to context panel
- [x] Write tests for context building components

### Phase 3: Project-Centric Management ✅ COMPLETE

- [x] Create `ProjectApprovalsView` component with priority grouping
- [x] Build pending approvals list with real-time updates
- [x] Create overdue approvals alert system
- [x] Add approval counts to project dashboard
- [x] Build approval history viewer for projects
- [ ] Create approval filtering and search functionality
- [ ] Add approval assignment to specific users
- [ ] Write tests for project approval management

### Phase 4: Notification System

- [ ] Build `NotificationDispatcher` service architecture
- [ ] Create email notification adapter with templates
- [ ] Create Slack notification adapter with rich formatting
- [ ] Create SMS notification adapter for critical approvals
- [ ] Build webhook notification adapter for custom integrations
- [ ] Create browser push notification support
- [ ] Add notification preferences to user settings
- [ ] Build notification delivery tracking and retry logic
- [ ] Write tests for all notification adapters

### Phase 5: Timeout & Escalation

- [ ] Build `TimeoutManager` service with configurable behaviors
- [ ] Create timeout configuration per approval type
- [ ] Build auto-reject timeout handler
- [ ] Build auto-approve timeout handler (with safety checks)
- [ ] Create escalation to manager workflow
- [ ] Build indefinite pending state with alerts
- [ ] Add timeout warnings before expiry
- [ ] Write tests for all timeout scenarios

### Phase 6: UI Integration & Polish

- [ ] Integrate approval modal with existing UI components
- [ ] Add approval status indicators to workflow visualization
- [ ] Create approval quick actions in project sidebar
- [ ] Build approval statistics dashboard
- [ ] Add keyboard shortcuts for approval actions
- [ ] Create approval templates for common scenarios
- [ ] Add approval reason categorization
- [ ] Polish approval UI with proper loading states

### Phase 7: Testing & Documentation

- [ ] Write comprehensive E2E tests for approval flows
- [ ] Create approval system user documentation
- [ ] Build approval configuration guide for admins
- [ ] Write notification setup documentation
- [ ] Create troubleshooting guide for approval issues
- [ ] Add approval metrics and monitoring
- [ ] Performance test with multiple concurrent approvals
- [ ] Security audit of approval authentication

## Dependencies

- ✅ **Database Connection**: PostgreSQL already configured
- ✅ **WebSocket System**: Socket.io infrastructure exists
- ✅ **Workflow System**: LangGraph workflow engine operational
- ⚠️ **User Authentication**: Need to verify user auth for approvals
- ⚠️ **Email Service**: Need SMTP configuration for email notifications
- ⚠️ **External APIs**: Slack/SMS APIs need configuration

## Testing Strategy

### Unit Tests

- ApprovalOrchestrator service methods
- NotificationDispatcher routing logic
- TimeoutManager behavior scenarios
- ApprovalContextBuilder data transformation

### Integration Tests

- API endpoint responses and validation
- Database operations and transactions
- Notification delivery end-to-end
- Workflow integration with approval nodes

### E2E Tests

- Complete approval workflow from trigger to resolution
- Multi-user approval scenarios
- Timeout behavior verification
- Browser restart persistence testing

## Risk Assessment

### High Risk

- **Approval Security**: Unauthorized approvals could bypass critical safeguards
- **Data Loss**: Approval state loss during system failures
- **Notification Failures**: Critical approvals missed due to notification issues

### Medium Risk

- **Performance**: Multiple concurrent approvals impacting system performance
- **UI Complexity**: Approval interface becoming too complex for quick decisions
- **Integration Brittleness**: Notification service dependencies causing failures

### Mitigation Strategies

- Implement approval authentication with role-based access
- Use database transactions for approval state changes
- Build notification fallback mechanisms (email if Slack fails)
- Add approval timeout safeguards to prevent auto-approve mistakes
- Create approval audit logs for compliance and debugging

## Success Metrics

- **Approval Response Time**: Average time from request to decision < 5 minutes
- **Notification Delivery Rate**: >99% successful notification delivery
- **Context Clarity**: User survey showing >90% confidence in approval decisions
- **System Reliability**: Zero approval state loss incidents
- **User Adoption**: >80% of workflows with approval nodes actively used

---

**Next Steps**: Complete Phase 1 tasks to establish core infrastructure, then iterate through phases based on user feedback and business priorities.
