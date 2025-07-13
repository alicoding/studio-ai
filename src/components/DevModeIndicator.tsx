import { useEffect, useState } from 'react'
import { Flame } from 'lucide-react'

export function DevModeIndicator() {
  const [reloadCount, setReloadCount] = useState(0)
  
  useEffect(() => {
    if (import.meta.env.DEV && import.meta.hot) {
      // Track hot reloads
      const count = parseInt(sessionStorage.getItem('hmr_reload_count') || '0')
      setReloadCount(count)
      
      import.meta.hot.on('vite:beforeUpdate', () => {
        const newCount = count + 1
        sessionStorage.setItem('hmr_reload_count', newCount.toString())
      })
    }
  }, [])
  
  if (!import.meta.env.DEV) return null
  
  return (
    <div className="fixed bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-orange-500/20 text-orange-600 rounded-md text-xs font-medium backdrop-blur-sm border border-orange-500/30">
      <Flame className="w-3 h-3" />
      <span>HMR Active</span>
      {reloadCount > 0 && (
        <span className="text-orange-400">({reloadCount} reloads)</span>
      )}
    </div>
  )
}