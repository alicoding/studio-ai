// Tool formatter interface for consistent tool display and result formatting
export interface ToolFormatter {
  // Format the tool name and primary parameter for display
  formatDisplay(name: string, input: any): string
  
  // Format the result for display (both collapsed and expanded views)
  formatResult(result: any): string
  
  // Clean/process the result text if needed
  cleanResult?(text: string): string
  
  // Check if this tool should show custom expanded content
  shouldShowCustomExpandedContent?(input: any): boolean
  
  // Check if this tool should show custom result content  
  shouldShowCustomResultContent?(result: any): boolean
  
  // Check if this tool should show the ⎿ connector in collapsed view
  shouldShowResultConnector?(): boolean
}

// Base formatter with default implementations
export abstract class BaseToolFormatter implements ToolFormatter {
  abstract formatDisplay(name: string, input: any): string
  
  formatResult(result: any): string {
    if (typeof result === 'string') {
      return result
    }
    if (typeof result === 'object' && result && 'text' in result) {
      return result.text || ''
    }
    if (typeof result === 'object' && result && 'type' in result && 'text' in result) {
      return result.text || ''
    }
    return ''
  }
  
  cleanResult?(text: string): string {
    return text
  }
  
  shouldShowResultConnector(): boolean {
    return true
  }
}

// Individual tool formatters
class BashFormatter extends BaseToolFormatter {
  formatDisplay(name: string, input: any): string {
    return input?.command ? `${name}(${input.command})` : name
  }
}

class ReadFormatter extends BaseToolFormatter {
  formatDisplay(name: string, input: any): string {
    if (input?.file_path) {
      const fileName = input.file_path.split('/').pop() || input.file_path
      return `${name}(${fileName})`
    }
    return name
  }
  
  formatResult(result: any): string {
    const text = super.formatResult(result)
    if (!text) return ''
    
    // For collapsed view, just show line count
    const lines = text.split('\n').filter(line => line.trim())
    const lineCount = lines.length
    return `Read ${lineCount} lines`
  }
  
  cleanResult(text: string): string {
    // Remove line numbers from Read output
    if (text.includes('→')) {
      const lines = text.split('\n')
      const cleanedLines = lines.map(line => {
        const match = line.match(/^\s*\d+→(.*)$/)
        return match ? match[1] : line
      })
      return cleanedLines.join('\n')
    }
    return text
  }
}

class FilePathFormatter extends BaseToolFormatter {
  formatDisplay(name: string, input: any): string {
    if (input?.file_path) {
      const fileName = input.file_path.split('/').pop() || input.file_path
      return `${name}(${fileName})`
    }
    return name
  }
}

class LSFormatter extends BaseToolFormatter {
  formatDisplay(name: string, input: any): string {
    if (input?.path) {
      const dirName = input.path.split('/').pop() || input.path || '.'
      return `${name}(${dirName})`
    }
    return name
  }
}

class GlobFormatter extends BaseToolFormatter {
  formatDisplay(name: string, input: any): string {
    return input?.pattern ? `${name}(${input.pattern})` : name
  }
}

class GrepFormatter extends BaseToolFormatter {
  formatDisplay(name: string, input: any): string {
    if (input?.pattern) {
      const pattern = input.pattern.length > 30 
        ? input.pattern.substring(0, 30) + '...' 
        : input.pattern
      return `${name}(${pattern})`
    }
    return name
  }
}

class TaskFormatter extends BaseToolFormatter {
  formatDisplay(name: string, input: any): string {
    return input?.description ? `${name}(${input.description})` : name
  }
}

class TodoReadFormatter extends BaseToolFormatter {
  formatDisplay(name: string, _input: any): string {
    // TodoRead doesn't take input parameters
    return name.replace('TodoRead', 'Read Todos')
  }
  
