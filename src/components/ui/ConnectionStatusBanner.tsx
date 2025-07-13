/**
 * Connection Status Banner - Shows backend connectivity status
 * 
 * SOLID: Single responsibility - connection status display
 * DRY: Reusable banner for any connection state
 * KISS: Simple status indicator with retry action
 */

import { AlertCircle, Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { useConnectionStatus } from '@/hooks/useConnectionStatus'

export function ConnectionStatusBanner() {
  const { isOnline, isReconnecting, lastConnected, retryAttempts, error, forceReconnect } = useConnectionStatus()

  // Don't show banner when everything is working
  if (isOnline && !isReconnecting) {
    return null
  }

  const getStatusColor = () => {
    if (isReconnecting) return 'bg-yellow-50 border-yellow-200'
    if (!isOnline) return 'bg-red-50 border-red-200'
    return 'bg-gray-50 border-gray-200'
  }

  const getStatusIcon = () => {
    if (isReconnecting) return <RefreshCw className="w-4 h-4 text-yellow-600 animate-spin" />
    if (!isOnline) return <WifiOff className="w-4 h-4 text-red-600" />
    return <Wifi className="w-4 h-4 text-green-600" />
  }

  const getStatusMessage = () => {
    if (isReconnecting) {
      return `Reconnecting to backend server... (attempt ${retryAttempts}/5)`
    }
    if (!isOnline) {
      return 'Backend server is offline. Some features may not work.'
    }
    return 'Connected to backend server'
  }

  const getLastConnectedText = () => {
    if (!lastConnected) return ''
    const timeSince = Math.floor((Date.now() - lastConnected.getTime()) / 1000)
    if (timeSince < 60) return `Last connected ${timeSince}s ago`
    if (timeSince < 3600) return `Last connected ${Math.floor(timeSince / 60)}m ago`
    return `Last connected ${Math.floor(timeSince / 3600)}h ago`
  }

  return (
    <div className={`border-b px-4 py-2 ${getStatusColor()}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900">
              {getStatusMessage()}
            </span>
            {!isOnline && lastConnected && (
              <span className="text-xs text-gray-600">
                {getLastConnectedText()}
              </span>
            )}
            {error && (
              <span className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {error}
              </span>
            )}
          </div>
        </div>

        {!isOnline && !isReconnecting && (
          <button
            onClick={forceReconnect}
            className="flex items-center gap-2 px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        )}
      </div>
    </div>
  )
}