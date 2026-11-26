# One image (ADR-0009): the server serves the built web client.

FROM node:22-bookworm-slim AS client
WORKDIR /src/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:22-bookworm-slim AS server
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /src/server
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server/ ./
RUN npx prisma generate && npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl tzdata && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production TZ=Europe/Kyiv PORT=3101 CLIENT_DIST=/app/client
WORKDIR /app/server
COPY --from=server --chown=node:node /src/server/package.json ./
COPY --from=server --chown=node:node /src/server/node_modules ./node_modules
COPY --from=server --chown=node:node /src/server/dist ./dist
COPY --from=server --chown=node:node /src/server/prisma ./prisma
COPY --from=server --chown=node:node /src/server/scripts ./scripts
COPY --from=client --chown=node:node /src/client/dist /app/client
USER node
EXPOSE 3101
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://localhost:3101/api/auth/me').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
