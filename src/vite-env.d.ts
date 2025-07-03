/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_VERSION: string
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
  readonly hot?: {
    accept: (cb?: () => void) => void
    dispose: (cb: () => void) => void
    invalidate: () => void
    on: (event: string, cb: (...args: any[]) => void) => void
  }
}