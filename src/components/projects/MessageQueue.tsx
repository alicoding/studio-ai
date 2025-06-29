interface QueueItem {
  id: string
  target: string
  message: string
}

interface MessageQueueProps {
  items: QueueItem[]
  onClear: () => void
}

export function MessageQueue({ items, onClear }: MessageQueueProps) {
  return (
    <div className="bg-card border-t border-border">
      <div className="flex items-center justify-between px-4 py-2 bg-secondary/50">
        <span className="text-sm font-medium">Message Queue ({items.length})</span>
        <button
          className="text-xs text-muted-foreground hover:text-foreground hover:bg-secondary px-2 py-1 rounded transition-colors"
          onClick={onClear}
        >
          Clear All
        </button>
      </div>
      <div className="px-4 py-2 max-h-32 overflow-y-auto">
        {items.map((item) => (
          <div key={item.id} className="flex gap-2 py-1 text-sm">
            <span className="text-primary font-medium">@{item.target}</span>
            <span className="text-foreground">{item.message}</span>
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-muted-foreground text-sm text-center py-2">No messages in queue</div>
        )}
      </div>
    </div>
  )
}
