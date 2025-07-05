/**
 * Storage Viewer - UI to inspect all stored data
 * 
 * SOLID: Single responsibility - view storage
 * DRY: Reusable for any storage namespace
 * KISS: Simple table view with search
 * Library-First: Using TanStack Table
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState
} from '@tanstack/react-table'
import { Search, Database, RefreshCw, Trash2, Key, Eye, EyeOff } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import type { StorageItem } from '../../lib/storage/types'
import { getStorageNamespaces } from '../../lib/storage/client'
import { cn } from '../../lib/utils'
import { toast } from 'sonner'
import ky from 'ky'

interface StorageViewerProps {
  namespace?: string
  className?: string
}

const columnHelper = createColumnHelper<StorageItem>()

export function StorageViewer({ namespace, className }: StorageViewerProps) {
  const [data, setData] = useState<StorageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [selectedNamespace, setSelectedNamespace] = useState(namespace || 'all')
  const [namespaces, setNamespaces] = useState<string[]>([])
  const [showEncrypted, setShowEncrypted] = useState(false)

  // Load data from API
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // Get all namespaces
      const allNamespaces = await getStorageNamespaces()
      setNamespaces(['all', ...allNamespaces])
      
      // Get storage items
      const searchParams: Record<string, string> = {}
      if (selectedNamespace !== 'all') {
        searchParams.namespace = selectedNamespace
      }
      if (globalFilter) {
        searchParams.search = globalFilter
      }
      
      const items = await ky.get('/api/storage/items', {
        searchParams
      }).json<StorageItem[]>()
      
      setData(items)
    } catch (error) {
      console.error('Failed to load storage data:', error)
      toast.error('Failed to load storage data')
    } finally {
      setLoading(false)
    }
  }, [selectedNamespace, globalFilter])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleDelete = async (item: StorageItem) => {
    if (!confirm(`Delete ${item.namespace}/${item.key}?`)) return
    
    try {
      await ky.delete(`/api/storage/item/${item.namespace}/${item.key}`)
      toast.success('Item deleted')
      loadData()
    } catch (error) {
      console.error('Failed to delete item:', error)
      toast.error('Failed to delete item')
    }
  }

  // Define columns
  const columns = useMemo(
    () => [
      columnHelper.accessor('namespace', {
        header: 'Namespace',
        cell: info => <Badge variant="outline">{info.getValue()}</Badge>,
        size: 120
      }),
      columnHelper.accessor('key', {
        header: 'Key',
        cell: info => (
          <code className="text-sm bg-muted px-1 py-0.5 rounded">
            {info.getValue()}
          </code>
        )
      }),
      columnHelper.accessor('type', {
        header: 'Type',
        cell: info => {
          const type = info.getValue()
          const variant = type === 'secret' ? 'destructive' : 
                         type === 'cache' ? 'secondary' : 
                         'default'
          return <Badge variant={variant}>{type}</Badge>
        },
        size: 100
      }),
      columnHelper.accessor('value', {
        header: 'Value',
        cell: info => {
          const value = info.getValue()
          const isEncrypted = typeof value === 'string' && value.startsWith('<')
          
          if (isEncrypted) {
            return (
              <div className="flex items-center gap-2">
                <Key className="h-3 w-3" />
                <span className="text-muted-foreground text-sm">{value}</span>
              </div>
            )
          }
          
          return (
            <pre className="text-xs max-w-md overflow-hidden text-ellipsis">
              {JSON.stringify(value, null, 2)}
            </pre>
          )
        }
      }),
      columnHelper.accessor('updatedAt', {
        header: 'Updated',
        cell: info => new Date(info.getValue()).toLocaleString(),
        size: 180
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(row.original)}
              className="h-8 w-8"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
        size: 80
      })
    ],
    [showEncrypted, handleDelete]
  )

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  })

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Storage Viewer</h2>
          <Badge variant="secondary">
            {data.length} items
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowEncrypted(!showEncrypted)}
            title={showEncrypted ? "Hide encrypted values" : "Show encrypted values"}
          >
            {showEncrypted ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 flex-1">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search all columns..."
            value={globalFilter ?? ''}
            onChange={e => setGlobalFilter(e.target.value)}
            className="max-w-sm"
          />
        </div>
        
        <Select value={selectedNamespace} onValueChange={setSelectedNamespace}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select namespace" />
          </SelectTrigger>
          <SelectContent>
            {namespaces.map(ns => (
              <SelectItem key={ns} value={ns}>
                {ns === 'all' ? 'All Namespaces' : ns}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="border-b">
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className="h-10 px-2 text-left align-middle font-medium text-muted-foreground"
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map(row => (
                <tr
                  key={row.id}
                  className="border-b transition-colors hover:bg-muted/50"
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="p-2 align-middle">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {loading ? 'Loading...' : 'No data found'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of{' '}
          {table.getPageCount()}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}