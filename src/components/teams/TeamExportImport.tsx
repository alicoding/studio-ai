import { useRef } from 'react'
import { TeamTemplate } from '../../types/teams'

interface TeamExportImportProps {
  onImport: (template: TeamTemplate) => void
}

export function TeamExportImport({ onImport }: TeamExportImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string
        const template = JSON.parse(json) as TeamTemplate

        // Validate the imported template
        if (!template.name || !template.agents || !Array.isArray(template.agents)) {
          throw new Error('Invalid team template format')
        }

        // Generate new ID to avoid conflicts
        template.id = `imported-${Date.now()}`
        template.createdAt = new Date().toISOString()

        onImport(template)

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      } catch (error) {
        alert('Failed to import team template. Please check the file format.')
        console.error('Import error:', error)
      }
    }

    reader.readAsText(file)
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <button
        className="px-4 py-2 text-foreground bg-secondary hover:bg-secondary/80 rounded-md transition-colors"
        onClick={handleImportClick}
      >
        Import Team Template
      </button>
    </div>
  )
}
