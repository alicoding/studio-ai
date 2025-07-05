import { createPersistentStore } from './createPersistentStore'

export interface Project {
  id: string
  name: string
  description?: string
  path: string
  createdAt: Date | string
  sessionCount: number
  lastSessionAt?: Date | string
  status: 'active' | 'archived' | 'draft'
  lastModified: Date | string
  tags: string[]
  favorite: boolean
  studioMetadata?: {
    projectId: string
    status: 'active' | 'archived' | 'draft'
    tags: string[]
    favorite: boolean
    notes: string
    lastModified: Date | string
  }
}

export interface QueueItem {
  id: string
  target: string
  message: string
  timestamp: number
  status: 'pending' | 'processing' | 'completed' | 'error'
}

interface ProjectState {
  // State
  projects: Project[] // All projects from Claude Code
  openProjects: string[] // Project IDs that are open in workspace tabs
  activeProjectId: string | null
  projectAgents: Record<string, string[]> // Map of projectId to active agentIds
  messageQueue: QueueItem[]
  viewMode: 'single' | 'split' | 'grid' | 'develop'
  sidebarCollapsed: boolean
  chatCollapsed: boolean
  isLoading: boolean
  error: string | null

  // Actions
  setProjects: (projects: Project[]) => void
  fetchProjects: () => Promise<void>
  addProject: (project: Project) => void
  updateProject: (projectId: string, updates: Partial<Project>) => void
  updateProjectMetadata: (
    projectId: string,
    metadata: {
      tags?: string[]
      favorite?: boolean
      status?: 'active' | 'archived' | 'draft'
      notes?: string
    }
  ) => Promise<void>
  removeProject: (projectId: string) => void
  setActiveProject: (projectId: string | null) => void

  // Workspace tab actions
  openProjectInWorkspace: (projectId: string) => void
  closeProjectInWorkspace: (projectId: string) => void
  getOpenProjects: () => Project[]

  // Agent management per project
  setProjectAgents: (projectId: string, agentIds: string[]) => void
  getActiveProjectAgents: () => string[]

  // Queue actions
  addToQueue: (item: Omit<QueueItem, 'id' | 'timestamp' | 'status'>) => void
  updateQueueItem: (itemId: string, updates: Partial<QueueItem>) => void
  removeFromQueue: (itemId: string) => void
  clearQueue: () => void

  // UI actions
  setViewMode: (mode: 'single' | 'split' | 'grid' | 'develop') => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void
  setChatCollapsed: (collapsed: boolean) => void
  toggleChat: () => void

  // Utility actions
  clearAll: () => void
}

// Mock data will be replaced by real data from the API
const MOCK_PROJECTS: Project[] = []

