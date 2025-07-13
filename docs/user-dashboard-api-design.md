# User Dashboard API Design

## Overview

This document outlines the backend API endpoints, data models, authentication, and caching strategy for the Claude Studio User Dashboard feature.

## API Endpoints

### 1. Dashboard Data Endpoints

#### GET /api/dashboard/activity
Retrieves recent activity timeline for the authenticated user.

**Authentication**: Required
**Rate Limit**: 100 requests per minute

**Query Parameters**:
- `limit` (number): Number of activities to return (default: 20, max: 100)
- `offset` (number): Pagination offset (default: 0)
- `type` (string[]): Filter by activity types (optional)
- `startDate` (ISO 8601): Filter activities after this date (optional)
- `endDate` (ISO 8601): Filter activities before this date (optional)

**Response**:
```typescript
{
  success: boolean;
  data: {
    activities: Activity[];
    pagination: {
      total: number;
      offset: number;
      limit: number;
      hasMore: boolean;
    };
  };
  error?: string;
}
```

#### GET /api/dashboard/metrics
Retrieves key metrics for the authenticated user.

**Authentication**: Required
**Rate Limit**: 60 requests per minute

**Query Parameters**:
- `period` (string): Time period for metrics ('day' | 'week' | 'month' | 'year')
- `metrics` (string[]): Specific metrics to include (optional)

**Response**:
```typescript
{
  success: boolean;
  data: {
    metrics: Metric[];
    period: string;
    lastUpdated: string; // ISO 8601
  };
  error?: string;
}
```

#### GET /api/dashboard/notifications
Retrieves notifications for the authenticated user.

**Authentication**: Required
**Rate Limit**: 100 requests per minute

**Query Parameters**:
- `status` ('unread' | 'read' | 'all'): Filter by status (default: 'unread')
- `limit` (number): Number of notifications (default: 50, max: 100)
- `offset` (number): Pagination offset (default: 0)

**Response**:
```typescript
{
  success: boolean;
  data: {
    notifications: Notification[];
    unreadCount: number;
    pagination: {
      total: number;
      offset: number;
      limit: number;
      hasMore: boolean;
    };
  };
  error?: string;
}
```

#### GET /api/dashboard/quick-actions
Retrieves available quick actions for the authenticated user.

**Authentication**: Required
**Rate Limit**: 60 requests per minute

**Response**:
```typescript
{
  success: boolean;
  data: {
    actions: QuickAction[];
    lastUsed: string[]; // Array of action IDs
  };
  error?: string;
}
```

### 2. Dashboard Configuration Endpoints

#### GET /api/dashboard/config
Retrieves user's dashboard configuration.

**Authentication**: Required
**Rate Limit**: 60 requests per minute

**Response**:
```typescript
{
  success: boolean;
  data: {
    layout: DashboardLayout;
    preferences: UserPreferences;
  };
  error?: string;
}
```

#### PUT /api/dashboard/config
Updates user's dashboard configuration.

**Authentication**: Required
**Rate Limit**: 20 requests per minute

**Request Body**:
```typescript
{
  layout?: DashboardLayout;
  preferences?: Partial<UserPreferences>;
}
```

**Response**:
```typescript
{
  success: boolean;
  data: {
    layout: DashboardLayout;
    preferences: UserPreferences;
  };
  error?: string;
}
```

### 3. Notification Management Endpoints

#### PUT /api/dashboard/notifications/:id/read
Marks a notification as read.

**Authentication**: Required
**Rate Limit**: 100 requests per minute

**Response**:
```typescript
{
  success: boolean;
  data: {
    notification: Notification;
  };
  error?: string;
}
```

#### POST /api/dashboard/notifications/bulk-read
Marks multiple notifications as read.

**Authentication**: Required
**Rate Limit**: 20 requests per minute

**Request Body**:
```typescript
{
  notificationIds: string[];
}
```

**Response**:
```typescript
{
  success: boolean;
  data: {
    updated: number;
  };
  error?: string;
}
```

#### DELETE /api/dashboard/notifications/:id
Dismisses a notification.

**Authentication**: Required
**Rate Limit**: 100 requests per minute

**Response**:
```typescript
{
  success: boolean;
  error?: string;
}
```

