# Production Dockerfile for YouTube Transcript Fetcher
# This Dockerfile uses multi-stage builds to optimize image size.

# --- Stage 1: Base & Dependencies ---
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install

# --- Stage 2: Builder ---
FROM base AS builder
COPY . .
# Build the server (Next.js)
RUN npx nx build server
# Build the client (Angular)
RUN npx nx build client

# --- Stage 3: Server Runtime (Next.js API) ---
FROM node:20-alpine AS server
WORKDIR /app
ENV NODE_ENV=production

# Copy standalone build assets
COPY --from=builder /app/apps/server/.next/standalone ./
COPY --from=builder /app/apps/server/.next/static ./apps/server/.next/static
COPY --from=builder /app/apps/server/public ./apps/server/public

# Ensure the transcripts directory exists for persistence
RUN mkdir -p /app/apps/server/transcripts

EXPOSE 3000
# The standalone build outputs server.js in the app root (relative to standalone folder)
CMD ["node", "apps/server/server.js"]

# --- Stage 4: Client Runtime (Nginx) ---
FROM nginx:alpine AS client
# Copy built Angular files to Nginx html directory
COPY --from=builder /app/dist/apps/client/browser /usr/share/nginx/html
# Copy custom Nginx configuration for SPA routing and proxying
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
