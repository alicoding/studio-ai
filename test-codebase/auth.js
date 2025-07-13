// Authentication service
export class AuthService {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  async validateToken(token) {
    const response = await fetch('/api/validate', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }

  async login(username, password) {
    const response = await fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    return response.json();
  }
}