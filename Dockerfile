# Multi-stage Dockerfile for YouTube Transcript Fetcher

# 1. Base stage: Install dependencies
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install

# 2. Builder stage: Build both apps
FROM base AS builder
COPY . .
RUN npx nx build server
RUN npx nx build client

# 3. Server stage: Run Next.js API
FROM node:20-alpine AS server
WORKDIR /app
ENV NODE_ENV=production

# Copy standalone build and assets
COPY --from=builder /app/apps/server/.next/standalone ./
COPY --from=builder /app/apps/server/.next/static ./apps/server/.next/static
COPY --from=builder /app/apps/server/public ./apps/server/public

# Create transcripts directory
RUN mkdir -p /app/apps/server/transcripts

EXPOSE 3000
CMD ["node", "apps/server/server.js"]

# 4. Client stage: Run Angular App via Nginx
FROM nginx:alpine AS client
COPY --from=builder /app/dist/apps/client/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
