# Multi-stage build for CRDT Todo Application

# Stage 1: Build the client
FROM node:22-alpine AS client-builder

WORKDIR /app/client

# Copy client package files
COPY client/package*.json ./

# Install client dependencies
RUN npm install

# Copy client source
COPY client/ ./

# Build the client
RUN npm run build

# Stage 2: Build the server
FROM node:22-alpine AS server-builder

WORKDIR /app/server

# Copy server package files
COPY server/package*.json ./

# Install server dependencies
RUN npm install

# Copy server source
COPY server/ ./

# Build the server
RUN npm run build

# Stage 3: Production image
FROM node:22-alpine AS production

WORKDIR /app

# Copy server build and dependencies
COPY --from=server-builder /app/server/dist ./dist
COPY --from=server-builder /app/server/node_modules ./node_modules
COPY --from=server-builder /app/server/package.json ./

# Copy client build to public directory
COPY --from=client-builder /app/client/dist ./public

# Create data directory for persistence
RUN mkdir -p /app/data

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data
ENV PUBLIC_DIR=/app/public

# Expose the port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Run the server
CMD ["node", "dist/index.js"]
