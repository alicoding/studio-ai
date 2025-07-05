import { FileText, Settings, HelpCircle } from 'lucide-react'

interface Command {
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  usage?: string
}

const SLASH_COMMANDS: Command[] = [
  {
    name: '/compact',
    description: 'Compact conversation history but keep summary',
    icon: FileText,
    usage: '/compact [optional instructions]'
  },
  {
    name: '/config',
    description: 'Open configuration panel',
    icon: Settings,
    usage: '/config'
  },
  {
    name: '/help',
    description: 'Show available commands and help',
    icon: HelpCircle,
    usage: '/help'
  }
]

// Hash commands are deprecated - we use MCP instead
const HASH_COMMANDS: Command[] = []

interface CommandSuggestionsProps {
  filter: string
  onSelect: (command: string) => void
  type: 'slash' | 'hash'
}

export function CommandSuggestions({ filter, onSelect, type }: CommandSuggestionsProps) {
  const commands = type === 'slash' ? SLASH_COMMANDS : HASH_COMMANDS
  const filtered = commands.filter(cmd => 
    cmd.name.toLowerCase().includes(filter.toLowerCase())
  )

  if (filtered.length === 0) return null

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-popover border border-border rounded-md shadow-lg max-h-64 overflow-y-auto">
      {filtered.map((command) => {
        const Icon = command.icon
        return (
          <div
            key={command.name}
            className="flex items-start gap-3 px-3 py-2 hover:bg-secondary cursor-pointer transition-colors"
            onClick={() => onSelect(command.usage || command.name)}
          >
            <Icon className="w-4 h-4 mt-0.5 text-muted-foreground" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-medium">{command.name}</span>
              </div>
              <p className="text-xs text-muted-foreground">{command.description}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}