  formatResult(result: any): string {
    // For TodoRead, show the todos in a nice format
    const text = super.formatResult(result)
    if (!text) return 'No todos found'
    
    // Extract JSON from text that may contain additional message
    let jsonText = text
    const jsonMatch = text.match(/\[{.*}\]/s)
    if (jsonMatch) {
      jsonText = jsonMatch[0]
    }
    
    try {
      const todos = JSON.parse(jsonText)
      if (Array.isArray(todos)) {
        if (todos.length === 0) return 'No todos found'
        
        // Show all todos with formatting
        const lines = todos.map((todo, i) => {
          const checkbox = todo.status === 'completed' ? '☒' : '☐'
          const priorityIndicator = todo.priority === 'high' ? '🔴' : 
                                   todo.priority === 'medium' ? '🟡' : ''
          const statusIndicator = todo.status === 'in_progress' ? '▶' : ''
          
          const indicators = [priorityIndicator, statusIndicator].filter(Boolean).join(' ')
          const prefix = indicators ? `${indicators} ` : ''
          
          // Add proper indentation for items after the first one
          const indent = i === 0 ? '' : '     '
          return `${indent}${checkbox} ${prefix}${todo.content}`
        })
        
        return lines.join('\n')
      }
    } catch {
      // If not JSON, return first line or truncated text
      const firstLine = text.split('\n')[0]
      return firstLine.length > 100 ? firstLine.substring(0, 100) + '...' : firstLine
    }
    
    return text
  }
  
  shouldShowCustomResultContent(result: any): boolean {
    if (!result) return false
    
    try {
      const text = typeof result === 'string' ? result : result.text || ''
      // Extract JSON from text that may contain additional message
      const jsonMatch = text.match(/\[{.*}\]/s)
      if (jsonMatch) {
        const todos = JSON.parse(jsonMatch[0])
        return Array.isArray(todos)
      }
      return false
    } catch {
      return false
    }
  }
  
  shouldShowResultConnector(): boolean {
    return false // No connector for TodoRead since it shows a list
  }
}

class TodoWriteFormatter extends BaseToolFormatter {
  formatDisplay(_name: string, input: any): string {
    // Show the number of todos being updated
    if (input?.todos && Array.isArray(input.todos)) {
      const count = input.todos.length
      return `Update Todos (${count} ${count === 1 ? 'item' : 'items'})`
    }
    return 'Update Todos'
  }
  
  formatResult(result: any): string {
    // For collapsed view, we can show a simple success message
    if (result && typeof result === 'string' && result.includes('success')) {
      return '✓ Todos updated successfully'
    }
    return 'Todos updated'
  }
  
  shouldShowCustomExpandedContent(input: any): boolean {
    return !!(input?.todos && Array.isArray(input.todos))
  }
  
  shouldShowCustomResultContent(_result: any): boolean {
    return false // Use default text display
  }
}

class WebFetchFormatter extends BaseToolFormatter {
  formatDisplay(name: string, input: any): string {
    if (input?.url) {
      try {
        const url = new URL(input.url)
        return `${name}(${url.hostname})`
      } catch {
        const urlStr = input.url.length > 30 
          ? input.url.substring(0, 30) + '...' 
          : input.url
        return `${name}(${urlStr})`
      }
    }
    return name
  }
}

class WebSearchFormatter extends BaseToolFormatter {
  formatDisplay(name: string, input: any): string {
    if (input?.query) {
      const query = input.query.length > 30 
        ? input.query.substring(0, 30) + '...' 
        : input.query
      return `${name}(${query})`
    }
    return name
  }
}

class DefaultFormatter extends BaseToolFormatter {
  formatDisplay(name: string, _input: any): string {
    return name
  }
}

// Tool formatter registry
export class ToolFormatterRegistry {
  private static formatters: Map<string, ToolFormatter> = new Map([
    ['Bash', new BashFormatter()],
    ['Read', new ReadFormatter()],
    ['Write', new FilePathFormatter()],
    ['Edit', new FilePathFormatter()],
    ['MultiEdit', new FilePathFormatter()],
    ['LS', new LSFormatter()],
    ['Glob', new GlobFormatter()],
    ['Grep', new GrepFormatter()],
    ['Task', new TaskFormatter()],
    ['TodoWrite', new TodoWriteFormatter()],
    ['TodoRead', new TodoReadFormatter()],
    ['WebFetch', new WebFetchFormatter()],
    ['WebSearch', new WebSearchFormatter()],
  ])
  
  private static defaultFormatter = new DefaultFormatter()
  
  static getFormatter(toolName: string): ToolFormatter {
    return this.formatters.get(toolName) || this.defaultFormatter
  }
  
  static registerFormatter(toolName: string, formatter: ToolFormatter): void {
    this.formatters.set(toolName, formatter)
  }
}