## Data Models

### Activity Model
```typescript
interface Activity {
  id: string;
  userId: string;
  type: ActivityType;
  title: string;
  description?: string;
  timestamp: string; // ISO 8601
  metadata: {
    projectId?: string;
    projectName?: string;
    fileId?: string;
    fileName?: string;
    [key: string]: any;
  };
  actions?: {
    label: string;
    action: string;
    params?: Record<string, any>;
  }[];
}

enum ActivityType {
  PROJECT_CREATED = 'project_created',
  PROJECT_UPDATED = 'project_updated',
  FILE_CREATED = 'file_created',
  FILE_UPDATED = 'file_updated',
  FILE_DELETED = 'file_deleted',
  COLLABORATION_STARTED = 'collaboration_started',
  TASK_COMPLETED = 'task_completed',
  DEPLOYMENT_SUCCESS = 'deployment_success',
  DEPLOYMENT_FAILED = 'deployment_failed',
  INTEGRATION_ADDED = 'integration_added',
  SETTING_CHANGED = 'setting_changed'
}
```

### Metric Model
```typescript
interface Metric {
  id: string;
  name: string;
  value: number | string;
  unit?: string;
  change?: {
    value: number;
    percentage: number;
    direction: 'up' | 'down' | 'stable';
  };
  sparkline?: number[]; // Array of values for trend visualization
  category: MetricCategory;
  lastUpdated: string; // ISO 8601
}

enum MetricCategory {
  PRODUCTIVITY = 'productivity',
  QUALITY = 'quality',
  COLLABORATION = 'collaboration',
  PERFORMANCE = 'performance'
}
```

### Notification Model
```typescript
interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  status: 'unread' | 'read';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string; // ISO 8601
  readAt?: string; // ISO 8601
  expiresAt?: string; // ISO 8601
  actions?: {
    label: string;
    action: string;
    style?: 'primary' | 'secondary' | 'danger';
    params?: Record<string, any>;
  }[];
  metadata?: Record<string, any>;
}

enum NotificationType {
  SYSTEM = 'system',
  COLLABORATION = 'collaboration',
  PROJECT = 'project',
  DEPLOYMENT = 'deployment',
  INTEGRATION = 'integration',
  SECURITY = 'security',
  UPDATE = 'update'
}
```

### QuickAction Model
```typescript
interface QuickAction {
  id: string;
  label: string;
  description?: string;
  icon: string;
  category: ActionCategory;
  action: {
    type: 'route' | 'modal' | 'api' | 'external';
    target: string;
    params?: Record<string, any>;
  };
  shortcut?: string; // Keyboard shortcut
  enabled: boolean;
  order: number;
}

enum ActionCategory {
  CREATE = 'create',
  NAVIGATE = 'navigate',
  MANAGE = 'manage',
  ANALYZE = 'analyze'
}
```

### Dashboard Configuration Models
```typescript
interface DashboardLayout {
  version: string;
  widgets: WidgetConfig[];
  gridCols: number;
  gridRows: number;
}

interface WidgetConfig {
  id: string;
  type: 'activity' | 'metrics' | 'quickActions' | 'notifications';
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  settings: Record<string, any>;
  visible: boolean;
}

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  refreshInterval: number; // seconds
  notificationSound: boolean;
  compactMode: boolean;
  defaultMetricPeriod: 'day' | 'week' | 'month' | 'year';
  activityFilters: ActivityType[];
  metricCategories: MetricCategory[];
}
```

## Authentication Strategy

### JWT Token Authentication
- All dashboard endpoints require valid JWT authentication
- Tokens include user ID, roles, and permissions
- Token expiration: 24 hours (configurable)
- Refresh token support for seamless experience

### Authorization Middleware
```typescript
interface AuthContext {
  userId: string;
  roles: string[];
  permissions: string[];
  organizationId?: string;
}

// Middleware implementation
async function authenticateDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const decoded = await verifyToken(token);
    req.auth = {
      userId: decoded.userId,
      roles: decoded.roles,
      permissions: decoded.permissions,
      organizationId: decoded.organizationId
    };

    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
}
```

