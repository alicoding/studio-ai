# Blog Platform REST API Design

## Base URL

```
https://api.blogplatform.com/v1
```

## Authentication

All authenticated endpoints require Bearer token in Authorization header:

```
Authorization: Bearer <token>
```

## API Endpoints

### Authentication & Users

#### Register User

```
POST /auth/register
Content-Type: application/json

Request:
{
  "email": "user@example.com",
  "password": "securePassword123",
  "username": "johndoe",
  "displayName": "John Doe"
}

Response: 201 Created
{
  "id": "usr_123abc",
  "email": "user@example.com",
  "username": "johndoe",
  "displayName": "John Doe",
  "createdAt": "2025-01-10T10:00:00Z"
}
```

#### Login

```
POST /auth/login
Content-Type: application/json

Request:
{
  "email": "user@example.com",
  "password": "securePassword123"
}

Response: 200 OK
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresIn": 3600,
  "user": {
    "id": "usr_123abc",
    "email": "user@example.com",
    "username": "johndoe"
  }
}
```

#### Refresh Token

```
POST /auth/refresh
Content-Type: application/json

Request:
{
  "refreshToken": "eyJhbGc..."
}

Response: 200 OK
{
  "accessToken": "eyJhbGc...",
  "expiresIn": 3600
}
```

#### Get Current User

```
GET /users/me
Authorization: Bearer <token>

Response: 200 OK
{
  "id": "usr_123abc",
  "email": "user@example.com",
  "username": "johndoe",
  "displayName": "John Doe",
  "bio": "Software developer and blogger",
  "avatar": "https://cdn.blogplatform.com/avatars/usr_123abc.jpg",
  "createdAt": "2025-01-10T10:00:00Z",
  "postCount": 42,
  "followerCount": 150,
  "followingCount": 75
}
```

#### Update User Profile

```
PATCH /users/me
Authorization: Bearer <token>
Content-Type: application/json

Request:
{
  "displayName": "John Smith",
  "bio": "Updated bio",
  "avatar": "base64_image_data"
}

Response: 200 OK
{
  "id": "usr_123abc",
  "displayName": "John Smith",
  "bio": "Updated bio",
  "avatar": "https://cdn.blogplatform.com/avatars/usr_123abc_v2.jpg"
}
```

### Blog Posts

#### Create Post

```
POST /posts
Authorization: Bearer <token>
Content-Type: application/json

Request:
{
  "title": "Getting Started with REST APIs",
  "content": "# Introduction\n\nThis is the post content in markdown...",
  "excerpt": "A comprehensive guide to REST API design",
  "tags": ["api", "rest", "tutorial"],
  "status": "draft",
  "featuredImage": "base64_image_data"
}

Response: 201 Created
{
  "id": "post_456def",
  "title": "Getting Started with REST APIs",
  "slug": "getting-started-with-rest-apis",
  "content": "# Introduction\n\nThis is the post content in markdown...",
  "excerpt": "A comprehensive guide to REST API design",
  "author": {
    "id": "usr_123abc",
    "username": "johndoe",
    "displayName": "John Doe"
  },
  "tags": ["api", "rest", "tutorial"],
  "status": "draft",
  "featuredImage": "https://cdn.blogplatform.com/posts/post_456def.jpg",
  "createdAt": "2025-01-10T12:00:00Z",
  "updatedAt": "2025-01-10T12:00:00Z",
  "publishedAt": null,
  "viewCount": 0,
  "likeCount": 0,
  "commentCount": 0
}
```

#### Get Posts (with pagination and filtering)

```
GET /posts?page=1&limit=20&status=published&tag=api&author=johndoe&sort=-createdAt

Response: 200 OK
{
  "data": [
    {
      "id": "post_456def",
      "title": "Getting Started with REST APIs",
      "slug": "getting-started-with-rest-apis",
      "excerpt": "A comprehensive guide to REST API design",
      "author": {
        "id": "usr_123abc",
        "username": "johndoe",
        "displayName": "John Doe"
      },
      "tags": ["api", "rest", "tutorial"],
      "status": "published",
      "featuredImage": "https://cdn.blogplatform.com/posts/post_456def.jpg",
      "publishedAt": "2025-01-10T14:00:00Z",
      "viewCount": 1250,
      "likeCount": 45,
      "commentCount": 12,
      "readTime": 8
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

#### Get Single Post

```
GET /posts/{postId}

