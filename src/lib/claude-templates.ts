/**
 * CLAUDE.md Templates for Different Project Types
 *
 * SOLID: Single responsibility - template management
 * DRY: Reusable templates for project types
 * KISS: Simple template structure
 */

export interface ClaudeTemplate {
  id: string
  name: string
  content: string
}

export const CLAUDE_TEMPLATES: Record<string, string> = {
  blank: `# Project Instructions

This file provides guidance to Claude when working with this project.

## Project Overview
[Describe your project's purpose and goals]

## Development Guidelines
- Follow existing code patterns
- Maintain consistent code style
- Write clear, self-documenting code

## Key Principles
- Keep it simple
- Test your changes
- Document important decisions
`,

  webapp: `# Web Application Project Instructions

This file provides guidance to Claude when working with this web application.

## Tech Stack
- Frontend: [React/Vue/Angular]
- Backend: [Node.js/Python/etc]
- Database: [PostgreSQL/MongoDB/etc]

## Development Guidelines

### Frontend
- Component-based architecture
- Responsive design for all screen sizes
- Accessibility (WCAG 2.1 AA compliance)
- Performance optimization (lazy loading, code splitting)

### Backend
- RESTful API design
- Input validation and sanitization
- Error handling and logging
- Security best practices (authentication, authorization)

### Testing
- Unit tests for business logic
- Integration tests for API endpoints
- E2E tests for critical user flows

## Code Style
- ESLint/Prettier configuration
- Consistent naming conventions
- TypeScript for type safety

## Deployment
- Environment configuration
- CI/CD pipeline details
- Monitoring and logging
`,

  mobile: `# Mobile App Project Instructions

This file provides guidance to Claude when working with this mobile application.

## Platform
- Framework: [React Native/Flutter/Native]
- Target Platforms: [iOS/Android/Both]
- Minimum OS Versions: [iOS 13+/Android 6+]

## Development Guidelines

### UI/UX
- Platform-specific design guidelines (iOS HIG, Material Design)
- Responsive layouts for different screen sizes
- Offline-first approach
- Smooth animations and transitions

### Performance
- Optimize bundle size
- Lazy loading for heavy components
- Image optimization
- Memory management

### Native Features
- Push notifications
- Camera/Gallery access
- Location services
- Biometric authentication

### Testing
- Unit tests for business logic
- Component testing
- Device testing on real hardware
- Performance profiling

## Build & Release
- Code signing setup
- Store submission guidelines
- Version management
- Beta testing process
`,

  'data-science': `# Data Science Project Instructions

This file provides guidance to Claude when working with this data science project.

## Environment
- Python version: [3.8+]
- Key libraries: pandas, numpy, scikit-learn, matplotlib
- Jupyter notebooks for exploration
- Virtual environment management

## Project Structure
\`\`\`
├── data/           # Raw and processed data
├── notebooks/      # Jupyter notebooks
├── src/           # Source code
├── models/        # Trained models
├── reports/       # Generated reports
└── tests/         # Unit tests
\`\`\`

## Development Guidelines

### Data Handling
- Document data sources and collection methods
- Version control for datasets (DVC)
- Data privacy and security considerations
- Reproducible data pipelines

### Analysis
- Exploratory Data Analysis (EDA) first
- Statistical validation of findings
- Clear visualization with proper labels
- Document assumptions and limitations

### Machine Learning
- Baseline models first
- Cross-validation for model selection
- Feature engineering documentation
- Model versioning and experiment tracking

### Code Quality
- Type hints for functions
- Docstrings for all functions
- Modular, reusable code
- Unit tests for data transformations

## Best Practices
- Keep notebooks clean and narrative
- Export final code to .py files
- Use configuration files for parameters
- Document model performance metrics
`,

  api: `# API Project Instructions

This file provides guidance to Claude when working with this API project.

## Technology
- Language: [Node.js/Python/Go]
- Framework: [Express/FastAPI/Gin]
- Database: [PostgreSQL/MongoDB]
- Authentication: [JWT/OAuth2]

## API Design Principles

### RESTful Guidelines
- Proper HTTP methods (GET, POST, PUT, DELETE)
- Meaningful resource URLs
- Consistent response formats
- Proper status codes

### Security
- Input validation on all endpoints
- Rate limiting
- CORS configuration
- API key/token management
- HTTPS enforcement

### Documentation
- OpenAPI/Swagger specification
- Example requests and responses
- Error code documentation
- Versioning strategy

## Development Guidelines

### Code Structure
\`\`\`
├── controllers/    # Request handlers
├── models/        # Data models
├── routes/        # API routes
├── middleware/    # Custom middleware
├── services/      # Business logic
├── utils/         # Helper functions
└── tests/         # Test files
\`\`\`

### Best Practices
- Dependency injection
- Error handling middleware
- Request/response logging
- Database connection pooling
- Caching strategy

### Testing
- Unit tests for business logic
- Integration tests for endpoints
- Load testing for performance
- Contract testing for API consumers

## Deployment
- Environment variables for configuration
- Health check endpoints
- Graceful shutdown handling
- Monitoring and alerting
`,
}

export function getClaudeTemplate(projectType: string): string {
  return CLAUDE_TEMPLATES[projectType] || CLAUDE_TEMPLATES.blank
}

export function getAllTemplates(): ClaudeTemplate[] {
  return Object.entries(CLAUDE_TEMPLATES).map(([id, content]) => ({
    id,
    name: id.charAt(0).toUpperCase() + id.slice(1).replace('-', ' '),
    content,
  }))
}
