/**
 * Code parser to extract functions and classes
 * 
 * SOLID: Single responsibility - code parsing only
 * KISS: Simple regex-based parsing
 * DRY: Reusable parsing patterns
 */

export interface CodeFunction {
  name: string
  code: string
  line: number
}

export class CodeParser {
  private patterns = [
    // Functions: function name() {}, async function name() {}
    /(?:export\s+)?(?:async\s+)?function\s+(\w+)/,
    // Arrow functions: const name = () => {}, const name = async () => {}
    /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*(?:=>|{)/,
    // Classes: class Name {}, export class Name {}
    /(?:export\s+)?class\s+(\w+)/,
    // Object methods: name: function() {}, name() {}
    /(\w+)\s*:\s*(?:async\s*)?\([^)]*\)\s*(?:=>|{)/
  ]

  /**
   * Extract functions and classes from code
   */
  extractFunctions(content: string, filePath: string): CodeFunction[] {
    const functions: CodeFunction[] = []
    const lines = content.split('\n')
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      for (const pattern of this.patterns) {
        const match = pattern.exec(line)
        if (match) {
          const name = match[1]
          
          // Get context: current line + next 4 lines
          const contextLines = lines.slice(i, Math.min(i + 5, lines.length))
          const code = `${name} in ${filePath}\n${contextLines.join('\n')}`
          
          functions.push({
            name,
            code,
            line: i + 1
          })
          
          break // Only match first pattern per line
        }
      }
    }
    
    return functions
  }
}