Response: 200 OK
{
  "id": "post_456def",
  "title": "Getting Started with REST APIs",
  "slug": "getting-started-with-rest-apis",
  "content": "# Introduction\n\nFull post content...",
  "excerpt": "A comprehensive guide to REST API design",
  "author": {
    "id": "usr_123abc",
    "username": "johndoe",
    "displayName": "John Doe",
    "avatar": "https://cdn.blogplatform.com/avatars/usr_123abc.jpg"
  },
  "tags": ["api", "rest", "tutorial"],
  "status": "published",
  "featuredImage": "https://cdn.blogplatform.com/posts/post_456def.jpg",
  "createdAt": "2025-01-10T12:00:00Z",
  "updatedAt": "2025-01-10T13:00:00Z",
  "publishedAt": "2025-01-10T14:00:00Z",
  "viewCount": 1250,
  "likeCount": 45,
  "commentCount": 12,
  "readTime": 8,
  "isLikedByUser": true,
  "relatedPosts": [
    {
      "id": "post_789ghi",
      "title": "Advanced REST API Patterns",
      "slug": "advanced-rest-api-patterns"
    }
  ]
}
```

#### Update Post

```
PATCH /posts/{postId}
Authorization: Bearer <token>
Content-Type: application/json

Request:
{
  "title": "Updated Title",
  "content": "Updated content...",
  "status": "published"
}

Response: 200 OK
{
  "id": "post_456def",
  "title": "Updated Title",
  "status": "published",
  "publishedAt": "2025-01-10T15:00:00Z"
}
```

#### Delete Post

```
DELETE /posts/{postId}
Authorization: Bearer <token>

Response: 204 No Content
```

### Comments

#### Get Comments for Post

```
GET /posts/{postId}/comments?page=1&limit=20

