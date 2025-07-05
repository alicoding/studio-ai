import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { Navigation } from '../components/layout/Navigation'
import { ErrorBoundary } from '../components/shared/ErrorBoundary'
import { Toaster } from '../components/ui/sonner'
import { DevWrapper } from '../components/DevWrapper'
import { GlobalScreenshotHandler } from '../components/workspace/GlobalScreenshotHandler'
import { GlobalChat } from '../components/chat/GlobalChat'

function RootComponent() {
  return (
    <ErrorBoundary>
      <DevWrapper>
        <div className="flex flex-col h-screen">
          <Navigation />
          <div className="flex-1 overflow-hidden">
            <Outlet />
          </div>
        </div>
        <Toaster position="bottom-right" />
        <GlobalScreenshotHandler />
        <GlobalChat />
        <TanStackRouterDevtools />
      </DevWrapper>
    </ErrorBoundary>
  )
}

export const Route = createRootRoute({
  component: RootComponent,
})
