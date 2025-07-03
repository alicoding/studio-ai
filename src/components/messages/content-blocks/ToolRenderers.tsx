import { TodoList } from './TodoList'

interface ToolExpandedContentProps {
  name: string
  input: any
}

interface ToolResultContentProps {
  name: string
  result: any
  cleanResult: (text: string) => string
}

// Map of tool names to their custom expanded content renderers
const expandedContentRenderers: Record<string, (input: any) => React.ReactNode | null> = {
  TodoWrite: (input: any) => {
    if (!input?.todos || !Array.isArray(input.todos)) return null
    return (
      <div className="p-3 bg-background/50 rounded">
        <TodoList todos={input.todos} />
      </div>
    )
  }
}

// Map of tool names to their custom result renderers  
const resultContentRenderers: Record<string, (result: any, cleanResult: (text: string) => string) => React.ReactNode | null> = {
  TodoRead: (result: any, cleanResult: (text: string) => string) => {
    if (!result) return null
    
    try {
      const text = typeof result === 'string' ? result : result.text || ''
      const cleanedText = cleanResult(text)
      const todos = JSON.parse(cleanedText)
      if (Array.isArray(todos)) {
        return <TodoList todos={todos} />
      }
    } catch {
      // Fall back to default
    }
    
    return null
  }
}

export function renderToolExpandedContent({ name, input }: ToolExpandedContentProps): React.ReactNode | null {
  const renderer = expandedContentRenderers[name]
  return renderer ? renderer(input) : null
}

export function renderToolResultContent({ name, result, cleanResult }: ToolResultContentProps): React.ReactNode | null {
  const renderer = resultContentRenderers[name]
  return renderer ? renderer(result, cleanResult) : null
}