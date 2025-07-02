export interface MessagePart {
  type: 'text' | 'mention' | 'command' | 'code'
  content: string
  value?: string
  language?: string
  code?: string
}

export interface ParsedMessage {
  type: 'composite'
  parts: MessagePart[]
}

export interface SDKMessage {
  role: 'user' | 'assistant'
  content: string
  metadata: {
    mentions: string[]
    commands: string[]
  }
}

export class MessageParser {
  private mentionRegex = /@(\w+)/g
  private commandRegex = /#(\w+)/g
  private codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g

  parse(content: string): ParsedMessage {
    const parts: MessagePart[] = []
    let lastIndex = 0

    // First, find all code blocks
    const codeBlocks: Array<{ start: number; end: number; match: RegExpMatchArray }> = []
    let codeMatch: RegExpMatchArray | null

    const codeRegex = new RegExp(this.codeBlockRegex)
    while ((codeMatch = codeRegex.exec(content)) !== null) {
      if (codeMatch.index !== undefined) {
        codeBlocks.push({
          start: codeMatch.index,
          end: codeMatch.index + codeMatch[0].length,
          match: codeMatch
        })
      }
    }

    // Process the content, avoiding code blocks
    const processSegment = (text: string) => {
      let segmentLastIndex = 0

      // Find all mentions and commands in this segment
      const tokens: Array<{ type: 'mention' | 'command'; start: number; end: number; value: string; content: string }> = []

      const mentionRegex = new RegExp(this.mentionRegex)
      let match: RegExpMatchArray | null
      while ((match = mentionRegex.exec(text)) !== null) {
        if (match.index !== undefined) {
          tokens.push({
            type: 'mention',
            start: match.index,
            end: match.index + match[0].length,
            value: match[1],
            content: match[0]
          })
        }
      }

      const commandRegex = new RegExp(this.commandRegex)
      while ((match = commandRegex.exec(text)) !== null) {
        if (match.index !== undefined) {
          tokens.push({
            type: 'command',
            start: match.index,
            end: match.index + match[0].length,
            value: match[1],
            content: match[0]
          })
        }
      }

      // Sort tokens by position
      tokens.sort((a, b) => a.start - b.start)

      // Build parts from tokens
      for (const token of tokens) {
        if (token.start > segmentLastIndex) {
          parts.push({
            type: 'text',
            content: text.substring(segmentLastIndex, token.start)
          })
        }
        parts.push({
          type: token.type,
          content: token.content,
          value: token.value
        })
        segmentLastIndex = token.end
      }

      // Add remaining text
      if (segmentLastIndex < text.length) {
        parts.push({
          type: 'text',
          content: text.substring(segmentLastIndex)
        })
      }
    }

    // Process content, respecting code blocks
    for (const codeBlock of codeBlocks) {
      // Process text before code block
      if (codeBlock.start > lastIndex) {
        const textBefore = content.substring(lastIndex, codeBlock.start)
        processSegment(textBefore)
      }

      // Add code block
      parts.push({
        type: 'code',
        content: codeBlock.match[0],
        language: codeBlock.match[1] || undefined,
        code: codeBlock.match[2].trim()
      })

      lastIndex = codeBlock.end
    }

    // Process remaining text after last code block
    if (lastIndex < content.length) {
      const remainingText = content.substring(lastIndex)
      processSegment(remainingText)
    }

    // If no parts were added, the entire content is plain text
    if (parts.length === 0) {
      parts.push({
        type: 'text',
        content
      })
    }

    return {
      type: 'composite',
      parts
    }
  }

  formatForSDK(parsed: ParsedMessage): SDKMessage {
    const mentions: string[] = []
    const commands: string[] = []
    let content = ''

    for (const part of parsed.parts) {
      content += part.content
      if (part.type === 'mention' && part.value) {
        mentions.push(part.value)
      } else if (part.type === 'command' && part.value) {
        commands.push(part.value)
      }
    }

    return {
      role: 'user',
      content,
      metadata: {
        mentions,
        commands
      }
    }
  }
}