import { useState, useRef } from 'react'
import { Terminal } from '../../terminal/Terminal'
import { Camera, Square, Circle, ArrowBigUp, Type, Download, X } from 'lucide-react'

interface Annotation {
  type: 'rectangle' | 'circle' | 'arrow' | 'text'
  x: number
  y: number
  color: string
  id: number
}

interface DevelopViewProps {
  onTerminalInput: (command: string) => void
}

export function DevelopView({ onTerminalInput }: DevelopViewProps) {
  const [isTerminalCollapsed, setIsTerminalCollapsed] = useState(false)
  const [serverUrl, setServerUrl] = useState('http://localhost:3000')
  const [serverStatus, setServerStatus] = useState<'offline' | 'connecting' | 'online'>('offline')
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [isAnnotating, setIsAnnotating] = useState(false)
  const [annotationTool, setAnnotationTool] = useState<'rectangle' | 'circle' | 'arrow' | 'text'>(
    'rectangle'
  )
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const previewRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const connectToServer = () => {
    setServerStatus('connecting')
    // In real implementation, this would check if server is running
    setTimeout(() => {
      setServerStatus('online')
    }, 1500)
  }

  const refreshPreview = () => {
    const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement
    if (iframe && serverStatus === 'online') {
      iframe.src = iframe.src
    }
  }

  const openPreviewInTab = () => {
    if (serverStatus === 'online') {
      window.open(serverUrl, '_blank')
    }
  }

  const takeScreenshot = async () => {
    if (!previewRef.current || serverStatus !== 'online') return

    setIsAnnotating(true)
    setAnnotations([])

    // In a real implementation, this would capture the iframe content
    // For now, we'll show the annotation overlay
  }

  const saveScreenshot = async () => {
    if (!canvasRef.current) return

    // Convert canvas to blob and download
    canvasRef.current.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `screenshot-${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(url)
    })

    setIsAnnotating(false)
    setAnnotations([])
  }

  const cancelAnnotation = () => {
    setIsAnnotating(false)
    setAnnotations([])
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isAnnotating || !canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Add annotation based on selected tool
    const newAnnotation = {
      type: annotationTool,
      x,
      y,
      color: '#ff0000',
      id: Date.now(),
    }

    setAnnotations([...annotations, newAnnotation])
  }

  return (
    <div className="flex-1 flex flex-col">
      <div
        className={`${isTerminalCollapsed ? 'h-12' : 'flex-1'} flex flex-col border-b border-border transition-all duration-200`}
      >
        <div className="flex items-center justify-between bg-card border-b border-border px-4 py-2">
          <div className="flex gap-2">
            <button className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded">
              Server Terminal
            </button>
            <button className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors">
              Console
            </button>
            <button className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors">
              Tests
            </button>
          </div>
          <button
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setIsTerminalCollapsed(!isTerminalCollapsed)}
            title="Hide/Show Terminal"
          >
            <span className="text-sm">{isTerminalCollapsed ? '▶' : '▼'}</span>
          </button>
        </div>
        <div className={`${isTerminalCollapsed ? 'hidden' : 'flex-1'}`}>
          <Terminal agentId="server" onInput={onTerminalInput} />
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between bg-card border-b border-border px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  serverStatus === 'offline'
                    ? 'bg-gray-500'
                    : serverStatus === 'connecting'
                      ? 'bg-yellow-500 animate-pulse'
                      : 'bg-green-500'
                }`}
              ></span>
              <span className="text-sm text-muted-foreground">
                {serverStatus === 'offline' && 'No server running'}
                {serverStatus === 'connecting' && 'Connecting...'}
                {serverStatus === 'online' && 'Connected'}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              className="px-3 py-1 text-sm bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="http://localhost:3000"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
            />
            <button
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors"
              title="Connect"
              onClick={connectToServer}
            >
              🔌
            </button>
            <button
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors"
              title="Refresh"
              onClick={refreshPreview}
            >
              🔄
            </button>
            <button
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors"
              title="Open in New Tab"
              onClick={openPreviewInTab}
            >
              🔗
            </button>
            <button
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors"
              title="Take Screenshot"
              onClick={takeScreenshot}
              disabled={serverStatus !== 'online'}
            >
              <Camera className="w-4 h-4" />
            </button>
            <select
              className="px-3 py-1 text-sm bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              value={previewDevice}
              onChange={(e) => setPreviewDevice(e.target.value as 'desktop' | 'tablet' | 'mobile')}
            >
              <option value="desktop">Desktop</option>
              <option value="tablet">Tablet (768px)</option>
              <option value="mobile">Mobile (375px)</option>
            </select>
          </div>
        </div>
        <div className="flex-1 bg-background p-4 overflow-y-auto" ref={previewRef}>
          <div
            className={`${
              previewDevice === 'tablet'
                ? 'max-w-3xl mx-auto'
                : previewDevice === 'mobile'
                  ? 'max-w-sm mx-auto'
                  : 'w-full'
            }`}
          >
            {serverStatus === 'online' ? (
              <>
                <iframe
                  id="preview-iframe"
                  src={serverUrl}
                  className="w-full border border-border rounded-lg bg-white"
                  style={{ height: 'calc(100vh - 300px)', minHeight: '500px' }}
                />

                {isAnnotating && (
                  <div className="absolute inset-0 bg-black/20 flex flex-col">
                    <div className="bg-card/95 backdrop-blur-sm border-b border-border p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Annotation Tools:</span>
                        <div className="flex gap-1">
                          <button
                            className={`p-2 rounded transition-colors ${
                              annotationTool === 'rectangle'
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                            }`}
                            onClick={() => setAnnotationTool('rectangle')}
                            title="Rectangle"
                          >
                            <Square className="w-4 h-4" />
                          </button>
                          <button
                            className={`p-2 rounded transition-colors ${
                              annotationTool === 'circle'
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                            }`}
                            onClick={() => setAnnotationTool('circle')}
                            title="Circle"
                          >
                            <Circle className="w-4 h-4" />
                          </button>
                          <button
                            className={`p-2 rounded transition-colors ${
                              annotationTool === 'arrow'
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                            }`}
                            onClick={() => setAnnotationTool('arrow')}
                            title="Arrow"
                          >
                            <ArrowBigUp className="w-4 h-4" />
                          </button>
                          <button
                            className={`p-2 rounded transition-colors ${
                              annotationTool === 'text'
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                            }`}
                            onClick={() => setAnnotationTool('text')}
                            title="Text"
                          >
                            <Type className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors flex items-center gap-2"
                          onClick={saveScreenshot}
                        >
                          <Download className="w-4 h-4" />
                          Save Screenshot
                        </button>
                        <button
                          className="px-3 py-1.5 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors flex items-center gap-2"
                          onClick={cancelAnnotation}
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                      </div>
                    </div>

                    <canvas
                      ref={canvasRef}
                      className="flex-1 cursor-crosshair"
                      onClick={handleCanvasClick}
                      style={{ width: '100%', height: '100%' }}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4 p-8 bg-card border border-border rounded-lg">
                  <h3 className="text-lg font-semibold text-foreground">
                    Development Server Not Connected
                  </h3>
                  <p className="text-muted-foreground">To preview your application:</p>
                  <ol className="text-left space-y-2 text-sm text-muted-foreground">
                    <li>1. Open the terminal below</li>
                    <li>
                      2. Run your development server (e.g.,{' '}
                      <code className="px-1 py-0.5 bg-secondary rounded text-xs">npm run dev</code>)
                    </li>
                    <li>3. Click Connect or it will auto-connect when server starts</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
