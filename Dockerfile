# ==============================================================================
# Multi-Stage Production Dockerfile for Team bonding Liderzy Jutra
# Next.js 15 App Router + Socket.io Unified Single-Port Server (server.ts)
# Compatible with Railway, Render, Fly.io, AWS ECS, GCP Cloud Run, VPS
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Base image with system dependencies for Node.js and Prisma on Alpine
# ------------------------------------------------------------------------------
FROM node:20-alpine AS base

# Install libc6-compat and openssl for Prisma engines on Alpine Linux
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# ------------------------------------------------------------------------------
# Stage 2: Install dependencies
# ------------------------------------------------------------------------------
FROM base AS deps

# Copy dependency specifications and Prisma schema for client generation
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Install exact dependencies
RUN npm ci

# Generate Prisma Client for Alpine Linux
RUN npx prisma generate

# ------------------------------------------------------------------------------
# Stage 3: Build application
# ------------------------------------------------------------------------------
FROM base AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set build-time environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Run Next.js production build
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 4: Production Runner
# ------------------------------------------------------------------------------
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root system group and user for security hardening
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy runtime files with appropriate permissions
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/messages ./messages
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/src ./src
COPY --from=builder --chown=nextjs:nodejs /app/server.ts ./server.ts
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json
COPY --from=builder --chown=nextjs:nodejs /app/next.config.ts ./next.config.ts

# Expose single unified port for both Next.js web application and Socket.io WebSockets
EXPOSE 3000

# Health check verifies the HTTP server responds within reasonable bounds
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT:-3000}/ || exit 1

# Run as non-root user
USER nextjs

# Start unified HTTP + Socket.io process
CMD ["npm", "run", "server"]
