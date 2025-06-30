import { AlertCircle } from 'lucide-react'
import { ThinkingBlock } from './ThinkingBlock'
import { ImageBlock } from './ImageBlock'
import { ToolUseBlock } from './ToolUseBlock'
import { ToolResultBlock } from './ToolResultBlock'
import { MarkdownContent } from './MarkdownContent'

interface ContentRenderer {
  check: (item: any) => boolean
  render: (item: any, index: number) => React.ReactNode
}

// Registry of content type renderers
const contentRenderers: ContentRenderer[] = [
  {
    check: (item) => item.type === 'text' && item.text,
    render: (item, index) => (
      <div key={index} className="text-sm text-foreground break-words">
        <MarkdownContent content={item.text} />
      </div>
    )
  },
  {
    check: (item) => item.type === 'tool_use' && item.name,
    render: (item, index) => (
      <ToolUseBlock key={index} name={item.name} input={item.input} />
    )
  },
  {
    check: (item) => item.type === 'tool_result' && item.content,
    render: (item, index) => (
      <ToolResultBlock key={index} content={item.content} />
    )
  },
  {
    check: (item) => item.type === 'thinking' && item.thinking,
    render: (item, index) => (
      <ThinkingBlock key={index} content={item.thinking} />
    )
  },
  {
    check: (item) => item.type === 'image' && item.source,
    render: (item, index) => (
      <ImageBlock key={index} source={item.source} />
    )
  },
]

// Fallback for unknown content types
const unknownContentRenderer = (item: any, index: number) => (
  <div key={index} className="my-2 p-3 bg-yellow-500/10 rounded-md border border-yellow-500/20">
    <div className="flex items-center gap-2">
      <AlertCircle className="h-4 w-4 text-yellow-500" />
      <span className="text-sm font-medium">Unknown content type: {item.type}</span>
    </div>
    <pre className="mt-2 text-xs overflow-x-auto">
      {JSON.stringify(item, null, 2)}
    </pre>
  </div>
)

export function renderContentItem(item: any, index: number): React.ReactNode {
  // Find the appropriate renderer
  const renderer = contentRenderers.find(r => r.check(item))
  
  if (renderer) {
    return renderer.render(item, index)
  }
  
  // Fallback for unknown types
  return unknownContentRenderer(item, index)
}

// Function to register new content types
export function registerContentType(renderer: ContentRenderer) {
  contentRenderers.push(renderer)
}