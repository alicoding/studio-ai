import { AlertCircle } from 'lucide-react'
import { ThinkingBlock } from './ThinkingBlock'
import { ImageBlock } from './ImageBlock'
import { ToolUseBlock } from './ToolUseBlock'
import { MarkdownContent } from './MarkdownContent'

interface BaseContentItem {
  type: string
  id?: string
}

interface TextContentItem extends BaseContentItem {
  type: 'text'
  text: string
}

interface ToolUseContentItem extends BaseContentItem {
  type: 'tool_use'
  name: string
  input: unknown
  result?: string
}

interface ToolResultContentItem extends BaseContentItem {
  type: 'tool_result'
  tool_use_id: string
  content: string
}

interface ThinkingContentItem extends BaseContentItem {
  type: 'thinking'
  thinking: string
}

interface ImageContentItem extends BaseContentItem {
  type: 'image'
  source: {
    type: string
    data?: string
    media_type?: string
  }
}

export type ContentItem =
  | TextContentItem
  | ToolUseContentItem
  | ToolResultContentItem
  | ThinkingContentItem
  | ImageContentItem
  | BaseContentItem

interface ContentRenderer {
  check: (item: ContentItem) => boolean
  render: (item: ContentItem, index: number, messageId?: string) => React.ReactNode
}

// Generate stable key for content items - use existing IDs
const getContentKey = (item: ContentItem, index: number, messageId?: string) => {
  // For tool_result, try to use the tool_use_id if available
  if (isToolResultContent(item) && item.tool_use_id) {
    return `${item.tool_use_id}-result`
  }

  // Use item.id if available (tool_use items have these)
  if (item.id) {
    return item.id
  }

  // Fallback to messageId + type + index for content without IDs
  const prefix = messageId ? `${messageId}-` : ''
  return `${prefix}${item.type}-${index}`
}

// Type guards
function isTextContent(item: ContentItem): item is TextContentItem {
  return item.type === 'text' && 'text' in item
}

function isToolUseContent(item: ContentItem): item is ToolUseContentItem {
  return item.type === 'tool_use' && 'name' in item
}

function isToolResultContent(item: ContentItem): item is ToolResultContentItem {
  return item.type === 'tool_result' && 'content' in item
}

function isThinkingContent(item: ContentItem): item is ThinkingContentItem {
  return item.type === 'thinking' && 'thinking' in item
}

function isImageContent(item: ContentItem): item is ImageContentItem {
  return item.type === 'image' && 'source' in item
}

// Registry of content type renderers
const contentRenderers: ContentRenderer[] = [
  {
    check: isTextContent,
    render: (item, index, messageId) => {
      const textItem = item as TextContentItem
      return (
        <div
          key={getContentKey(item, index, messageId)}
          className="text-sm text-foreground break-words"
        >
          <MarkdownContent content={textItem.text} />
        </div>
      )
    },
  },
  {
    check: isToolUseContent,
    render: (item, index, messageId) => {
      const toolItem = item as ToolUseContentItem
      const key = getContentKey(item, index, messageId)
      return (
        <ToolUseBlock
          key={key}
          blockId={key}
          name={toolItem.name}
          input={toolItem.input}
          toolUseId={toolItem.id}
          result={toolItem.result}
        />
      )
    },
  },
  {
    check: isToolResultContent,
    render: (_item, _index, _messageId) => {
      // Tool results are now displayed within tool use blocks, so hide standalone ones
      return null
    },
  },
  {
    check: isThinkingContent,
    render: (item, index, messageId) => {
      const thinkingItem = item as ThinkingContentItem
      return (
        <ThinkingBlock
          key={getContentKey(item, index, messageId)}
          content={thinkingItem.thinking}
        />
      )
    },
  },
  {
    check: isImageContent,
    render: (item, index, messageId) => {
      const imageItem = item as ImageContentItem
      return <ImageBlock key={getContentKey(item, index, messageId)} source={imageItem.source} />
    },
  },
]

// Fallback for unknown content types
const unknownContentRenderer = (item: ContentItem, index: number, messageId?: string) => (
  <div
    key={getContentKey(item, index, messageId)}
    className="my-2 p-3 bg-yellow-500/10 rounded-md border border-yellow-500/20"
  >
    <div className="flex items-center gap-2">
      <AlertCircle className="h-4 w-4 text-yellow-500" />
      <span className="text-sm font-medium">Unknown content type: {item.type}</span>
    </div>
    <pre className="mt-2 text-xs overflow-x-auto">{JSON.stringify(item, null, 2)}</pre>
  </div>
)

export function renderContentItem(
  item: ContentItem,
  index: number,
  messageId?: string
): React.ReactNode {
  // Find the appropriate renderer
  const renderer = contentRenderers.find((r) => r.check(item))

  if (renderer) {
    return renderer.render(item, index, messageId)
  }

  // Fallback for unknown types
  return unknownContentRenderer(item, index, messageId)
}

// Function to register new content types
export function registerContentType(renderer: ContentRenderer) {
  contentRenderers.push(renderer)
}
