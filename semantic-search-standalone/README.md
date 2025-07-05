# Semantic Search

A standalone semantic code search library using ElectronHub embeddings. Search your codebase using natural language queries.

## Features

- 🔍 Natural language code search
- 🚀 Fast local vector search with cosine similarity
- 📦 Simple JSON-based index storage
- 🔧 CLI and programmatic API
- 🎯 Support for TypeScript, JavaScript, JSX, and TSX files
- ⚡ Automatic batching for API efficiency

## Installation

```bash
npm install semantic-search
# or
yarn add semantic-search
```

## Quick Start

### CLI Usage

```bash
# Set your ElectronHub API key
export ELECTRONHUB_API_KEY=your-api-key-here

# Index your project
npx semantic-search index /path/to/project

# Search for code
npx semantic-search search "user authentication logic" /path/to/project

# Show index statistics
npx semantic-search stats /path/to/project
```

### Programmatic Usage

```typescript
import { createSearchEngine } from 'semantic-search'

// Create search engine
const engine = await createSearchEngine('/path/to/project', {
  apiKey: 'your-electronhub-api-key'
})

// Build index
await engine.buildIndex()

// Search
const results = await engine.search('handle user click events')
results.forEach(result => {
  console.log(`${result.functionName} - Score: ${result.score}`)
  console.log(`File: ${result.file}:${result.line}`)
})
```

## Configuration

Create a `.env` file in your project root:

```env
# Required
ELECTRONHUB_API_KEY=your-api-key-here

# Optional
ELECTRONHUB_API_URL=https://api.electronhub.ai/v1
EMBEDDING_MODEL=text-embedding-3-small
BATCH_SIZE=100
RATE_LIMIT_DELAY=1000
INDEX_PATH=.semantic-search-index.json
```

## API Reference

### `createSearchEngine(projectPath, config?)`

Creates a new search engine instance.

- `projectPath`: Path to the project to search
- `config`: Optional configuration overrides

### `SemanticSearchEngine`

#### `buildIndex(force?: boolean)`

Builds the search index for the project.

- `force`: Force rebuild even if index exists

#### `search(query: string, limit?: number)`

Search for code using natural language.

- `query`: Natural language search query
- `limit`: Maximum number of results (default: 10)

#### `getStats()`

Get index statistics.

## How It Works

1. **Code Parsing**: Extracts functions and classes from your codebase
2. **Embedding Generation**: Converts code to vectors using ElectronHub's API
3. **Index Storage**: Saves embeddings to a local JSON file
4. **Semantic Search**: Uses cosine similarity to find relevant code

## Supported File Types

- TypeScript (`.ts`, `.tsx`)
- JavaScript (`.js`, `.jsx`)

## Ignored Patterns

- `node_modules/`
- `dist/`, `build/`
- `.next/`
- `coverage/`
- Test files (`*.test.*`, `*.spec.*`)

## Testing

```bash
# Run the test suite
npm test
```

## License

MIT