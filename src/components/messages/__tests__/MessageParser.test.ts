import { describe, it, expect } from 'vitest'
import { MessageParser } from '../MessageParser'

describe('MessageParser', () => {
  const parser = new MessageParser()

  describe('parse', () => {
    it('should parse plain text', () => {
      const result = parser.parse('Hello world')
      expect(result).toEqual({
        type: 'composite',
        parts: [
          { type: 'text', content: 'Hello world' }
        ]
      })
    })

    it('should parse @mentions', () => {
      const result = parser.parse('Hey @alice, can you help @bob with this?')
      expect(result).toEqual({
        type: 'composite',
        parts: [
          { type: 'text', content: 'Hey ' },
          { type: 'mention', content: '@alice', value: 'alice' },
          { type: 'text', content: ', can you help ' },
          { type: 'mention', content: '@bob', value: 'bob' },
          { type: 'text', content: ' with this?' }
        ]
      })
    })

    it('should parse #commands', () => {
      const result = parser.parse('Use #deploy to deploy and #test to run tests')
      expect(result).toEqual({
        type: 'composite',
        parts: [
          { type: 'text', content: 'Use ' },
          { type: 'command', content: '#deploy', value: 'deploy' },
          { type: 'text', content: ' to deploy and ' },
          { type: 'command', content: '#test', value: 'test' },
          { type: 'text', content: ' to run tests' }
        ]
      })
    })

    it('should parse code blocks', () => {
      const result = parser.parse('Here is code: ```javascript\nconst x = 1;\n```')
      expect(result).toEqual({
        type: 'composite',
        parts: [
          { type: 'text', content: 'Here is code: ' },
          { 
            type: 'code', 
            content: '```javascript\nconst x = 1;\n```',
            language: 'javascript',
            code: 'const x = 1;'
          }
        ]
      })
    })

    it('should parse mixed content', () => {
      const result = parser.parse('Hey @alice, run #test on ```js\ntest();\n```')
      expect(result).toEqual({
        type: 'composite',
        parts: [
          { type: 'text', content: 'Hey ' },
          { type: 'mention', content: '@alice', value: 'alice' },
          { type: 'text', content: ', run ' },
          { type: 'command', content: '#test', value: 'test' },
          { type: 'text', content: ' on ' },
          { 
            type: 'code', 
            content: '```js\ntest();\n```',
            language: 'js',
            code: 'test();'
          }
        ]
      })
    })

    it('should handle multiple code blocks', () => {
      const result = parser.parse('```python\nprint("hi")\n``` and ```\nplain code\n```')
      expect(result.parts).toHaveLength(3)
      expect(result.parts[0].type).toBe('code')
      expect(result.parts[1].type).toBe('text')
      expect(result.parts[2].type).toBe('code')
    })
  })

  describe('formatForSDK', () => {
    it('should format parsed message for Claude SDK', () => {
      const parsed = parser.parse('Hey @alice, please #deploy the app')
      const result = parser.formatForSDK(parsed)
      
      expect(result).toEqual({
        role: 'user',
        content: 'Hey @alice, please #deploy the app',
        metadata: {
          mentions: ['alice'],
          commands: ['deploy']
        }
      })
    })

    it('should handle messages with no special content', () => {
      const parsed = parser.parse('Just a plain message')
      const result = parser.formatForSDK(parsed)
      
      expect(result).toEqual({
        role: 'user',
        content: 'Just a plain message',
        metadata: {
          mentions: [],
          commands: []
        }
      })
    })
  })
})