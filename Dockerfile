# Use Node.js LTS Slim (Debian)
FROM node:20-slim

# Install system dependencies for native modules
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Set working directory to app root (contains client/ and server/ if context is root)
WORKDIR /app

# Copy all source code
COPY . .

# --- BUILD CLIENT ---
WORKDIR /app/client
RUN npm install
RUN npm run build

# --- SETUP SERVER ---
WORKDIR /app/server
RUN npm install --production

# Move client build artifacts to server public directory
# Ensure public directory exists and empty it
RUN mkdir -p public && rm -rf public/*
# Copy from client/dist to server/public
RUN cp -r ../client/dist/* public/

# Environment Defaults
ENV PORT=8080
ENV NODE_ENV=production
# DB_HOST should be set via Cloud Run env vars or docker-compose
# For Cloud SQL: /cloudsql/PROJECT:REGION:INSTANCE
# For local: localhost or docker host IP
ENV DB_HOST=localhost
ENV DB_PASSWORD=password 

EXPOSE 8080

# Start command
CMD ["node", "server.js"]
