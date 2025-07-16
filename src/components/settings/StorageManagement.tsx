/**
 * StorageManagement - Settings panel for managing persisted data
 *
 * KISS: Simple UI for storage operations
 * SOLID: Single responsibility - manage storage
 * Library-First: Uses existing UI components
 */

import { useState, useEffect } from 'react'
import { Trash2, Download, Upload, HardDriveDownload } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { clearAllStores, exportAllStores, importStores } from '../../stores/createPersistentStore'
import { getStorageStats } from '../../lib/storage/client'
import { toast } from 'sonner'

export function StorageManagement() {
  const [showConfirmClear, setShowConfirmClear] = useState(false)
  const [storageSize, setStorageSize] = useState<string>('0 KB')

  useEffect(() => {
    loadStorageStats()
  }, [])

  const loadStorageStats = async () => {
    try {
      const stats = await getStorageStats()
      const sizeInKB = (stats.totalSize / 1024).toFixed(2)
      setStorageSize(`${sizeInKB} KB`)
    } catch (error) {
      console.error('Failed to load storage stats:', error)
    }
  }

  const handleClearStorage = async () => {
    if (!showConfirmClear) {
      setShowConfirmClear(true)
      return
    }

    await clearAllStores()
    toast.success('All stored data cleared. Refreshing...')
    setTimeout(() => window.location.reload(), 1000)
  }

  const handleExportData = async () => {
    try {
      const data = await exportAllStores()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `studio-ai-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Data exported successfully')
    } catch (error) {
      toast.error('Failed to export data')
      console.error(error)
    }
  }

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        importStores(data)
        toast.success('Data imported successfully. Refreshing...')
      } catch (error) {
        toast.error('Failed to import data. Invalid file format.')
        console.error(error)
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Storage Management</CardTitle>
          <CardDescription>Manage your locally stored data and preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Storage Info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <HardDriveDownload className="h-4 w-4" />
            <span>Current storage usage: {storageSize}</span>
          </div>

          {/* Export/Import */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportData}>
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('import-file')?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Import Data
            </Button>
            <input
              id="import-file"
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportData}
            />
          </div>

          {/* Clear Storage */}
          <div className="pt-4 border-t">
            {showConfirmClear ? (
              <Card className="border-destructive">
                <CardContent className="pt-4 space-y-2">
                  <p className="font-medium">Are you sure you want to clear all stored data?</p>
                  <p className="text-sm text-muted-foreground">
                    This will reset all preferences, agent configurations, and UI states.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="destructive" onClick={handleClearStorage}>
                      Yes, Clear All Data
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowConfirmClear(false)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive"
                onClick={handleClearStorage}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All Data
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Storage Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Persisted Data</CardTitle>
          <CardDescription className="text-xs">
            The following data is saved locally in your browser
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• Agent configurations and selections</li>
            <li>• Project preferences and active states</li>
            <li>• UI layout preferences (sidebar, view modes)</li>
            <li>• Workspace collapsible states</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
