# CertPrep — production image for Local mode (SQLite).
# Build context is the repository root:
#   docker build -f docker/Dockerfile .
# or, preferably, via docker/docker-compose.yml (context: ..).

FROM node:24-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /app

FROM base AS deps
# Toolchain for native modules (better-sqlite3 compiles via node-gyp when no
# prebuilt binary matches the Node version). Only this stage needs it.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV SQLITE_PATH=/app/data/certprep.db

# Standalone server + traced node_modules.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

# Assets read from process.cwd() at runtime: the question bank, and the SQLite
# migrations that src/instrumentation.ts applies automatically at startup.
COPY --from=builder --chown=node:node /app/content ./content
COPY --from=builder --chown=node:node /app/src/db/migrations/sqlite ./src/db/migrations/sqlite

# The SQLite database lives here; docker-compose mounts a named volume on it.
RUN mkdir -p /app/data && chown node:node /app/data

USER node
EXPOSE 3000
CMD ["node", "server.js"]
