/**
 * MIGRATED: Now uses centralized API client with ky
 * 
 * SOLID: Single Responsibility - API calls only
 * DRY: Reuses HTTP client logic from StudioApiProvider
 * KISS: Simple delegation to centralized client
 * Library-First: Built on ky via StudioApiProvider
 */

import { studioApi } from './index'

// Backwards compatibility export - delegates to centralized client
export const agentsApi = {
  getAll: () => studioApi.agents.getAll(),
  get: (id: string) => studioApi.agents.get(id),
  create: (data: any) => studioApi.agents.create(data),
  update: (id: string, data: any) => studioApi.agents.update(id, data),
  delete: (id: string) => studioApi.agents.delete(id),
}

// Extended operations available through centralized client
export const extendedAgentsApi = studioApi.agents