### Rate Limiting
- Per-user rate limiting based on JWT claims
- Configurable limits per endpoint
- Headers include rate limit status:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

## Caching Strategy

### Multi-Level Caching Architecture

#### 1. Redis Cache (Primary)
- **Activity Timeline**: 5 minutes TTL
- **Metrics**: 1 minute TTL (real-time feel)
- **Notifications**: No caching (real-time updates)
- **Quick Actions**: 1 hour TTL
- **Dashboard Config**: 10 minutes TTL

#### 2. Application-Level Memory Cache
- LRU cache for frequently accessed data
- Max size: 100MB per instance
- Shorter TTLs than Redis (30-60 seconds)

#### 3. CDN Cache (for static assets)
- Dashboard widget templates
- Icon assets
- Configuration schemas

### Cache Invalidation Strategy

#### Event-Driven Invalidation
```typescript
interface CacheInvalidationEvent {
  type: 'activity' | 'metrics' | 'config' | 'all';
  userId: string;
  keys?: string[];
}

// Invalidation triggers
- New activity created → Invalidate activity cache
- Metric calculation complete → Invalidate metrics cache
- Configuration update → Invalidate config cache
- User action → Selective invalidation based on impact
```

#### Cache Key Patterns
```typescript
// Activity cache
`dashboard:activity:${userId}:${period}:${hash(filters)}`

// Metrics cache
`dashboard:metrics:${userId}:${period}:${metricTypes.join(',')}`

// Notifications (not cached, but count is)
`dashboard:notifications:count:${userId}`

// Quick actions cache
`dashboard:quickactions:${userId}:${role}`

// Configuration cache
`dashboard:config:${userId}`
```

### Cache Headers
```typescript
// Response headers for cache control
{
  'Cache-Control': 'private, max-age=300', // 5 minutes
  'ETag': generateETag(data),
  'Last-Modified': lastModifiedDate,
  'X-Cache-Status': 'HIT' | 'MISS' | 'BYPASS'
}
```

### Real-time Updates
- WebSocket connections for live notifications
- Server-Sent Events (SSE) for activity updates
- Automatic cache invalidation on real-time events

## Performance Optimizations

### Database Query Optimization
1. **Indexed Fields**:
   - `userId` on all collections
   - `timestamp` for activity queries
   - `status` for notification queries
   - Compound indexes for common filter combinations

2. **Query Strategies**:
   - Pagination with cursor-based navigation
   - Projection to limit returned fields
   - Aggregation pipelines for metrics calculation

### Response Compression
- Gzip compression for all API responses
- Brotli for supported clients
- Minimum size threshold: 1KB

### Connection Pooling
- Database connection pool: 10-50 connections
- Redis connection pool: 5-20 connections
- Health checks and automatic reconnection

## Error Handling

### Standard Error Response
```typescript
interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, any>;
  timestamp: string;
  requestId: string;
}
```

### Error Codes
- `AUTH_REQUIRED`: Authentication required
- `AUTH_INVALID`: Invalid authentication token
- `RATE_LIMITED`: Rate limit exceeded
- `VALIDATION_ERROR`: Request validation failed
- `NOT_FOUND`: Resource not found
- `SERVER_ERROR`: Internal server error

## Monitoring and Logging

### Metrics to Track
- API response times (p50, p95, p99)
- Cache hit rates
- Error rates by endpoint
- Active user sessions
- Real-time connection count

### Logging Strategy
```typescript
interface DashboardLog {
  timestamp: string;
  userId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  cacheStatus: 'HIT' | 'MISS' | 'BYPASS';
  error?: string;
}
```

## Security Considerations

### Data Access Control
- Row-level security for all user data
- Organization-based data isolation
- Role-based feature access

### Input Validation
- Request schema validation using Joi/Zod
- SQL injection prevention
- XSS protection for user-generated content

### Audit Trail
- Log all configuration changes
- Track notification dismissals
- Monitor unusual access patterns

## Implementation Notes

1. **Backwards Compatibility**: All endpoints versioned (v1)
2. **Graceful Degradation**: Dashboard works with partial data
3. **Progressive Enhancement**: Advanced features load asynchronously
4. **Mobile Optimization**: Lightweight responses for mobile clients