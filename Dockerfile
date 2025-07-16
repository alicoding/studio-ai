# Multi-stage build for Studio AI
# Stage 1: Build frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY postcss.config.ts ./
COPY components.json ./

# Install dependencies
RUN npm ci --only=production

# Copy frontend source
COPY src/ ./src/
COPY index.html ./
COPY public/ ./public/

# Build frontend
RUN npm run build

# Stage 2: Build backend
FROM node:18-alpine AS backend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy backend source
COPY web/ ./web/

# Build backend TypeScript
RUN npx tsc --project web/server/tsconfig.json

# Stage 3: Production runtime
FROM node:18-alpine AS production

# Install production dependencies and curl for health checks
RUN apk add --no-cache curl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built frontend from frontend-builder stage
COPY --from=frontend-builder /app/dist ./public

# Copy backend source and built files
COPY --from=backend-builder /app/web ./web

# Copy other necessary files
COPY docs/ ./docs/
COPY examples/ ./examples/
COPY scripts/ ./scripts/

# Create data directory for persistent storage
RUN mkdir -p /app/data /app/logs && \
    chown -R node:node /app

# Switch to non-root user
USER node

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Start the application
CMD ["npm", "run", "server"]