# Production Dockerfile for Team bonding Liderzy Jutra
FROM node:20-slim

WORKDIR /app

# Install openssl and curl for Debian
RUN apt-get update -y && apt-get install -y openssl curl ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies in Linux environment
RUN npm install

# Copy application source
COPY . .

# Generate Prisma Client and build Next.js
RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

EXPOSE 3000

# Start server
CMD ["npm", "run", "start"]
