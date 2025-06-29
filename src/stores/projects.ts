import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export interface Project {
  id: string
  name: string
  description: string
  lastModified: string
  agentCount: number
  thumbnail?: string
  template?: string
  agentIds?: string[]
  directory?: string
  createdAt?: string | Date
  agents?: any[]
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
  projects: Project[]
  activeProjectId: string | null
  messageQueue: QueueItem[]
  viewMode: 'single' | 'split' | 'grid' | 'develop'
  sidebarCollapsed: boolean

  // Actions
  setProjects: (projects: Project[]) => void
  addProject: (project: Project) => void
  updateProject: (projectId: string, updates: Partial<Project>) => void
  removeProject: (projectId: string) => void
  setActiveProject: (projectId: string | null) => void

  // Queue actions
  addToQueue: (item: Omit<QueueItem, 'id' | 'timestamp' | 'status'>) => void
  updateQueueItem: (itemId: string, updates: Partial<QueueItem>) => void
  removeFromQueue: (itemId: string) => void
  clearQueue: () => void

  // UI actions
  setViewMode: (mode: 'single' | 'split' | 'grid' | 'develop') => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void

  // Utility actions
  clearAll: () => void
}

const MOCK_PROJECTS: Project[] = [
  {
    id: 'project-1',
    name: 'Project Alpha',
    description: 'Full-stack web application with React and Node.js backend',
    lastModified: '2024-01-15T10:30:00Z',
    agentCount: 3,
    agentIds: ['dev-1', 'ux-1'],
  },
  {
    id: 'project-2',
    name: 'Project Beta',
    description: 'Mobile app prototype with React Native',
    lastModified: '2024-01-12T14:20:00Z',
    agentCount: 2,
    agentIds: ['backend-1'],
  },
  {
    id: 'project-3',
    name: 'Data Analysis',
    description: 'Python data science pipeline with ML models',
    lastModified: '2024-01-10T09:15:00Z',
    agentCount: 1,
    agentIds: [],
  },
]

export const useProjectStore = create<ProjectState>()(
  devtools(
    (set) => ({
      // Initial state
      projects: MOCK_PROJECTS,
      activeProjectId: 'project-1',
      messageQueue: [],
      viewMode: 'single',
      sidebarCollapsed: false,

      // Project actions
      setProjects: (projects) => set({ projects }, false, 'setProjects'),

      addProject: (project) =>
        set(
          (state) => ({
            projects: [project, ...state.projects],
          }),
          false,
          'addProject'
        ),

      updateProject: (projectId, updates) =>
        set(
          (state) => ({
            projects: state.projects.map((p) => (p.id === projectId ? { ...p, ...updates } : p)),
          }),
          false,
          'updateProject'
        ),

      removeProject: (projectId) =>
        set(
          (state) => {
            const newProjects = state.projects.filter((p) => p.id !== projectId)
            const newActiveId =
              state.activeProjectId === projectId
                ? newProjects[0]?.id || null
                : state.activeProjectId

            return {
              projects: newProjects,
              activeProjectId: newActiveId,
            }
          },
          false,
          'removeProject'
        ),

      setActiveProject: (projectId) =>
        set({ activeProjectId: projectId }, false, 'setActiveProject'),

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
          }),
          false,
          'addToQueue'
        ),

      updateQueueItem: (itemId, updates) =>
        set(
          (state) => ({
            messageQueue: state.messageQueue.map((item) =>
              item.id === itemId ? { ...item, ...updates } : item
            ),
          }),
          false,
          'updateQueueItem'
        ),

      removeFromQueue: (itemId) =>
        set(
          (state) => ({
            messageQueue: state.messageQueue.filter((item) => item.id !== itemId),
          }),
          false,
          'removeFromQueue'
        ),

      clearQueue: () => set({ messageQueue: [] }, false, 'clearQueue'),

      // UI actions
      setViewMode: (mode) => set({ viewMode: mode }, false, 'setViewMode'),

      setSidebarCollapsed: (collapsed) =>
        set({ sidebarCollapsed: collapsed }, false, 'setSidebarCollapsed'),

      toggleSidebar: () =>
        set(
          (state) => ({
            sidebarCollapsed: !state.sidebarCollapsed,
          }),
          false,
          'toggleSidebar'
        ),

      clearAll: () =>
        set(
          {
            projects: [],
            activeProjectId: null,
            messageQueue: [],
            viewMode: 'single',
            sidebarCollapsed: false,
          },
          false,
          'clearAll'
        ),
    }),
    {
      name: 'project-store',
    }
  )
)
