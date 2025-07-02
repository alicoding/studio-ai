import { useCallback, memo } from 'react'
import { ChevronDown, ChevronRight, FileText } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../ui/collapsible'
import { CodeBlock } from './CodeBlock'
import { useCollapsibleStore } from '../../../stores/collapsible'

interface BashInput {
  command: string
}

interface ToolUseBlockProps {
  name: string
  input: unknown
  blockId?: string
  toolUseId?: string
  result?: string | undefined
}

function ToolUseBlockComponent({ name, input, blockId, result }: ToolUseBlockProps) {
  const { getOpen, setOpen } = useCollapsibleStore()
  const isOpen = getOpen(blockId || 'default', false) // Default to closed for tool use
  const inputStr = typeof input === 'string' ? input : JSON.stringify(input, null, 2)
  const isLarge = inputStr.length > 200

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (blockId) {
        setOpen(blockId, open)
      }
    },
    [blockId, setOpen]
  )

  // Type guard for BashInput
  const isBashInput = (value: unknown): value is BashInput => {
    return (
      typeof value === 'object' &&
      value !== null &&
      'command' in value &&
      typeof (value as BashInput).command === 'string'
    )
  }

  // Format tool display like CLI: ⏺ Bash(command) ⎿ result
  const getToolDisplay = () => {
    if (name === 'Bash' && isBashInput(input)) {
      return `${name}(${input.command})`
    }
    return name
  }

  return (
    <div className="my-2">
      <Collapsible open={isOpen} onOpenChange={handleOpenChange}>
        <div className="p-3 bg-secondary/50 rounded-md border border-border">
          <div>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left hover:opacity-80 cursor-pointer">
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <span className="text-blue-500">⏺</span>
              <span className="font-medium text-sm">{getToolDisplay()}</span>
              {isLarge && !isOpen && (
                <span className="text-xs text-muted-foreground ml-auto">Click to expand</span>
              )}
            </CollapsibleTrigger>
            {result !== undefined && !isOpen && (
              <div className="ml-6 mt-1 flex items-start gap-2">
                <span className="text-muted-foreground">⎿</span>
                <span className="text-sm text-muted-foreground">{result || '(No content)'}</span>
              </div>
            )}
          </div>
          <CollapsibleContent className="overflow-hidden">
            <div className="mt-2 space-y-2">
              <div className="overflow-auto max-h-[400px]">
                <CodeBlock code={inputStr} language="json" />
              </div>
              {result !== undefined && (
                <div className="border-t border-border pt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Result</span>
                  </div>
                  <div className="bg-background/50 p-2 rounded">
                    <pre className="text-sm whitespace-pre-wrap">{result || '(No content)'}</pre>
                  </div>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  )
}

export const ToolUseBlock = memo(ToolUseBlockComponent)
