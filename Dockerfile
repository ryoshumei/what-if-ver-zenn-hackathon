# Comments: Multi-stage Dockerfile for Cloud Run deployment of Next.js app

FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* .
RUN npm ci --no-audit --no-fund

FROM node:20-slim AS builder
WORKDIR /app
ENV NODE_ENV=production
# Inject environment at build time for Next static analysis
COPY .env.production .env.production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
COPY --from=builder /app .
EXPOSE 3000
CMD ["npm","run","start","--","-p","${PORT}"]

