# Gathered Platform: production image for Coolify (Spec 12.3).
#
# Multi-stage so the runtime image carries no build toolchain. Debian slim
# (glibc) rather than Alpine, because sharp and @node-rs/argon2 ship prebuilt
# glibc binaries. Musl would force a slow source build.

# ---------------------------------------------------------------------------
# Dependencies
# ---------------------------------------------------------------------------
FROM node:24-slim AS deps
WORKDIR /app

COPY package.json package-lock.json ./
# npm 11 blocks install scripts unless allow-listed; package.json carries the
# allowlist esbuild needs.
RUN npm ci

# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------
FROM node:24-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Placeholder values: next build must not require production secrets. The env
# module skips its production-only checks during the build phase and reads the
# real values at runtime (see src/lib/env.ts).
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------------------------------------------------------------------------
# Runtime
# ---------------------------------------------------------------------------
FROM node:24-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs nextjs

# `output: "standalone"` emits a minimal server plus only the node_modules it
# actually needs. It does not trace `public/`, so that has to be copied
# separately or static assets like the landing page hero image 404 at runtime.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Migrations and the tooling to apply them, so `npm run db:migrate` works in
# the deployed container.
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs /app/src/db ./src/db
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/tsx ./node_modules/tsx
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/esbuild ./node_modules/esbuild
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/get-tsconfig ./node_modules/get-tsconfig
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/resolve-pkg-maps ./node_modules/resolve-pkg-maps
# drizzle-orm is bundled into the Next.js server build (it's not in
# serverExternalPackages), so `.next/standalone` never lands it in
# node_modules as a real package. migrate.ts runs outside that bundle via
# tsx, so it needs the actual package on disk.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
# db:migrate invokes node_modules/.bin/tsx directly. That's a symlink npm
# creates on install; `COPY --from` dereferences it into a standalone copy of
# cli.mjs, which then can't find the sibling chunk files it loads relative to
# its own path. Recreate the symlink in place instead.
RUN mkdir -p ./node_modules/.bin \
 && ln -s ../tsx/dist/cli.mjs ./node_modules/.bin/tsx \
 && chown -h nextjs:nodejs ./node_modules/.bin/tsx

# Default local-storage mount point. In production this path must be backed by
# a persistent volume, or uploads are lost on redeploy (Spec 12.5, 19).
RUN mkdir -p /app/storage/uploads && chown -R nextjs:nodejs /app/storage
VOLUME ["/app/storage"]

USER nextjs
EXPOSE 3000

# Coolify health checks hit this; it needs no database, so the container is
# reported healthy even while Postgres is still starting.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
