# Contributing to GDevelop Assistant

Thank you for your interest in contributing to GDevelop Assistant! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive feedback
- Respect differing viewpoints and experiences

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in Issues
2. Create a new issue with a clear title and description
3. Include steps to reproduce the bug
4. Add relevant logs, screenshots, or error messages
5. Specify your environment (OS, Node version, Docker version, etc.)

### Suggesting Enhancements

1. Check if the enhancement has already been suggested
2. Create a new issue with the "enhancement" label
3. Clearly describe the feature and its benefits
4. Provide examples of how it would work

### Pull Requests

1. Fork the repository
2. Create a new branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test your changes thoroughly
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## Development Setup

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Git

### Local Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/GDevelopAssistant.git
cd GDevelopAssistant

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start dev server (Express + Vite HMR)
npm run dev
```

### Backend Connection (Critical)

The app proxies all backend calls through Express. **Both** `server/routes.ts` (dev) and
`server/vercelApp.ts` (Vercel) **must** call `setupGrudgeProxy(app)`. If either is missing,
`/api/grudge/*` routes will 404.

See [docs/BACKEND_CONNECTION_GUIDE.md](docs/BACKEND_CONNECTION_GUIDE.md) for the full
architecture, service map, domain conventions, and checklist.

## Project Structure

```
GDevelopAssistant/
├── src/
│   ├── ai-agents/        # AI agents service
│   ├── game-server/      # Game server service
│   ├── puter-db/         # Database integration
│   ├── cloud-storage/    # Cloud storage service
│   └── index.js          # Main entry point
├── config/               # Configuration files
├── deploy/
│   └── kubernetes/       # Kubernetes manifests
├── docs/                 # Documentation
├── examples/             # Example code
├── .github/
│   └── workflows/        # CI/CD pipelines
├── docker-compose.yml    # Docker Compose configuration
├── Dockerfile           # Docker image definition
└── package.json         # Node.js dependencies
```

## Coding Standards

### JavaScript Style

- Use ES6+ features
- Use `const` and `let`, not `var`
- Use arrow functions where appropriate
- Follow existing code style
- Add JSDoc comments for functions

### Example:

```javascript
/**
 * Process AI query and return response
 * @param {string} agentId - The agent identifier
 * @param {string} query - The query text
 * @returns {Promise<Object>} The AI response
 */
async function processAIQuery(agentId, query) {
  // Implementation
}
```

### Naming Conventions

- Use camelCase for variables and functions
- Use PascalCase for classes
- Use UPPER_CASE for constants
- Use descriptive names

### Error Handling

- Always handle errors appropriately
- Use try-catch for async operations
- Return meaningful error messages
- Log errors with appropriate context

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/ai-agents.test.js

# Run with coverage
npm run test:coverage
```

### Writing Tests

- Write tests for new features
- Ensure existing tests pass
- Aim for good code coverage
- Use descriptive test names

## Documentation

- Update README.md if you change functionality
- Update [docs/BACKEND_CONNECTION_GUIDE.md](docs/BACKEND_CONNECTION_GUIDE.md) for backend proxy or connection changes
- Update [AUTH_INTEGRATION.md](AUTH_INTEGRATION.md) for auth changes
- Update [docs/AI_SYSTEMS_GUIDE.md](docs/AI_SYSTEMS_GUIDE.md) for AI architecture changes
- Add JSDoc comments to your code

## Commit Messages

Use clear and descriptive commit messages:

```
Add: New feature description
Fix: Bug fix description
Update: Update description
Refactor: Refactoring description
Docs: Documentation changes
```

Examples:
- `Add: WebSocket support for game rooms`
- `Fix: Database connection timeout issue`
- `Update: Increase AI agent timeout to 30s`
- `Docs: Add API examples for cloud storage`

## Review Process

1. All PRs require at least one review
2. All tests must pass
3. Code must follow style guidelines
4. Documentation must be updated
5. No merge conflicts

## Getting Help

- Open an issue for questions
- Join our community discussions
- Check existing documentation
- Review example code

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Recognition

Contributors will be recognized in:
- CONTRIBUTORS.md file
- Release notes
- Project documentation

Thank you for contributing to GDevelop Assistant! 🎮
