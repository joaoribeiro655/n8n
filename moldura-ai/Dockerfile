# ---- Build stage ----
FROM node:22-alpine AS builder
WORKDIR /app

# Prisma needs openssl
RUN apk add --no-cache openssl

COPY package.json package-lock.json* ./
RUN npm ci || npm install

COPY . .
RUN npx prisma generate
RUN npm run build

# ---- Runtime stage ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl

# Next.js standalone output (server + minimal node_modules)
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Prisma engine + schema + CLI deps for migrations at startup
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/prisma ./prisma

# Persisted data lives here (SQLite db + uploads). Mount a volume on /app/data
# and /app/public/uploads in production so they survive restarts/deploys.
RUN mkdir -p /app/data /app/public/uploads

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Apply schema to the DB, then start the server.
CMD ["sh", "-c", "npx prisma db push --skip-generate --accept-data-loss && node server.js"]