Response: 200 OK
{
  "data": [
    {
      "id": "com_789xyz",
      "content": "Great article! Very helpful.",
      "author": {
        "id": "usr_456def",
        "username": "janedoe",
        "displayName": "Jane Doe",
        "avatar": "https://cdn.blogplatform.com/avatars/usr_456def.jpg"
      },
      "postId": "post_456def",
      "parentId": null,
      "createdAt": "2025-01-10T16:00:00Z",
      "updatedAt": "2025-01-10T16:00:00Z",
      "likeCount": 5,
      "isLikedByUser": false,
      "replies": [
        {
          "id": "com_890abc",
          "content": "Thanks! Glad you found it useful.",
          "author": {
            "id": "usr_123abc",
            "username": "johndoe",
            "displayName": "John Doe"
          },
          "parentId": "com_789xyz",
          "createdAt": "2025-01-10T16:30:00Z"
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 12
  }
}
```

#### Create Comment

```
POST /posts/{postId}/comments
Authorization: Bearer <token>
Content-Type: application/json

Request:
{
  "content": "This is a comment",
  "parentId": null  // or comment ID for replies
}

Response: 201 Created
{
  "id": "com_new123",
  "content": "This is a comment",
  "author": {
    "id": "usr_123abc",
    "username": "johndoe",
    "displayName": "John Doe"
  },
  "postId": "post_456def",
  "parentId": null,
  "createdAt": "2025-01-10T17:00:00Z"
}
```

#### Update Comment

```
PATCH /comments/{commentId}
Authorization: Bearer <token>
Content-Type: application/json

Request:
{
  "content": "Updated comment content"
}

Response: 200 OK
{
  "id": "com_new123",
  "content": "Updated comment content",
  "updatedAt": "2025-01-10T17:30:00Z"
}
```

#### Delete Comment

```
DELETE /comments/{commentId}
Authorization: Bearer <token>

Response: 204 No Content
```

### Likes

#### Like Post

```
POST /posts/{postId}/like
Authorization: Bearer <token>

Response: 201 Created
{
  "postId": "post_456def",
  "userId": "usr_123abc",
  "createdAt": "2025-01-10T18:00:00Z"
}
```

#### Unlike Post

```
DELETE /posts/{postId}/like
Authorization: Bearer <token>

Response: 204 No Content
```

#### Like Comment

```
POST /comments/{commentId}/like
Authorization: Bearer <token>

Response: 201 Created
```

### Following System

#### Follow User

```
POST /users/{userId}/follow
Authorization: Bearer <token>

Response: 201 Created
{
  "followerId": "usr_123abc",
  "followingId": "usr_456def",
  "createdAt": "2025-01-10T19:00:00Z"
}
```

#### Unfollow User

```
DELETE /users/{userId}/follow
Authorization: Bearer <token>

Response: 204 No Content
```

#### Get Followers

```
GET /users/{userId}/followers?page=1&limit=20

Response: 200 OK
{
  "data": [
    {
      "id": "usr_789ghi",
      "username": "alice",
      "displayName": "Alice Johnson",
      "avatar": "https://cdn.blogplatform.com/avatars/usr_789ghi.jpg",
      "bio": "Tech enthusiast",
      "isFollowedByUser": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

#### Get Following

```
GET /users/{userId}/following?page=1&limit=20

Response: 200 OK
{
  "data": [...],
  "pagination": {...}
}
```

### Tags

#### Get Popular Tags

```
GET /tags?limit=20

Response: 200 OK
{
  "data": [
    {
      "name": "javascript",
      "postCount": 1250,
      "followerCount": 5600
    },
    {
      "name": "api",
      "postCount": 890,
      "followerCount": 3200
    }
  ]
}
```

#### Follow Tag

```
POST /tags/{tagName}/follow
Authorization: Bearer <token>

Response: 201 Created
```

### Search

#### Search Posts

```
GET /search/posts?q=rest+api&page=1&limit=20

Response: 200 OK
{
  "data": [
    {
      "id": "post_456def",
      "title": "Getting Started with REST APIs",
      "excerpt": "A comprehensive guide to REST API design",
      "author": {
        "username": "johndoe",
        "displayName": "John Doe"
      },
      "relevanceScore": 0.95
    }
  ],
  "pagination": {...}
}
```

#### Search Users

```
GET /search/users?q=john&page=1&limit=20

Response: 200 OK
{
  "data": [
    {
      "id": "usr_123abc",
      "username": "johndoe",
      "displayName": "John Doe",
      "bio": "Software developer and blogger"
    }
  ],
  "pagination": {...}
}
```

### Notifications

#### Get Notifications

```
GET /notifications?page=1&limit=20&unreadOnly=true

Response: 200 OK
{
  "data": [
    {
      "id": "notif_123abc",
      "type": "comment",
      "message": "Jane Doe commented on your post",
      "relatedPost": {
        "id": "post_456def",
        "title": "Getting Started with REST APIs"
      },
      "actor": {
        "id": "usr_456def",
        "username": "janedoe",
        "displayName": "Jane Doe"
      },
      "isRead": false,
      "createdAt": "2025-01-10T20:00:00Z"
    }
  ],
  "pagination": {...},
  "unreadCount": 5
}
```

#### Mark Notification as Read

```
PATCH /notifications/{notificationId}/read
Authorization: Bearer <token>

Response: 200 OK
```

#### Mark All as Read

```
POST /notifications/mark-all-read
Authorization: Bearer <token>

Response: 200 OK
{
  "markedCount": 5
}
```

### Analytics (Author Dashboard)

#### Get Post Analytics

```
GET /posts/{postId}/analytics
Authorization: Bearer <token>

Response: 200 OK
{
  "postId": "post_456def",
  "views": {
    "total": 1250,
    "unique": 890,
    "today": 45,
    "thisWeek": 320,
    "thisMonth": 1250
  },
  "engagement": {
    "likes": 45,
    "comments": 12,
    "shares": 8,
    "averageReadTime": 4.5
  },
  "sources": [
    { "source": "direct", "views": 450 },
    { "source": "search", "views": 380 },
    { "source": "social", "views": 420 }
  ]
}
```

#### Get Author Stats

```
GET /users/me/stats
Authorization: Bearer <token>

Response: 200 OK
{
  "posts": {
    "total": 42,
    "published": 38,
    "drafts": 4
  },
  "engagement": {
    "totalViews": 15600,
    "totalLikes": 890,
    "totalComments": 245,
    "followers": 150
  },
  "growth": {
    "followersThisMonth": 12,
    "viewsThisMonth": 2300,
    "topPost": {
      "id": "post_456def",
      "title": "Getting Started with REST APIs",
      "views": 1250
    }
  }
}
```

## Error Responses

### Standard Error Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Email is required"
      }
    ]
  }
}
```

### Common Error Codes

- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource already exists
- `422 Unprocessable Entity` - Validation errors
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

## Rate Limiting

All endpoints include rate limit headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1625097600
```

## Pagination

Standard pagination query parameters:

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

## Sorting

Sort parameter format: `sort={field}` or `sort=-{field}` for descending

## Filtering

Common filters:

- Date ranges: `createdAfter`, `createdBefore`
- Status: `status=published|draft|archived`
- Author: `author={username}`
- Tags: `tag={tagName}` (multiple allowed)

## API Versioning

Version included in URL path: `/v1/`, `/v2/`

## WebSocket Events (Real-time)

```
ws://api.blogplatform.com/realtime

Events:
- post.published
- comment.created
- user.followed
- notification.new
```

## Webhooks

Configure webhooks for events:

```
POST /webhooks
{
  "url": "https://your-server.com/webhook",
  "events": ["post.published", "comment.created"]
}
```
