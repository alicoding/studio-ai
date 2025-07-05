import { useState, useEffect, useCallback } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Separator } from '../ui/separator'
import { Keyboard, RotateCcw, Save } from 'lucide-react'
import { toast } from 'sonner'
import { useShortcutsStore, type KeyboardShortcut } from '../../stores/shortcuts'

interface KeyRecorderProps {
  isRecording: boolean
  currentKeys: string
  onRecord: (keys: string) => void
  onCancel: () => void
}

function KeyRecorder({ isRecording, currentKeys, onRecord, onCancel }: KeyRecorderProps) {
  const [recordedKeys, setRecordedKeys] = useState<string[]>([])

  const formatKeys = useCallback((keys: string[]): string => {
    if (keys.length === 0) return ''
    
    // Sort modifier keys first
    const modifierOrder = ['Meta', 'Control', 'Alt', 'Shift']
    const modifiers = keys.filter(key => modifierOrder.includes(key))
    const nonModifiers = keys.filter(key => !modifierOrder.includes(key))
    
    // Sort modifiers by our preferred order
    modifiers.sort((a, b) => modifierOrder.indexOf(a) - modifierOrder.indexOf(b))
    
    // Replace Meta with Cmd for better UX
    const formattedModifiers = modifiers.map(key => key === 'Meta' ? 'Cmd' : key)
    
    return [...formattedModifiers, ...nonModifiers].join('+')
  }, [])

  useEffect(() => {
    if (!isRecording) {
      setRecordedKeys([])
      return
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const keys = new Set<string>()
      
      // Add modifiers
      if (e.metaKey) keys.add('Meta')
      if (e.ctrlKey) keys.add('Control')
      if (e.altKey) keys.add('Alt')
      if (e.shiftKey) keys.add('Shift')
      
      // Add the main key (not a modifier)
      if (!['Meta', 'Control', 'Alt', 'Shift'].includes(e.key)) {
        // Convert special keys to readable format
        let mainKey = e.key
        if (mainKey === ' ') mainKey = 'Space'
        if (mainKey === 'Enter') mainKey = 'Enter'
        if (mainKey === 'Tab') mainKey = 'Tab'
        if (mainKey === 'Backspace') mainKey = 'Backspace'
        if (mainKey === 'Delete') mainKey = 'Delete'
        if (mainKey.startsWith('Arrow')) mainKey = mainKey.replace('Arrow', '')
        
        keys.add(mainKey)
      }

      const keyArray = Array.from(keys)
      setRecordedKeys(keyArray)

      // Auto-complete recording if we have a non-modifier key
      if (keyArray.some(key => !['Meta', 'Control', 'Alt', 'Shift'].includes(key))) {
        const formatted = formatKeys(keyArray)
        setTimeout(() => {
          onRecord(formatted)
        }, 100)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }

    // Capture at the document level with high priority
    document.addEventListener('keydown', handleKeyDown, { capture: true })
    document.addEventListener('keyup', handleKeyUp, { capture: true })

    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true })
      document.removeEventListener('keyup', handleKeyUp, { capture: true })
    }
  }, [isRecording, onRecord, formatKeys])

  if (!isRecording) {
    return (
      <Badge variant="outline" className="min-w-[120px] justify-center">
        {currentKeys || 'Not set'}
      </Badge>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant="default" className="min-w-[120px] justify-center animate-pulse">
        {recordedKeys.length > 0 ? formatKeys(recordedKeys) : 'Press keys...'}
      </Badge>
      <Button size="sm" variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  )
}

export function KeyboardShortcutsTab() {
  const { shortcuts, updateShortcut, resetShortcut, resetAllShortcuts } = useShortcutsStore()
  const [recordingId, setRecordingId] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  const handleRecord = (shortcutId: string, newKeys: string) => {
    updateShortcut(shortcutId, newKeys)
    setRecordingId(null)
    setHasChanges(true)
    toast.success(`Shortcut updated: ${newKeys}`)
  }

  const handleReset = (shortcutId: string) => {
    resetShortcut(shortcutId)
    setHasChanges(true)
    toast.success('Shortcut reset to default')
  }

  const handleResetAll = () => {
    resetAllShortcuts()
    setHasChanges(true)
    toast.success('All shortcuts reset to defaults')
  }

  const handleSave = () => {
    // Changes are already persisted automatically by Zustand
    setHasChanges(false)
    toast.success('Keyboard shortcuts saved!')
  }

  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = []
    }
    acc[shortcut.category].push(shortcut)
    return acc
  }, {} as Record<string, KeyboardShortcut[]>)

  const categoryNames = {
    global: 'Global Shortcuts',
    workspace: 'Workspace Shortcuts', 
    modal: 'Modal Shortcuts'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Keyboard Shortcuts</h2>
          <p className="text-muted-foreground">
            Customize keyboard shortcuts to match your workflow
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleResetAll}
            disabled={recordingId !== null}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset All
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!hasChanges || recordingId !== null}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Keyboard className="w-5 h-5" />
              {categoryNames[category as keyof typeof categoryNames]}
            </CardTitle>
            <CardDescription>
              {category === 'global' && 'Shortcuts that work everywhere in the application'}
              {category === 'workspace' && 'Shortcuts that work in the project workspace'}
              {category === 'modal' && 'Shortcuts that work in modals and dialogs'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {categoryShortcuts.map((shortcut, index) => (
              <div key={shortcut.id}>
                <div className="flex items-center justify-between py-3">
                  <div className="flex-1">
                    <div className="font-medium">{shortcut.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {shortcut.description}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <KeyRecorder
                      isRecording={recordingId === shortcut.id}
                      currentKeys={shortcut.currentKeys}
                      onRecord={(keys) => handleRecord(shortcut.id, keys)}
                      onCancel={() => setRecordingId(null)}
                    />
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRecordingId(shortcut.id)}
                        disabled={recordingId !== null && recordingId !== shortcut.id}
                      >
                        {recordingId === shortcut.id ? 'Recording...' : 'Record'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleReset(shortcut.id)}
                        disabled={recordingId !== null || shortcut.currentKeys === shortcut.defaultKeys}
                      >
                        Reset
                      </Button>
                    </div>
                  </div>
                </div>
                {index < categoryShortcuts.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground">
            <p className="mb-2">
              <strong>Tips for recording shortcuts:</strong>
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Click "Record" and press your desired key combination</li>
              <li>Use Cmd (⌘) on Mac or Ctrl on Windows/Linux for modifiers</li>
              <li>Combine modifiers with letters, numbers, or special keys</li>
              <li>Press Escape or click Cancel to stop recording without saving</li>
              <li>Avoid conflicts with system shortcuts (like Cmd+Tab)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}