import { RefreshCw } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { MarkdownContent } from './MarkdownContent'

interface CompactSummaryBlockProps {
  content: string
  timestamp?: string | Date
}

export function CompactSummaryBlock({ content, timestamp }: CompactSummaryBlockProps) {
  const formattedTime = timestamp ? format(new Date(timestamp), 'PPpp') : null
  const relativeTime = timestamp ? formatDistanceToNow(new Date(timestamp), { addSuffix: true }) : null

  return (
    <div className="px-4 py-2 my-2">
      <div className="bg-muted/30 rounded-md p-4 border border-muted">
        <div className="flex items-center gap-2 mb-3">
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase">
            Session Continued
          </span>
          {relativeTime && (
            <span 
              className="text-xs text-muted-foreground ml-auto cursor-help"
              title={formattedTime || undefined}
            >
              {formattedTime}
            </span>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          <details className="cursor-pointer">
            <summary className="font-medium mb-2 hover:text-foreground transition-colors">
              Previous conversation summary
            </summary>
            <div className="mt-2 pl-4 border-l-2 border-muted">
              <MarkdownContent content={content} />
            </div>
          </details>
        </div>
      </div>
    </div>
  )
}