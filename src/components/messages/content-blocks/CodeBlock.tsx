import { useState, useCallback } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check } from 'lucide-react'
import { Button } from '../../ui/button'

function detectLanguage(code: string): string {
  // Simple language detection based on content
  if (code.includes('function') || code.includes('const ') || code.includes('let ')) return 'javascript'
  if (code.includes('def ') || code.includes('import ') || code.includes('print(')) return 'python'
  if (code.includes('interface ') || code.includes('type ') || code.includes(': string')) return 'typescript'
  if (code.includes('<div') || code.includes('<span') || code.includes('</')) return 'html'
  if (code.includes('{') && code.includes('}') && code.includes(':')) return 'json'
  if (code.includes('SELECT') || code.includes('FROM') || code.includes('WHERE')) return 'sql'
  return 'text'
}

export function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false)
  const detectedLang = language || detectLanguage(code)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [code])

  return (
    <div className="relative group my-2">
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCopy}
          className="h-7 px-2"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>
      <SyntaxHighlighter
        language={detectedLang}
        style={oneDark}
        className="rounded-md !bg-secondary"
        customStyle={{
          margin: 0,
          fontSize: '0.875rem',
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}