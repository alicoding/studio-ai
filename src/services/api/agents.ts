// SOLID: Single Responsibility - API calls only
export const agentsApi = {
  async getAll() {
    const response = await fetch('/api/agents')
    if (!response.ok) throw new Error('Failed to fetch agents')
    return response.json()
  },

  async get(id: string) {
    const response = await fetch(`/api/agents/${id}`)
    if (!response.ok) throw new Error('Failed to fetch agent')
    return response.json()
  },

  async create(data: any) {
    const response = await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to create agent')
    return response.json()
  },

  async update(id: string, data: any) {
    const response = await fetch(`/api/agents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to update agent')
    return response.json()
  },

  async delete(id: string) {
    const response = await fetch(`/api/agents/${id}`, { method: 'DELETE' })
    if (!response.ok) throw new Error('Failed to delete agent')
  },
}