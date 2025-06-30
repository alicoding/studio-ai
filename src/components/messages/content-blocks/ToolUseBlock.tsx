import { useState } from 'react'
import { ChevronDown, ChevronRight, Terminal } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../ui/collapsible'
import { CodeBlock } from './CodeBlock'

export function ToolUseBlock({ name, input }: { name: string; input: unknown }) {
  const [isOpen, setIsOpen] = useState(false)
  const inputStr = typeof input === 'string' ? input : JSON.stringify(input, null, 2)
  const isLarge = inputStr.length > 200

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="my-2 p-3 bg-secondary/50 rounded-md border border-border">
        <CollapsibleTrigger className="flex items-center gap-2 w-full text-left hover:opacity-80">
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <Terminal className="h-4 w-4 text-blue-500" />
          <span className="font-medium text-sm">Tool: {name}</span>
          {isLarge && !isOpen && (
            <span className="text-xs text-muted-foreground ml-auto">Click to expand</span>
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden">
          <div className="mt-2 overflow-auto max-h-[400px]">
            <CodeBlock code={inputStr} language="json" />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}