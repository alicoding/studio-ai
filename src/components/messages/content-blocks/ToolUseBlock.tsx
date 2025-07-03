import { useCallback, memo } from 'react'
import { ChevronDown, ChevronRight, FileText } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../ui/collapsible'
import { CodeBlock } from './CodeBlock'
import { useCollapsibleStore } from '../../../stores/collapsible'
import { ToolFormatterRegistry } from '../../../services/tools/ToolFormatters'
import { renderToolExpandedContent, renderToolResultContent } from './ToolRenderers'


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
  
  // Get the appropriate formatter for this tool
  const formatter = ToolFormatterRegistry.getFormatter(name)

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (blockId) {
        setOpen(blockId, open)
      }
    },
    [blockId, setOpen]
  )

  // Format tool display using the formatter
  const getToolDisplay = () => formatter.formatDisplay(name, input)
  
  // Format result using the formatter
  const getResultText = (result: any): string => {
    return formatter.formatResult(result)
  }
  
  // Clean result if formatter provides a cleaner
  const getCleanedResult = (text: string): string => {
    return formatter.cleanResult ? formatter.cleanResult(text) : text
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
              <div className="ml-6 mt-1">
                <div className={formatter.shouldShowResultConnector?.() !== false ? "flex items-start gap-2" : ""}>
                  {formatter.shouldShowResultConnector?.() !== false && (
                    <span className="text-muted-foreground">⎿</span>
                  )}
                  <div className="text-sm text-muted-foreground space-y-0.5">
                    {(() => {
                      const text = getCleanedResult(getResultText(result)) || '(No content)'
                      const lines = text.split('\n')
                      if (lines.length === 1) {
                        return <span>{text}</span>
                      }
                      return lines.map((line, i) => (
                        <div key={i}>
                          {line}
                        </div>
                      ))
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
          <CollapsibleContent className="overflow-hidden">
            <div className="mt-2 space-y-2">
              {/* Try custom renderer first, fall back to JSON */}
              {(() => {
                if (formatter.shouldShowCustomExpandedContent?.(input)) {
                  const customContent = renderToolExpandedContent({ name, input })
                  if (customContent) return customContent
                }
                // Default JSON view
                return (
                  <div className="overflow-auto max-h-[400px]">
                    <CodeBlock code={inputStr} language="json" />
                  </div>
                )
              })()}
              
              {result !== undefined && (
                <div className="border-t border-border pt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Result</span>
                  </div>
                  <div className="bg-background/50 p-2 rounded">
                    {(() => {
                      if (formatter.shouldShowCustomResultContent?.(result)) {
                        const customContent = renderToolResultContent({ 
                          name, 
                          result, 
                          cleanResult: getCleanedResult 
                        })
                        if (customContent) return customContent
                      }
                      // Default text view
                      return (
                        <pre className="text-sm whitespace-pre-wrap">
                          {getCleanedResult(getResultText(result)) || '(No content)'}
                        </pre>
                      )
                    })()}
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
