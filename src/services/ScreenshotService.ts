import * as domtoimage from 'dom-to-image-more'
import { toast } from 'sonner'
import { saveAs } from 'file-saver'

interface ElementInfo {
  tagName: string
  id?: string
  className?: string
  attributes: Record<string, string>
  computedStyles?: Partial<CSSStyleDeclaration>
  boundingRect: DOMRect
  textContent?: string
  reactComponent?: {
    name: string
    props?: any
    state?: any
    source?: {
      fileName: string
      lineNumber: number
      columnNumber?: number
    }
    hierarchy?: string[]
  }
  parentChain: string[]
}

export class ScreenshotService {
  private static instance: ScreenshotService
  private isCapturing = false
  private overlay: HTMLDivElement | null = null
  private highlights: Array<{ rect: DOMRect; element: Element }> = []
  private onCaptureCallback: ((info: string) => void) | null = null

  static getInstance(): ScreenshotService {
    if (!ScreenshotService.instance) {
      ScreenshotService.instance = new ScreenshotService()
    }
    return ScreenshotService.instance
  }

  constructor() {
    this.registerGlobalShortcut()
  }

  private registerGlobalShortcut() {
    document.addEventListener('keydown', (e) => {
      // Cmd/Ctrl + Shift + I for component inspection
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'I') {
        e.preventDefault()
        this.startCapture()
      }
    })
  }

  setOnCaptureCallback(callback: (info: string) => void) {
    this.onCaptureCallback = callback
  }

  startCapture() {
    if (this.isCapturing) return
    
    this.isCapturing = true
    this.highlights = []
    this.createOverlay()
    
    toast.info('Click on elements to highlight, then press Enter to capture', {
      position: 'top-center',
      duration: 5000
    })
  }

  private createOverlay() {
    this.overlay = document.createElement('div')
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 999999;
      pointer-events: none;
    `
    
    document.body.appendChild(this.overlay)
    
    // Add event listeners
    document.addEventListener('mousemove', this.handleMouseMove)
    document.addEventListener('click', this.handleClick)
    document.addEventListener('keydown', this.handleKeyDown)
  }

  private cleanup() {
    if (this.overlay) {
      this.overlay.remove()
      this.overlay = null
    }
    
    document.removeEventListener('mousemove', this.handleMouseMove)
    document.removeEventListener('click', this.handleClick)
    document.removeEventListener('keydown', this.handleKeyDown)
    
    this.isCapturing = false
    this.highlights = []
  }

  private handleMouseMove = (e: MouseEvent) => {
    if (!this.isCapturing || !this.overlay) return
    
    const element = document.elementFromPoint(e.clientX, e.clientY)
    if (element && element !== this.overlay) {
      this.showHoverHighlight(element)
    }
  }

  private handleClick = (e: MouseEvent) => {
    if (!this.isCapturing) return
    
    e.preventDefault()
    e.stopPropagation()
    
    const element = document.elementFromPoint(e.clientX, e.clientY)
    if (element && element !== this.overlay) {
      this.addHighlight(element)
    }
  }

  private handleKeyDown = async (e: KeyboardEvent) => {
    if (!this.isCapturing) return
    
    if (e.key === 'Escape') {
      this.cleanup()
      toast.info('Component inspection cancelled')
    } else if (e.key === 'Enter' && this.highlights.length > 0) {
      e.preventDefault()
      await this.captureHighlightedElements()
    }
  }

  private showHoverHighlight(element: Element) {
    if (!this.overlay) return
    
    // Clear existing hover highlights
    this.overlay.querySelectorAll('.hover-highlight').forEach(el => el.remove())
    
    const rect = element.getBoundingClientRect()
    const highlight = document.createElement('div')
    highlight.className = 'hover-highlight'
    highlight.style.cssText = `
      position: absolute;
      left: ${rect.left}px;
      top: ${rect.top}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      background: rgba(59, 130, 246, 0.2);
      border: 2px dashed #3b82f6;
      pointer-events: none;
    `
    
    this.overlay.appendChild(highlight)
  }

  private addHighlight(element: Element) {
    if (!this.overlay) return
    
    const rect = element.getBoundingClientRect()
    
    // Check if element is already highlighted
    const isHighlighted = this.highlights.some(h => h.element === element)
    if (isHighlighted) {
      // Remove highlight
      this.highlights = this.highlights.filter(h => h.element !== element)
      this.updatePersistentHighlights()
      return
    }
    
    // Add to highlights
    this.highlights.push({ rect, element })
    this.updatePersistentHighlights()
  }

  private updatePersistentHighlights() {
    if (!this.overlay) return
    
    // Clear existing persistent highlights
    this.overlay.querySelectorAll('.persistent-highlight').forEach(el => el.remove())
    
    // Add all persistent highlights
    this.highlights.forEach(({ rect }) => {
      const highlight = document.createElement('div')
      highlight.className = 'persistent-highlight'
      highlight.style.cssText = `
        position: absolute;
        left: ${rect.left}px;
        top: ${rect.top}px;
        width: ${rect.width}px;
        height: ${rect.height}px;
        background: rgba(34, 197, 94, 0.3);
        border: 2px solid #22c55e;
        pointer-events: none;
      `
      
      this.overlay!.appendChild(highlight)
    })
  }

  private async captureHighlightedElements() {
    try {
      if (this.highlights.length === 0) {
        toast.error('No elements highlighted')
        this.cleanup()
        return
      }

      // Calculate bounding box that encompasses all highlighted elements
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      
      this.highlights.forEach(({ rect }) => {
        minX = Math.min(minX, rect.left)
        minY = Math.min(minY, rect.top)
        maxX = Math.max(maxX, rect.left + rect.width)
        maxY = Math.max(maxY, rect.top + rect.height)
      })

      // Add some padding
      const padding = 20
      minX = Math.max(0, minX - padding)
      minY = Math.max(0, minY - padding)
      maxX = Math.min(window.innerWidth, maxX + padding)
      maxY = Math.min(window.innerHeight, maxY + padding)

      const width = maxX - minX
      const height = maxY - minY

      // Create a temporary container to capture just the highlighted area
      const captureContainer = document.createElement('div')
      captureContainer.style.cssText = `
        position: fixed;
        left: ${minX}px;
        top: ${minY}px;
        width: ${width}px;
        height: ${height}px;
        overflow: hidden;
        z-index: -1;
      `
      document.body.appendChild(captureContainer)

      // Clone the highlighted elements into the container
      const clonedElements: HTMLElement[] = []
      
      this.highlights.forEach(({ element, rect }) => {
        const clone = element.cloneNode(true) as HTMLElement
        clone.style.position = 'absolute'
        clone.style.left = `${rect.left - minX}px`
        clone.style.top = `${rect.top - minY}px`
        clone.style.margin = '0'
        clone.style.transform = 'none'
        captureContainer.appendChild(clone)
        clonedElements.push(clone)
      })

      // Hide overlay temporarily
      if (this.overlay) {
        this.overlay.style.display = 'none'
      }

      // Prepare filename
      const filename = `claude-studio-inspector-${Date.now()}.png`
      let screenshotPath = `~/Downloads/${filename}`
      
      try {
        // Create screenshot using dom-to-image
        const blob = await domtoimage.toBlob(captureContainer, {
          width,
          height,
          bgcolor: '#ffffff',
          quality: 0.95
        })
        
        // Use file-saver to download the blob
        saveAs(blob, filename)
        
        console.log('Screenshot saved using file-saver:', {
          filename,
          size: blob.size,
          type: blob.type
        })
        
        toast.success('Screenshot saved!', {
          description: `Check Downloads folder for ${filename}`,
          duration: 3000,
          position: 'top-center'
        })
        
        // Update path to Downloads folder
        screenshotPath = `~/Downloads/${filename}`

      } catch (error) {
        console.error('Screenshot capture failed:', error)
        toast.error('Failed to capture screenshot')
      } finally {
        // Clean up
        captureContainer.remove()
        if (this.overlay) {
          this.overlay.style.display = 'block'
        }
      }

      // Collect element information
      const highlightData = this.highlights.map(({ rect, element }) => ({
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        elementInfo: this.getElementInfo(element)
      }))
      
      // Create result with component info
      const result = {
        timestamp: new Date().toISOString(),
        highlights: highlightData,
        pageInfo: {
          url: window.location.href,
          title: document.title,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          }
        }
      }
      
      // Format the component info
      const message = this.formatComponentMessage(result)
      
      // Add screenshot path to message
      const fullMessage = `📸 **Screenshot saved to:** \`${screenshotPath}\`\n\n${message}`
      
      // Call the callback if set, otherwise copy to clipboard
      if (this.onCaptureCallback) {
        this.onCaptureCallback(fullMessage)
      } else {
        await this.saveToClipboard(result)
      }
    } catch (error) {
      console.error('Component capture failed:', error)
      toast.error('Failed to capture component details')
    }
    
    this.cleanup()
  }


  private getElementInfo(element: Element): ElementInfo {
    const computedStyles = window.getComputedStyle(element)
    const rect = element.getBoundingClientRect()
    
    // Get important computed styles
    const importantStyles: Partial<CSSStyleDeclaration> = {
      display: computedStyles.display,
      position: computedStyles.position,
      width: computedStyles.width,
      height: computedStyles.height,
      padding: computedStyles.padding,
      margin: computedStyles.margin,
      color: computedStyles.color,
      backgroundColor: computedStyles.backgroundColor,
      fontSize: computedStyles.fontSize,
      fontFamily: computedStyles.fontFamily,
      zIndex: computedStyles.zIndex,
      opacity: computedStyles.opacity,
      overflow: computedStyles.overflow,
    }
    
    // Get React component info if available
    const reactComponent = this.getReactComponentInfo(element)
    
    // Get parent chain for context
    const parentChain = this.getParentChain(element)
    
    // Get all attributes
    const attributes: Record<string, string> = {}
    Array.from(element.attributes).forEach(attr => {
      attributes[attr.name] = attr.value
    })
    
    // Get text content (truncated if too long)
    let textContent: string | undefined
    if (element.textContent) {
      const text = element.textContent.trim()
      if (text && text.length > 0) {
        // Only include if it's not just the concatenation of all child text
        const childTexts = Array.from(element.children)
          .map(child => child.textContent?.trim() || '')
          .join('')
        
        if (text !== childTexts) {
          textContent = text.length > 100 ? text.slice(0, 100) + '...' : text
        }
      }
    }
    
    return {
      tagName: element.tagName.toLowerCase(),
      id: element.id || undefined,
      className: element.className || undefined,
      attributes,
      computedStyles: importantStyles,
      boundingRect: rect,
      textContent,
      reactComponent,
      parentChain
    }
  }

  private getReactComponentInfo(element: Element): ElementInfo['reactComponent'] | undefined {
    // Try to find React fiber node
    const fiberKey = Object.keys(element).find(key => key.startsWith('__reactInternalInstance') || key.startsWith('__reactFiber'))
    
    if (fiberKey) {
      const fiber = (element as any)[fiberKey]
      if (fiber && fiber.elementType) {
        // Enhanced component name detection
        let componentName = 'Unknown'
        
        // Try multiple ways to get the component name
        if (fiber.elementType.name) {
          componentName = fiber.elementType.name
        } else if (fiber.elementType.displayName) {
          componentName = fiber.elementType.displayName
        } else if (fiber.type && typeof fiber.type === 'function') {
          // Try to get name from the type property
          componentName = fiber.type.name || fiber.type.displayName || 'Unknown'
        } else if (fiber._debugOwner && fiber._debugOwner.elementType) {
          // Try to get from debug owner
          componentName = fiber._debugOwner.elementType.name || fiber._debugOwner.elementType.displayName || 'Unknown'
        }
        
        // Debug logging to help diagnose name detection issues
        if (import.meta.env.DEV && componentName === 'Unknown') {
          console.log('React component name detection debug:', {
            fiber,
            elementType: fiber.elementType,
            type: fiber.type,
            hasName: !!fiber.elementType?.name,
            hasDisplayName: !!fiber.elementType?.displayName,
            elementTypeType: typeof fiber.elementType,
            elementTypeConstructorName: fiber.elementType?.constructor?.name,
            stateNode: fiber.stateNode,
            tag: fiber.tag,
            // Check if it's a host component (DOM element)
            isHostComponent: fiber.tag === 5
          })
        }
        
        // If still unknown, try to extract from function string
        if (componentName === 'Unknown' && typeof fiber.elementType === 'function') {
          const funcStr = fiber.elementType.toString()
          // Look for function name patterns
          const funcNameMatch = funcStr.match(/function\s+([A-Z][a-zA-Z0-9_$]*)\s*\(/) || 
                               funcStr.match(/^([A-Z][a-zA-Z0-9_$]*)\s*=/) ||
                               funcStr.match(/^const\s+([A-Z][a-zA-Z0-9_$]*)\s*=/)
          if (funcNameMatch && funcNameMatch[1]) {
            componentName = funcNameMatch[1]
          }
        }
        
        // For memo/forwardRef components, try to get the wrapped component name
        if (fiber.elementType.$$typeof) {
          const symbolStr = fiber.elementType.$$typeof.toString()
          if (symbolStr.includes('react.memo') || symbolStr.includes('react.forward_ref')) {
            if (fiber.elementType.type && fiber.elementType.type.name) {
              componentName = fiber.elementType.type.name
            } else if (fiber.elementType.render && fiber.elementType.render.name) {
              componentName = fiber.elementType.render.name
            }
          }
        }
        
        // In development, Vite might add wrappers, try to get original component
        if (componentName === 'Unknown' && import.meta.env.DEV) {
          // Check if it's a Vite HMR wrapper
          if (fiber.elementType?._payload?.value?.name) {
            componentName = fiber.elementType._payload.value.name
          } else if (fiber.elementType?._payload?._result?.name) {
            componentName = fiber.elementType._payload._result.name
          }
          
          // Try alternate fiber properties
          if (componentName === 'Unknown' && fiber.alternate?.elementType?.name) {
            componentName = fiber.alternate.elementType.name
          }
        }
        
        const componentInfo: any = {
          name: componentName,
          props: fiber.memoizedProps,
          state: fiber.memoizedState
        }
        
        // Try to get source location from fiber debug info
        if (fiber._debugSource) {
          componentInfo.source = {
            fileName: fiber._debugSource.fileName,
            lineNumber: fiber._debugSource.lineNumber,
            columnNumber: fiber._debugSource.columnNumber
          }
        }
        
        // Try to extract component file path from stack trace or function source
        if (fiber.elementType && typeof fiber.elementType === 'function') {
          const funcString = fiber.elementType.toString()
          // Try to extract file path from webpack comments
          const webpackMatch = funcString.match(/\/\*\* __PURE__ \*\/.*?\/\/ (.+?\.tsx?):(\d+):(\d+)/)
          if (webpackMatch) {
            componentInfo.source = {
              fileName: webpackMatch[1],
              lineNumber: parseInt(webpackMatch[2]),
              columnNumber: parseInt(webpackMatch[3])
            }
          }
        }
        
        // Get component hierarchy with improved name detection
        let current = fiber.return
        const hierarchy: string[] = []
        while (current && hierarchy.length < 5) {
          if (current.elementType && typeof current.elementType !== 'string') {
            let name = current.elementType.name || current.elementType.displayName
            if (!name && current.type && typeof current.type === 'function') {
              name = current.type.name || current.type.displayName
            }
            if (name && name !== 'Unknown') hierarchy.unshift(name)
          }
          current = current.return
        }
        if (hierarchy.length > 0) {
          componentInfo.hierarchy = hierarchy
        }
        
        return componentInfo
      }
    }
    
    return undefined
  }

  private getParentChain(element: Element): string[] {
    const chain: string[] = []
    let current = element.parentElement
    
    while (current && current !== document.body) {
      const identifier = current.id ? `#${current.id}` : current.className ? `.${current.className.split(' ')[0]}` : current.tagName.toLowerCase()
      chain.unshift(identifier)
      current = current.parentElement
    }
    
    return chain
  }

  private async saveToClipboard(data: any) {
    try {
      const text = this.formatComponentMessage(data)
      await navigator.clipboard.writeText(text)
      toast.success('Component info copied to clipboard!')
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      toast.error('Failed to copy to clipboard')
    }
  }

  private formatComponentMessage(data: any): string {
    const parts: string[] = ['## Component Inspector Results\n']
    
    parts.push(`**Page:** ${data.pageInfo.title || 'Untitled'} - ${data.pageInfo.url}`)
    parts.push(`**Viewport:** ${data.pageInfo.viewport.width}x${data.pageInfo.viewport.height}`)
    parts.push(`**Captured:** ${new Date(data.timestamp).toLocaleString()}\n`)
    
    data.highlights.forEach((highlight: any, index: number) => {
      const info = highlight.elementInfo
      parts.push(`### Element ${index + 1}`)
      parts.push(`**Tag:** \`<${info.tagName}>\``)
      
      if (info.id) parts.push(`**ID:** \`${info.id}\``)
      if (info.className) parts.push(`**Classes:** \`${info.className}\``)
      
      // Show important attributes
      const importantAttrs = ['data-testid', 'aria-label', 'href', 'src', 'alt', 'title', 'name', 'type', 'value', 'placeholder']
      const relevantAttrs = Object.entries(info.attributes)
        .filter(([key]) => importantAttrs.includes(key) || key.startsWith('data-'))
        .map(([key, value]) => `${key}="${value}"`)
      
      if (relevantAttrs.length > 0) {
        parts.push(`**Attributes:** ${relevantAttrs.join(', ')}`)
      }
      
      if (info.textContent) {
        parts.push(`**Text:** "${info.textContent}"`)
      }
      
      parts.push(`**Position:** ${Math.round(highlight.x)}, ${Math.round(highlight.y)} (${Math.round(highlight.width)}x${Math.round(highlight.height)})`)
      
      if (info.reactComponent) {
        const comp = info.reactComponent
        parts.push(`\n**React Component:** \`${comp.name}\``)
        
        if (comp.hierarchy && comp.hierarchy.length > 0) {
          parts.push(`**Component Tree:** ${comp.hierarchy.join(' > ')} > ${comp.name}`)
        }
        
        if (comp.props && Object.keys(comp.props).length > 0) {
          const propEntries = Object.entries(comp.props)
            .filter(([key, value]) => key !== 'children' && value !== undefined)
            .map(([key, value]) => {
              // Format prop values
              let displayValue: string
              if (typeof value === 'function') {
                displayValue = '[Function]'
              } else if (typeof value === 'object' && value !== null) {
                try {
                  displayValue = JSON.stringify(value, null, 2)
                  if (displayValue.length > 100) {
                    displayValue = displayValue.substring(0, 100) + '...'
                  }
                } catch {
                  displayValue = '[Object]'
                }
              } else if (typeof value === 'string' && value.length > 50) {
                displayValue = `"${value.substring(0, 50)}..."`
              } else if (typeof value === 'string') {
                displayValue = `"${value}"`
              } else {
                displayValue = String(value)
              }
              return `  ${key}: ${displayValue}`
            })
          
          if (propEntries.length > 0) {
            parts.push(`**Props:**\n${propEntries.join('\n')}`)
          }
        }
        
        if (comp.source) {
          parts.push(`**Source:** \`${comp.source.fileName}:${comp.source.lineNumber}\``)
        }
      }
      
      parts.push(`**CSS Path:** ${info.parentChain.join(' > ')} > ${info.tagName}`)
      
      // Show key styles
      if (info.computedStyles) {
        const keyStyles = ['display', 'position', 'width', 'height', 'color', 'backgroundColor']
        const relevantStyles = keyStyles
          .filter(key => info.computedStyles![key as keyof CSSStyleDeclaration])
          .map(key => `${key}: ${info.computedStyles![key as keyof CSSStyleDeclaration]}`)
        
        if (relevantStyles.length > 0) {
          parts.push(`**Key Styles:** ${relevantStyles.join('; ')}`)
        }
      }
      
      parts.push('') // Empty line between elements
    })
    
    return parts.join('\n')
  }
}