export const useProjectStore = createPersistentStore<ProjectState>(
  'projects',
  (set, get) => ({
        // Initial state
        projects: MOCK_PROJECTS,
        openProjects: [], // No projects open initially
        activeProjectId: null,
        projectAgents: {}, // No agents assigned initially
        messageQueue: [],
        viewMode: 'single',
        sidebarCollapsed: false,
        chatCollapsed: false,
        isLoading: false,
        error: null,

        // Project actions
        setProjects: (projects) => set({ projects }),

        fetchProjects: async () => {
          set({ isLoading: true, error: null })
          try {
            const response = await fetch('/api/projects')
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`)
            }
            const projects = await response.json()
            set({ projects, isLoading: false, error: null })
          } catch (error) {
            console.error('Failed to fetch projects:', error)
            set(
              {
                isLoading: false,
                error: error instanceof Error ? error.message : 'Failed to fetch projects',
              }
            )
          }
        },

        addProject: (project) =>
          set(
            (state) => ({
              projects: [project, ...state.projects],
            })
          ),

        updateProject: (projectId, updates) =>
          set(
            (state) => ({
              projects: state.projects.map((p) => (p.id === projectId ? { ...p, ...updates } : p)),
            })
          ),

        updateProjectMetadata: async (projectId, metadata) => {
          try {
            const response = await fetch(`/api/projects/${projectId}/metadata`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(metadata),
            })

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`)
            }

            const updatedProject = await response.json()

            // Update the local state with the updated project
            set(
              (state) => ({
                projects: state.projects.map((p) => (p.id === projectId ? updatedProject : p)),
              })
            )
          } catch (error) {
            console.error('Failed to update project metadata:', error)
            throw error
          }
        },

        removeProject: (projectId) =>
          set(
            (state) => {
              const newProjects = state.projects.filter((p) => p.id !== projectId)
              const newOpenProjects = state.openProjects.filter((id) => id !== projectId)
              const newActiveId =
                state.activeProjectId === projectId
                  ? newOpenProjects[0] || null
                  : state.activeProjectId

              return {
                projects: newProjects,
                openProjects: newOpenProjects,
                activeProjectId: newActiveId,
              }
            }
          ),

        setActiveProject: (projectId) =>
          set({ activeProjectId: projectId }),

        // Queue actions
        addToQueue: (item) =>
          set(
            (state) => ({
              messageQueue: [
                ...state.messageQueue,
                {
                  ...item,
                  id: Date.now().toString(),
                  timestamp: Date.now(),
                  status: 'pending' as const,
                },
              ],
            })
          ),

        updateQueueItem: (itemId, updates) =>
          set(
            (state) => ({
              messageQueue: state.messageQueue.map((item) =>
                item.id === itemId ? { ...item, ...updates } : item
              ),
            })
          ),

        removeFromQueue: (itemId) =>
          set(
            (state) => ({
              messageQueue: state.messageQueue.filter((item) => item.id !== itemId),
            })
          ),

        clearQueue: () => set({ messageQueue: [] }),

        // UI actions
        setViewMode: (mode) => set({ viewMode: mode }),

        setSidebarCollapsed: (collapsed) =>
          set({ sidebarCollapsed: collapsed }),

        toggleSidebar: () =>
          set(
            (state) => ({
              sidebarCollapsed: !state.sidebarCollapsed,
            })
          ),

        // Agent management per project
        setProjectAgents: (projectId, agentIds) =>
          set(
            (state) => ({
              projectAgents: {
                ...state.projectAgents,
                [projectId]: agentIds,
              },
            })
          ),

        getActiveProjectAgents: () => {
          const state = get()
          if (!state.activeProjectId) return []
          return state.projectAgents[state.activeProjectId] || []
        },

        setChatCollapsed: (collapsed) =>
          set({ chatCollapsed: collapsed }),
        toggleChat: () =>
          set((state) => ({ chatCollapsed: !state.chatCollapsed })),

        clearAll: () =>
          set(
            {
              projects: [],
              openProjects: [],
              activeProjectId: null,
              messageQueue: [],
              viewMode: 'single',
              sidebarCollapsed: false,
              chatCollapsed: false,
            }
          ),

        // Workspace tab actions
        openProjectInWorkspace: (projectId) =>
          set(
            (state) => {
              // Add to open projects if not already there
              if (!state.openProjects.includes(projectId)) {
                return {
                  openProjects: [...state.openProjects, projectId],
                  activeProjectId: projectId, // Make it active when opened
                }
              }
              // Just make it active if already open
              return { activeProjectId: projectId }
            }
          ),

        closeProjectInWorkspace: (projectId) =>
          set(
            (state) => {
              const newOpenProjects = state.openProjects.filter((id) => id !== projectId)
              const newActiveId =
                state.activeProjectId === projectId
                  ? newOpenProjects[newOpenProjects.length - 1] || null
                  : state.activeProjectId

              return {
                openProjects: newOpenProjects,
                activeProjectId: newActiveId,
              }
            }
          ),

        getOpenProjects: () => {
          const state = get()
          return state.projects.filter((p) => state.openProjects.includes(p.id))
        },
      }),
  {
    partialize: (state) => ({
      openProjects: state.openProjects,
      activeProjectId: state.activeProjectId,
      viewMode: state.viewMode,
      sidebarCollapsed: state.sidebarCollapsed,
      chatCollapsed: state.chatCollapsed,
    })
  }
)
