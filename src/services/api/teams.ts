/**
 * MIGRATED: Now uses centralized API client with ky
 * 
 * SOLID: Single Responsibility - API calls only
 * DRY: Eliminates duplicate HTTP boilerplate
 * KISS: Simple delegation to centralized client
 * Library-First: Built on ky via StudioApiProvider
 */

import { studioApi } from './index'

// Backwards compatibility export - delegates to centralized client
export const teamsApi = {
  getAll: () => studioApi.teams.getAll(),
  create: (data: { name: string; description: string; agents: any[] }) => 
    studioApi.teams.create(data),
  update: (id: string, data: any) => studioApi.teams.update(id, data),
  delete: (id: string) => studioApi.teams.delete(id),
  clone: (id: string, name?: string) => studioApi.teams.clone(id, name),
  spawn: (teamId: string, projectId: string) => studioApi.teams.spawn(teamId, projectId),
  import: (team: any) => studioApi.teams.import(team),
}

// Extended operations available through centralized client
export const extendedTeamsApi = studioApi.teams