# User Authentication Implementation Guide

## Table of Contents
1. [Overview](#overview)
2. [Core Components](#core-components)
3. [JWT Token Implementation](#jwt-token-implementation)
4. [Password Hashing](#password-hashing)
5. [Session Management](#session-management)
6. [Security Best Practices](#security-best-practices)
7. [Implementation Architecture](#implementation-architecture)
8. [Code Examples](#code-examples)
9. [Testing Strategy](#testing-strategy)

## Overview

User authentication is a critical security component that verifies user identity and controls access to protected resources. This guide covers implementing a secure, scalable authentication system using industry best practices.

### Key Requirements
- Secure password storage using bcrypt/argon2
- JWT tokens for stateless authentication
- Session management with refresh tokens
- Protection against common attacks (CSRF, XSS, brute force)
- Scalable architecture supporting distributed systems

## Core Components

### 1. Authentication Flow
```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│ Client  │────▶│   API   │────▶│  Auth   │────▶│Database │
│(Browser)│◀────│ Gateway │◀────│Service  │◀────│         │
└─────────┘     └─────────┘     └─────────┘     └─────────┘
```

### 2. Token Types
- **Access Token**: Short-lived JWT (15-30 minutes) for API requests
- **Refresh Token**: Long-lived token (7-30 days) stored securely
- **CSRF Token**: Prevents cross-site request forgery attacks

## JWT Token Implementation

### JWT Structure
```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user_id",
    "email": "user@example.com",
    "roles": ["user"],
    "iat": 1616239022,
    "exp": 1616240822
  },
  "signature": "..."
}
```

### Best Practices for JWT
1. **Use RS256 (RSA + SHA256)** for production environments
2. **Keep payload minimal** - Don't store sensitive data
3. **Set appropriate expiration** - Balance security vs UX
4. **Implement token rotation** - Issue new tokens before expiry
5. **Store in httpOnly cookies** - Prevent XSS attacks

### Token Service Implementation
```typescript
interface TokenPayload {
  sub: string;
  email: string;
  roles: string[];
}

class JWTService {
  private readonly accessTokenExpiry = '15m';
  private readonly refreshTokenExpiry = '7d';
  
  generateTokenPair(user: User): TokenPair {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles
    };
    
    const accessToken = jwt.sign(payload, privateKey, {
      algorithm: 'RS256',
      expiresIn: this.accessTokenExpiry
    });
    
    const refreshToken = crypto.randomBytes(32).toString('hex');
    
    return { accessToken, refreshToken };
  }
}
```

## Password Hashing

### Algorithm Selection
1. **Argon2id** (Recommended) - Memory-hard, resistant to GPU attacks
2. **bcrypt** - Widely supported, battle-tested
3. **scrypt** - Good alternative, memory-hard

### Implementation Guidelines
```typescript
class PasswordService {
  // Argon2 configuration
  private readonly argon2Config = {
    type: argon2.argon2id,
    memoryCost: 65536,      // 64MB
    timeCost: 3,            // iterations
    parallelism: 4,         // threads
    saltLength: 16
  };
  
  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, this.argon2Config);
  }
  
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return argon2.verify(hash, password);
  }
}
```

### Password Security Rules
1. **Minimum length**: 8-12 characters
2. **Complexity requirements**: Consider using zxcvbn for strength estimation
3. **Breach detection**: Check against HaveIBeenPwned API
4. **Rate limiting**: Prevent brute force attacks
5. **Password history**: Prevent reuse of recent passwords

## Session Management

### Session Architecture
```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Browser   │────▶│Session Store │────▶│   Redis/    │
│  (Cookie)   │◀────│  Middleware  │◀────│  Database   │
└─────────────┘     └──────────────┘     └─────────────┘
```

### Session Storage Options

#### 1. Redis (Recommended for Production)
```typescript
class RedisSessionStore {
  private redis: Redis;
  
  async createSession(userId: string, refreshToken: string): Promise<void> {
    const sessionKey = `session:${refreshToken}`;
    const sessionData = {
      userId,
      createdAt: Date.now(),
      lastActivity: Date.now()
    };
    
    await this.redis.setex(
      sessionKey,
      7 * 24 * 60 * 60, // 7 days
      JSON.stringify(sessionData)
    );
  }
}
```

#### 2. Database Sessions
```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id),
    refresh_token VARCHAR(255) NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    last_activity TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_refresh_token ON sessions(refresh_token);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

### Session Security
1. **Secure cookies**: httpOnly, secure, sameSite
2. **Session rotation**: New session ID on privilege escalation
3. **Idle timeout**: Logout after inactivity
4. **Concurrent session limits**: Restrict active sessions per user
5. **Device fingerprinting**: Detect suspicious session usage

## Security Best Practices

### 1. Rate Limiting
```typescript
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many login attempts, please try again later'
    });
  }
});
```

### 2. CSRF Protection
```typescript
class CSRFService {
  generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
  
  validateToken(token: string, sessionToken: string): boolean {
    return crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(sessionToken)
    );
  }
}
```

### 3. Security Headers
```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### 4. Input Validation
```typescript
const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  rememberMe: z.boolean().optional()
});

const validateLogin = (data: unknown) => {
  return loginSchema.parse(data);
};
```

### 5. Account Security Features
- **Two-Factor Authentication (2FA)**: TOTP/SMS/Email
- **Account lockout**: After failed attempts
- **Email verification**: Confirm email ownership
- **Password reset**: Secure token-based flow
- **Login notifications**: Alert users of new sign-ins
- **Audit logging**: Track authentication events

## Implementation Architecture

### Complete Authentication Service
```typescript
interface AuthService {
  // Core authentication
  register(email: string, password: string): Promise<User>;
  login(email: string, password: string): Promise<AuthTokens>;
  logout(refreshToken: string): Promise<void>;
  
  // Token management
  refreshAccessToken(refreshToken: string): Promise<string>;
  revokeAllTokens(userId: string): Promise<void>;
  
  // Password management
  requestPasswordReset(email: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;
  changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void>;
  
  // Session management
  getSessions(userId: string): Promise<Session[]>;
  terminateSession(sessionId: string): Promise<void>;
  
  // 2FA
  enable2FA(userId: string): Promise<TwoFactorSecret>;
  verify2FA(userId: string, code: string): Promise<boolean>;
  disable2FA(userId: string, password: string): Promise<void>;
}
```

### Middleware Architecture
```typescript
// Authentication middleware
const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const payload = await jwtService.verify(token);
    req.user = await userService.findById(payload.sub);
    
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Authorization middleware
const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const hasRole = roles.some(role => req.user.roles.includes(role));
    if (!hasRole) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};
```

## Code Examples

### 1. Registration Endpoint
```typescript
app.post('/api/auth/register', 
  validateRequest(registerSchema),
  async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      
      // Check if user exists
      const existingUser = await userService.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: 'Email already registered' });
      }
      
      // Hash password
      const passwordHash = await passwordService.hash(password);
      
      // Create user
      const user = await userService.create({
        email,
        passwordHash
      });
      
      // Send verification email
      await emailService.sendVerificationEmail(user);
      
      res.status(201).json({
        message: 'Registration successful. Please verify your email.'
      });
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);
```

### 2. Login Endpoint
```typescript
app.post('/api/auth/login',
  loginRateLimiter,
  validateRequest(loginSchema),
  async (req: Request, res: Response) => {
    try {
      const { email, password, rememberMe } = req.body;
      
      // Find user
      const user = await userService.findByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Verify password
      const isValid = await passwordService.verify(password, user.passwordHash);
      if (!isValid) {
        await auditService.logFailedLogin(email, req.ip);
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Generate tokens
      const { accessToken, refreshToken } = await authService.generateTokens(user);
      
      // Create session
      await sessionService.create({
        userId: user.id,
        refreshToken,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
      
      // Set cookies
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : undefined
      };
      
      res.cookie('refreshToken', refreshToken, cookieOptions);
      
      res.json({
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          roles: user.roles
        }
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);
```

### 3. Token Refresh Endpoint
```typescript
app.post('/api/auth/refresh',
  async (req: Request, res: Response) => {
    try {
      const refreshToken = req.cookies.refreshToken;
      if (!refreshToken) {
        return res.status(401).json({ error: 'No refresh token' });
      }
      
      // Verify session
      const session = await sessionService.findByToken(refreshToken);
      if (!session || session.expiresAt < new Date()) {
        return res.status(401).json({ error: 'Invalid refresh token' });
      }
      
      // Generate new access token
      const user = await userService.findById(session.userId);
      const accessToken = await jwtService.generateAccessToken(user);
      
      // Update session activity
      await sessionService.updateActivity(session.id);
      
      res.json({ accessToken });
    } catch (error) {
      logger.error('Token refresh error:', error);
      res.status(500).json({ error: 'Token refresh failed' });
    }
  }
);
```

## Testing Strategy

### 1. Unit Tests
```typescript
describe('PasswordService', () => {
  it('should hash and verify passwords', async () => {
    const password = 'SecurePassword123!';
    const hash = await passwordService.hash(password);
    
    expect(hash).not.toBe(password);
    expect(await passwordService.verify(password, hash)).toBe(true);
    expect(await passwordService.verify('wrong', hash)).toBe(false);
  });
});
```

### 2. Integration Tests
```typescript
describe('Auth API', () => {
  it('should register new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'SecurePassword123!'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.message).toContain('verification');
  });
});
```

### 3. Security Tests
- **Penetration testing**: Test for SQL injection, XSS, CSRF
- **Rate limiting**: Verify lockout after failed attempts
- **Token expiration**: Ensure expired tokens are rejected
- **Session hijacking**: Test session fixation prevention
- **Password policies**: Verify weak passwords are rejected

## Monitoring and Alerts

### Key Metrics
1. **Failed login attempts**: Track by IP and email
2. **Token refresh rate**: Monitor for anomalies
3. **Session duration**: Average and outliers
4. **Password reset requests**: Detect abuse
5. **2FA adoption rate**: Track security posture

### Alert Conditions
- Multiple failed logins from same IP
- Successful login from new location
- Concurrent sessions exceeding limit
- Unusual token refresh patterns
- Password reset token abuse

## Conclusion

Implementing secure authentication requires careful attention to:
- Cryptographic best practices
- Session management
- Security headers and middleware
- Rate limiting and abuse prevention
- Comprehensive testing
- Monitoring and alerting

This guide provides a foundation for building a production-ready authentication system that balances security with user experience.