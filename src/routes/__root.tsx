import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { Navigation } from '../components/layout/Navigation'
import { ErrorBoundary } from '../components/shared/ErrorBoundary'
import { Toaster } from '../components/ui/sonner'

function RootComponent() {
  return (
    <ErrorBoundary>
      <div className="flex flex-col h-screen">
        <Navigation />
        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>
      </div>
      <Toaster position="bottom-right" />
      <TanStackRouterDevtools />
    </ErrorBoundary>
  )
}

export const Route = createRootRoute({
  component: RootComponent,
})
