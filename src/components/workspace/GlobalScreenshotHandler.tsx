import { useEffect, useState } from 'react'
import { ScreenshotService } from '../../services/ScreenshotService'
import { ComponentInspectorModal } from '../modals/ComponentInspectorModal'
import { Button } from '../ui/button'
import { Search, Crosshair } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useProjectStore } from '../../stores'
import { useGlobalShortcuts } from '../../hooks/useShortcuts'
import { toast } from 'sonner'

export function GlobalScreenshotHandler() {
  const [isCapturing, setIsCapturing] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [capturedInfo, setCapturedInfo] = useState('')
  const { activeProjectId } = useProjectStore()
  
  const startCapture = () => {
    const service = ScreenshotService.getInstance()
    service.startCapture()
    setIsCapturing(true)
  }

  // Set up global shortcuts
  const { getShortcut } = useGlobalShortcuts({
    'component-inspector': startCapture
  })
  
  useEffect(() => {
    // Initialize the service and set up callback
    const service = ScreenshotService.getInstance()
    
    service.setOnCaptureCallback((info) => {
      setCapturedInfo(info)
      setShowModal(true)
      setIsCapturing(false)
    })
    
    return () => {
      // Cleanup if needed
    }
  }, [])
  
  const handleSendToAgent = async (agentId: string) => {
    if (!activeProjectId) {
      toast.error('No active project')
      return
    }
    
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: capturedInfo,
          projectId: activeProjectId,
          agentId: agentId,
          role: 'user'
        })
      })
      toast.success('Component info sent to agent!')
    } catch (error) {
      console.error('Failed to send to agent:', error)
      toast.error('Failed to send component info')
    }
  }
  
  // Floating action button for manual trigger
  return (
    <>
      <div className="fixed bottom-24 right-6 z-[60]">
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "rounded-full shadow-lg hover:shadow-xl transition-all",
            "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
            isCapturing && "ring-2 ring-primary"
          )}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            startCapture()
          }}
          title={`Inspect components (${getShortcut('component-inspector') || 'Cmd+Shift+I'})`}
        >
          {isCapturing ? (
            <Crosshair className="h-4 w-4 animate-pulse" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
        
        {/* Tooltip on hover */}
        <div className="absolute bottom-full right-0 mb-2 opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
          <div className="bg-popover text-popover-foreground text-xs rounded-md px-2 py-1 shadow-md whitespace-nowrap">
            Component Inspector
            <div className="text-muted-foreground">{getShortcut('component-inspector') || 'Cmd+Shift+I'}</div>
          </div>
        </div>
      </div>
      
      <ComponentInspectorModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        componentInfo={capturedInfo}
        onSend={handleSendToAgent}
      />
    </>
  )
}