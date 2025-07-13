import { Terminal, CheckCircle, AlertCircle } from 'lucide-react'

interface CommandMessageProps {
  commandName: string
  commandMessage?: string
  commandArgs?: string
  output?: string
  className?: string
}

export function CommandMessage({ 
  commandName, 
  commandMessage, 
  commandArgs, 
  output,
  className = ''
}: CommandMessageProps) {
  // Extract the command without the slash
  const command = commandName.startsWith('/') ? commandName.slice(1) : commandName
  
  return (
    <div className={`rounded-lg border border-primary/20 bg-primary/5 p-3 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <Terminal className="w-4 h-4 text-primary" />
        <span className="text-sm font-mono text-primary">
          /{command}
          {commandArgs && <span className="text-muted-foreground ml-1">{commandArgs}</span>}
        </span>
      </div>
      
      {commandMessage && (
        <p className="text-sm text-muted-foreground mb-2">{commandMessage}</p>
      )}
      
      {output && (
        <div className="mt-2 p-2 bg-background rounded border border-border">
          <div className="flex items-start gap-2">
            {output.includes('Compacted') ? (
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5" />
            )}
            <p className="text-sm font-mono">{output}</p>
          </div>
        </div>
      )}
    </div>
  )
}