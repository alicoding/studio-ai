import { useCallback, memo } from 'react'
import { ChevronDown, ChevronRight, FileJson } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../ui/collapsible'
import { CodeBlock } from './CodeBlock'
import { useCollapsibleStore } from '../../../stores/collapsible'

function ToolResultBlockComponent({
  content,
  blockId,
}: {
  content: string | object
  blockId?: string
}) {
  const { getOpen, setOpen } = useCollapsibleStore()
  const isOpen = getOpen(blockId || 'default', true) // Default to open for tool results
  const contentStr = typeof content === 'string' ? content : JSON.stringify(content, null, 2)
  const isLarge = contentStr.length > 500

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (blockId) {
        setOpen(blockId, open)
      }
    },
    [blockId, setOpen]
  )

  return (
    <Collapsible open={isOpen} onOpenChange={handleOpenChange}>
      <div className="my-2 p-3 bg-green-500/10 rounded-md border border-green-500/20">
        <CollapsibleTrigger className="flex items-center gap-2 w-full text-left hover:opacity-80 cursor-pointer">
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <FileJson className="h-4 w-4 text-green-500" />
          <span className="font-medium text-sm text-green-700 dark:text-green-400">
            Tool Result
          </span>
          {isLarge && !isOpen && (
            <span className="text-xs text-muted-foreground ml-auto">Click to expand</span>
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden">
          <div className="mt-2 overflow-auto max-h-[400px]">
            {typeof content === 'string' ? (
              <pre className="text-sm whitespace-pre-wrap break-words">{content}</pre>
            ) : (
              <CodeBlock code={contentStr} language="json" />
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

export const ToolResultBlock = memo(ToolResultBlockComponent)
