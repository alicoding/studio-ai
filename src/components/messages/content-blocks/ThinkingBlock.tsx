export function ThinkingBlock({ content }: { content: string }) {
  // Trim leading and trailing whitespace/newlines
  const trimmedContent = content.trim()
  
  return (
    <div className="my-2">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <span className="text-2xl">✻</span>
        <span className="text-sm italic">Thinking…</span>
      </div>
      <div className="pl-8">
        <div className="text-sm text-muted-foreground italic whitespace-pre-wrap break-words">
          {trimmedContent}
        </div>
      </div>
    </div>
  )
}