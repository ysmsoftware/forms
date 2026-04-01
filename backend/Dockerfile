# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci

# Copy prisma schema first and generate client BEFORE tsc
# (tsc needs @prisma/client types to exist)
COPY prisma ./prisma
RUN npx prisma generate

# Copy the rest of source and compile TypeScript
COPY . .
RUN npm run build

# ─── Stage 2: Production image ────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Only install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled output + prisma schema + generated client from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Persistent storage for local file uploads
VOLUME ["/app/storage"]

EXPOSE 3005

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
