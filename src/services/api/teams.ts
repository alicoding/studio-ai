// SOLID: Single Responsibility - API calls only
// Library First: Using native fetch API
export const teamsApi = {
  async getAll() {
    const response = await fetch('/api/teams')
    if (!response.ok) throw new Error('Failed to fetch teams')
    return response.json()
  },

  async create(data: { name: string; description: string; agents: any[] }) {
    const response = await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to create team')
    return response.json()
  },

  async update(id: string, data: any) {
    const response = await fetch(`/api/teams/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to update team')
    return response.json()
  },

  async delete(id: string) {
    const response = await fetch(`/api/teams/${id}`, { method: 'DELETE' })
    if (!response.ok) throw new Error('Failed to delete team')
  },

  async clone(id: string, name?: string) {
    const response = await fetch(`/api/teams/${id}/clone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (!response.ok) throw new Error('Failed to clone team')
    return response.json()
  },

  async spawn(teamId: string, projectId: string) {
    const response = await fetch(`/api/teams/${teamId}/spawn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId }),
    })
    if (!response.ok) throw new Error('Failed to spawn team')
    return response.json()
  },

  async import(team: any) {
    const response = await fetch('/api/teams/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team }),
    })
    if (!response.ok) throw new Error('Failed to import team')
    return response.json()
  },
}