/**
 * Storage Management Page
 *
 * KISS: Simple page to view all storage
 * DRY: Reuses StorageViewer component
 */

import { createFileRoute } from '@tanstack/react-router'
import { PageLayout } from '../components/ui/page-layout'
import { StorageViewer } from '../components/storage/StorageViewer'
import { Button } from '../components/ui/button'
import { Download, Trash2 } from 'lucide-react'
import { getStorageStats, vacuumStorage, backupStorage, StorageStats } from '../lib/storage/client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

export const Route = createFileRoute('/storage')({
  component: StoragePage,
})

function StoragePage() {
  const [stats, setStats] = useState<StorageStats | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const dbStats = await getStorageStats()
      setStats(dbStats)
    } catch (error) {
      console.error('Failed to load storage stats:', error)
    }
  }

  const handleVacuum = async () => {
    setLoading(true)
    try {
      await vacuumStorage()
      toast.success('Database optimized')
      await loadStats()
    } catch (error) {
      console.error('Failed to vacuum database:', error)
      toast.error('Failed to optimize database')
    } finally {
      setLoading(false)
    }
  }

  const handleBackup = async () => {
    setLoading(true)
    try {
      const backupPath = await backupStorage()
      toast.success(`Database backed up to ${backupPath}`)
    } catch (error) {
      console.error('Failed to backup database:', error)
      toast.error('Failed to backup database')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageLayout
      title="Storage Management"
      description="View and manage all data stored in the unified storage system"
    >
      {/* Stats Bar */}
      {stats && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Total Records</div>
            <div className="text-2xl font-bold">{stats.totalItems}</div>
          </div>
          <div className="bg-card rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Total Size</div>
            <div className="text-2xl font-bold">
              {(stats.totalSize / 1024 / 1024).toFixed(2)} MB
            </div>
          </div>
          <div className="bg-card rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Namespaces</div>
            <div className="text-2xl font-bold">{Object.keys(stats.namespaces).length}</div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mb-6 flex gap-2">
        <Button variant="outline" onClick={handleBackup} disabled={loading}>
          <Download className="h-4 w-4 mr-2" />
          Backup Database
        </Button>
        <Button variant="outline" onClick={handleVacuum} disabled={loading}>
          <Trash2 className="h-4 w-4 mr-2" />
          Optimize Storage
        </Button>
      </div>

      {/* Storage Viewer */}
      <StorageViewer />
    </PageLayout>
  )
}
