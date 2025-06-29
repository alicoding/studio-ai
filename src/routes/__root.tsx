import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { useState } from 'react'
import { Navigation } from '../components/layout/Navigation'
import { ErrorBoundary } from '../components/shared/ErrorBoundary'
import { SettingsModal } from '../components/settings/SettingsModal'

function RootComponent() {
  const [showSettings, setShowSettings] = useState(false)

  const handleSettingsClick = () => {
    setShowSettings(true)
  }

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-screen">
        <Navigation onSettingsClick={handleSettingsClick} />
        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>
      </div>
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <TanStackRouterDevtools />
    </ErrorBoundary>
  )
}

export const Route = createRootRoute({
  component: RootComponent,
})
