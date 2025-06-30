import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CodeBlock } from './CodeBlock'

export function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="text-sm text-foreground space-y-3">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mb-4 mt-6 first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold mb-3 mt-5 first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-bold mb-2 mt-4 first:mt-0">{children}</h3>
          ),

          // Paragraphs
          p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,

          // Lists
          ul: ({ children }) => <ul className="list-disc ml-6 mb-3 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal ml-6 mb-3 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="ml-0">{children}</li>,

          // Code
          code: ({ className, children }) => {
            const match = /language-(\w+)/.exec(className || '')
            const language = match ? match[1] : ''

            // If there's a language class, it's a code block
            if (language) {
              return <CodeBlock code={String(children).replace(/\n$/, '')} language={language} />
            }

            // Otherwise it's inline code
            return (
              <code className="bg-secondary px-1.5 py-0.5 rounded text-sm font-mono inline">
                {children}
              </code>
            )
          },

          // Pre element wrapper for code blocks
          pre: ({ children }) => {
            return <>{children}</>
          },

          // Other elements
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-secondary pl-4 italic my-3">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          strong: ({ children }) => <strong className="font-bold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          hr: () => <hr className="border-t border-border my-4" />,

          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto mb-3">
              <table className="w-full border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead>{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr>{children}</tr>,
          th: ({ children }) => (
            <th className="border border-border px-3 py-2 text-left bg-secondary font-bold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-border px-3 py-2 text-left">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
