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
# Build the server (NestJS)
RUN npx nx build nest-api
# Build the client (Angular)
RUN npx nx build client

# --- Stage 3: Server Runtime (NestJS API) ---
FROM node:20-alpine AS server
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Copy package.json and package-lock.json from the 'base' stage
COPY --from=base /app/package*.json ./

# Install production dependencies FIRST
RUN npm install --omit=dev

# Copy built NestJS application
COPY --from=builder /app/dist/apps/nest-api ./

# Ensure the transcripts directory exists for persistence
RUN mkdir -p /app/transcripts

EXPOSE 3000
CMD ["node", "main.js"]

# --- Stage 4: Client Runtime (Nginx) ---
FROM nginx:alpine AS client

# Render provides the PORT env var automatically, but we set a default for safety
ENV PORT=80
ENV BACKEND_URL=https://youtube-transcript-server.onrender.com

# Copy built Angular files
COPY --from=builder /app/dist/apps/client/browser /usr/share/nginx/html

# IMPORTANT: Remove default Nginx configs so they don't conflict
RUN rm /etc/nginx/conf.d/default.conf

# Copy your config to the 'templates' folder
# The official Nginx image runs envsubst on everything in this folder 
# and outputs to /etc/nginx/conf.d/ before starting Nginx.
COPY nginx.conf /etc/nginx/templates/default.conf.template

# No need to change CMD; the official image entrypoint handles the substitution.
EXPOSE 80