# Claude Studio Knowledge Base

This directory contains technical documentation for the Claude Studio project, capturing architecture decisions, patterns, known issues, and implementation details.

## Document Index

### 📐 [Architecture](./architecture.md)

- Cross-Server Communication Architecture
- EventSystem abstraction layer
- Redis adapter implementation
- Socket.IO integration
- Message flow between servers (3456/3457)

### ⚠️ [Gotchas & Known Issues](./gotchas.md)

- Claude Session File Location Issue
- Common debugging steps
- Prevention strategies

### 🛠️ [Services](./services.md)

- StudioSessionService - Claude JSONL file management
- EventSystem - Cross-server event distribution
- Key methods and integration points

### 🔌 [APIs](./apis.md)

- Studio Session Messages API
- WebSocket Events documentation
- Studio Projects API endpoints
- Event types and filtering

### 🎯 [Patterns](./patterns.md)

- WebSocket Message Routing pattern
- Component State Management
- Error Handling patterns
- File System patterns

## Quick Reference

### Finding Session Messages Not Loading?

1. Check [Gotchas](./gotchas.md#claude-session-file-location-issue) for the file location issue
2. Review [Services](./services.md#studiosessionservice) for how messages are loaded
3. See [APIs](./apis.md#studio-session-messages-api) for the endpoint details

### WebSocket Events Not Arriving?

1. Review [Architecture](./architecture.md#cross-server-communication-architecture) for event flow
2. Check [Patterns](./patterns.md#websocket-message-routing) for routing implementation
3. See [APIs](./apis.md#websocket-events) for event types

### Need to Add Cross-Server Features?

1. Understand [Architecture](./architecture.md#eventsystem-abstraction) for EventSystem
2. Follow [Patterns](./patterns.md#cross-server-event-distribution) for implementation
3. Review [Services](./services.md#eventsystem) for integration points

## Recent Updates

- **2025-01-10**: Initial knowledge base creation
- **2025-01-10**: Documented Redis cross-server communication fix
- **2025-01-10**: Captured Claude session file location issue and solution

## Contributing

When adding new knowledge:

1. Choose the appropriate document based on the categories above
2. Add cross-references using relative links
3. Update this README with any new sections
4. Include code examples and file paths where relevant
5. Document both the problem and the solution

## Related Documentation

- Main project README: `/README.md`
- Development guide: `/CLAUDE.md`
- TypeScript standards: `/docs/standards/typescript.md`
- API patterns: `/docs/standards/api-patterns.md`
- Component patterns: `/docs/standards/components.md`
- Project gotchas: `/docs/gotchas.md`
